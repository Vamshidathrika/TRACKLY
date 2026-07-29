/**
 * Jira user -> Trackly User.
 *
 * Strategy, in order:
 *   1. Match by email against a workspace member.          -> matched-member
 *   2. Match by email against any existing User.           -> matched-user-no-membership
 *   3. Create a stub User with that email.                 -> stubbed
 *   4. No email at all: create a stub on a placeholder
 *      address derived from the Jira account id.           -> stubbed-placeholder-email
 *   5. Nothing identifiable, or stub creation disabled:
 *      attribute to the importing admin (required FKs)
 *      or leave null (optional FKs).                       -> fallback-to-importer / unresolved
 *
 * SECURITY — why stubs get no Membership by default.
 * lib/auth.ts's Google `signIn` callback links a sign-in to an existing User
 * row by email. A stub created from a Jira export therefore becomes claimable
 * by whoever controls that mailbox. That is fine and intended — but only
 * because a stub has NO Membership: `requireMembership` finds none and
 * provisions the claimant a fresh, empty workspace instead of handing them the
 * imported one. Flipping `grantMembershipToStubs` on inverts that, turning any
 * address in the export into un-invited workspace access. It defaults to false
 * and the UI labels it accordingly.
 *
 * Placeholder addresses use `.invalid`, reserved by RFC 2606 and guaranteed
 * never to resolve, so they can never be claimed by anyone.
 */
import { prisma } from "../prisma";
import type { JiraUserRef, ResolvedUserOutcome, ResolvedUserReport } from "./types";

export const PLACEHOLDER_EMAIL_DOMAIN = "imported.invalid";

export type UserResolverOptions = {
  siteId: string;
  /** Fallback owner for required FKs (Issue.reporterId, Comment.authorId, …). */
  importerUserId: string;
  createMissingUsers: boolean;
  grantMembershipToStubs: boolean;
  dryRun: boolean;
};

type Identity = {
  /** Stable dedupe key: the Trackly email we will use, or a synthetic id. */
  id: string;
  email: string | null;
  displayName: string;
  sourceEmail: string | null;
  accountId: string | null;
  userId: string | null;
  outcome: ResolvedUserOutcome;
};

export class UserResolver {
  private readonly identities = new Map<string, Identity>();
  private loaded = false;

  constructor(private readonly options: UserResolverOptions) {}

