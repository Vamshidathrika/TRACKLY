import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    user: { findMany: vi.fn(), upsert: vi.fn() },
    membership: { upsert: vi.fn() },
  },
}));

import { prisma } from "../prisma";
import { UserResolver, identityKey, PLACEHOLDER_EMAIL_DOMAIN, type UserResolverOptions } from "./users";

const IMPORTER_ID = "importer-1";
const SITE_ID = "site-1";

function makeResolver(overrides: Partial<UserResolverOptions> = {}) {
  return new UserResolver({
    siteId: SITE_ID,
    importerUserId: IMPORTER_ID,
    createMissingUsers: true,
    grantMembershipToStubs: false,
    dryRun: false,
    ...overrides,
  });
}

describe("identityKey", () => {
  it("prefers email, then accountId, then display name", () => {
    expect(identityKey({ email: "a@example.com", accountId: "acc1", displayName: "A" })).toBe("a@example.com");
    expect(identityKey({ accountId: "acc1", displayName: "A" })).toBe("jira-acc1");
    expect(identityKey({ displayName: "Alex Smith" })).toBe("jira-alex-smith");
  });

  it("returns null for an empty or null reference", () => {
    expect(identityKey(null)).toBeNull();
    expect(identityKey({})).toBeNull();
  });
});

describe("UserResolver", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches an existing workspace member by email", async () => {
    (prisma.user.findMany as any).mockResolvedValue([
      { id: "u1", email: "alice@example.com", memberships: [{ id: "m1" }] },
    ]);

    const resolver = makeResolver();
    await resolver.preload([{ email: "alice@example.com", displayName: "Alice" }]);

    expect(resolver.resolve({ email: "alice@example.com" })).toBe("u1");
    expect(resolver.report()[0].outcome).toBe("matched-member");
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it("matches an existing User with no workspace membership", async () => {
    (prisma.user.findMany as any).mockResolvedValue([{ id: "u2", email: "bob@example.com", memberships: [] }]);

    const resolver = makeResolver();
    await resolver.preload([{ email: "bob@example.com" }]);

    expect(resolver.report()[0].outcome).toBe("matched-user-no-membership");
  });

  it("creates a stub user for an unmatched email and does not grant membership by default", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.user.upsert as any).mockResolvedValue({ id: "new-1" });

    const resolver = makeResolver();
    await resolver.preload([{ email: "new@example.com", displayName: "New Person" }]);

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "new@example.com" } })
    );
    expect(prisma.membership.upsert).not.toHaveBeenCalled();
    expect(resolver.resolve({ email: "new@example.com" })).toBe("new-1");
    expect(resolver.createdCount()).toBe(1);
  });

  it("grants membership to a stub only when grantMembershipToStubs is true", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.user.upsert as any).mockResolvedValue({ id: "new-2" });

    const resolver = makeResolver({ grantMembershipToStubs: true });
    await resolver.preload([{ email: "new2@example.com" }]);

    expect(prisma.membership.upsert).toHaveBeenCalledTimes(1);
  });

  it("uses a stable, non-resolvable placeholder email when there is no real email", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.user.upsert as any).mockResolvedValue({ id: "new-3" });

    const resolver = makeResolver();
    await resolver.preload([{ accountId: "acct-123", displayName: "No Email Person" }]);

    const report = resolver.report();
    expect(report[0].tracklyEmail).toBe(`jira-acct-123@${PLACEHOLDER_EMAIL_DOMAIN}`);
    expect(report[0].outcome).toBe("stubbed-placeholder-email");
  });

  it("leaves identities unresolved when createMissingUsers is false", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);

    const resolver = makeResolver({ createMissingUsers: false });
    await resolver.preload([{ email: "nope@example.com" }]);

    expect(prisma.user.upsert).not.toHaveBeenCalled();
    expect(resolver.resolve({ email: "nope@example.com" })).toBeNull();
    expect(resolver.report()[0].outcome).toBe("unresolved");
  });

  it("does not write anything during a dry run, but still classifies the outcome", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);

    const resolver = makeResolver({ dryRun: true });
    await resolver.preload([{ email: "dryrun@example.com" }]);

    expect(prisma.user.upsert).not.toHaveBeenCalled();
    expect(resolver.resolve({ email: "dryrun@example.com" })).toBeNull();
    expect(resolver.createdCount()).toBe(1); // still counted for the report
  });

  it("resolveRequired falls back to the importer and records fallback-to-importer", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);

    const resolver = makeResolver({ createMissingUsers: false });
    await resolver.preload([{ email: "ghost@example.com" }]);

    expect(resolver.resolveRequired({ email: "ghost@example.com" })).toBe(IMPORTER_ID);
    expect(resolver.report()[0].outcome).toBe("fallback-to-importer");
  });

  it("resolveRequired falls back to the importer for a completely empty reference", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    const resolver = makeResolver();
    await resolver.preload([]);
    expect(resolver.resolveRequired(null)).toBe(IMPORTER_ID);
    expect(resolver.resolveRequired(undefined)).toBe(IMPORTER_ID);
  });

  it("throws if resolve is called before preload", () => {
    const resolver = makeResolver();
    expect(() => resolver.resolve({ email: "x@example.com" })).toThrow(/preload/);
  });

  it("deduplicates identical identities across many references", async () => {
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.user.upsert as any).mockResolvedValue({ id: "dup-1" });

    const resolver = makeResolver();
    await resolver.preload([
      { email: "dup@example.com", displayName: "Dup" },
      { email: "DUP@example.com", displayName: "Dup" },
    ]);

    expect(resolver.report()).toHaveLength(1);
    expect(prisma.user.upsert).toHaveBeenCalledTimes(1);
  });
});