  /**
   * Resolve every distinct Jira user in one pass. Called once before the write
   * phase so per-issue resolution is synchronous and there is no N+1 lookup.
   */
  async preload(refs: (JiraUserRef | null | undefined)[]): Promise<void> {
    for (const ref of refs) this.register(ref);
    this.loaded = true;

    const emails = [...this.identities.values()]
      .map((i) => i.email)
      .filter((e): e is string => !!e);

    if (emails.length === 0) return;

    const existing = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, memberships: { where: { siteId: this.options.siteId }, select: { id: true } } },
    });

    const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));

    for (const identity of this.identities.values()) {
      if (!identity.email) continue;
      const match = byEmail.get(identity.email);
      if (!match) continue;
      identity.userId = match.id;
      identity.outcome = match.memberships.length > 0 ? "matched-member" : "matched-user-no-membership";
    }

    await this.createStubs();
  }

  /**
   * Trackly user id for a Jira reference, or null when nothing could be
   * resolved. Callers filling a required FK use `resolveRequired`.
   */
  resolve(ref: JiraUserRef | null | undefined): string | null {
    if (!this.loaded) throw new Error("UserResolver.preload() must run before resolve()");
    const id = identityKey(ref);
    if (!id) return null;
    return this.identities.get(id)?.userId ?? null;
  }

  /** Like `resolve`, but never null — falls back to the importing admin. */
  resolveRequired(ref: JiraUserRef | null | undefined): string {
    const resolved = this.resolve(ref);
    if (resolved) return resolved;

    const id = identityKey(ref);
    const identity = id ? this.identities.get(id) : undefined;
    if (identity && identity.outcome !== "matched-member" && identity.outcome !== "matched-user-no-membership") {
      identity.outcome = "fallback-to-importer";
    }
    return this.options.importerUserId;
  }

  report(): ResolvedUserReport[] {
    return [...this.identities.values()]
      .map((i) => ({
        displayName: i.displayName,
        sourceEmail: i.sourceEmail,
        accountId: i.accountId,
        outcome: i.outcome,
        tracklyEmail: i.email,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /** Count of Users this run created (or would create, in a dry run). */
  createdCount(): number {
    return [...this.identities.values()].filter(
      (i) => i.outcome === "stubbed" || i.outcome === "stubbed-placeholder-email"
    ).length;
  }

  matchedCount(): number {
    return [...this.identities.values()].filter(
      (i) => i.outcome === "matched-member" || i.outcome === "matched-user-no-membership"
    ).length;
  }

  unresolvedCount(): number {
    return [...this.identities.values()].filter(
      (i) => i.outcome === "unresolved" || i.outcome === "fallback-to-importer"
    ).length;
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private register(ref: JiraUserRef | null | undefined): void {
    const id = identityKey(ref);
    if (!id || !ref) return;
    if (this.identities.has(id)) return;

    const email = ref.email?.trim().toLowerCase() || null;
    const accountId = ref.accountId?.trim() || null;

    this.identities.set(id, {
      id,
      // With no real email we still need a unique, non-null User.email. The
      // placeholder is derived from the identity key so it is stable across
      // re-runs — that is what keeps a second import from duplicating stubs.
      email: email ?? (accountId || ref.displayName ? `${id}@${PLACEHOLDER_EMAIL_DOMAIN}` : null),
      displayName: ref.displayName?.trim() || email || accountId || "Unknown Jira user",
      sourceEmail: email,
      accountId,
      userId: null,
      outcome: "unresolved",
    });
  }

  private async createStubs(): Promise<void> {
    const pending = [...this.identities.values()].filter((i) => !i.userId && i.email);
    if (pending.length === 0) return;

    if (!this.options.createMissingUsers) {
      for (const identity of pending) identity.outcome = "unresolved";
      return;
    }

    for (const identity of pending) {
      const isPlaceholder = identity.email!.endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
      identity.outcome = isPlaceholder ? "stubbed-placeholder-email" : "stubbed";

      if (this.options.dryRun) {
        // Nothing is written, so nothing can be attributed to a new user;
        // planning-only callers fall back to the importer.
        continue;
      }

      // Upsert, not create: a re-run must reuse the stub it made last time
      // rather than crashing on the unique email.
      const user = await prisma.user.upsert({
        where: { email: identity.email! },
        create: { email: identity.email!, name: identity.displayName, passwordHash: null },
        update: {},
        select: { id: true },
      });
      identity.userId = user.id;

      if (this.options.grantMembershipToStubs) {
        await prisma.membership.upsert({
          where: { userId_siteId: { userId: user.id, siteId: this.options.siteId } },
          create: { userId: user.id, siteId: this.options.siteId, role: "MEMBER" },
          update: {},
        });
      }
    }
  }
}

/**
 * Stable identity for a Jira user reference. Email wins because it is the only
 * thing that survives a Jira-to-Trackly migration; account id is next; a
 * slugified display name is the last resort (and is why two different people
 * called "Alex Smith" with no email would merge — reported, not hidden).
 */
export function identityKey(ref: JiraUserRef | null | undefined): string | null {
  if (!ref) return null;
  const email = ref.email?.trim().toLowerCase();
  if (email) return email;
  const accountId = ref.accountId?.trim();
  if (accountId) return `jira-${slugify(accountId)}`;
  const displayName = ref.displayName?.trim();
  if (displayName) return `jira-${slugify(displayName)}`;
  return null;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "unknown";
}
