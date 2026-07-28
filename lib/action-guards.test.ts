import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

/**
 * Guardrail against the defect class this codebase kept regressing on.
 *
 * Next.js resolves a server action by a global action id, not by the route it
 * happens to live under, so every export of a `"use server"` file is a public
 * endpoint that any authenticated user can POST to with arbitrary arguments.
 * `getAuthUser()` only proves a session exists — it is authentication, not
 * authorization. The tenant guards in lib/tenant.ts are what actually scope a
 * request to a workspace or board.
 *
 * So: a server action that touches Prisma must reference at least one real
 * guard. This is deliberately a coarse, static check — it cannot prove a guard
 * is applied to the right entity, only that the author reached for one at all.
 * That is enough to catch a whole unguarded file being added, which is how
 * every instance of this bug actually arrived.
 */

const GUARDS = [
  "requireMembership",
  "requireAdmin",
  "checkProjectAccess",
  "checkProjectAdmin",
  "requireProjectAccess",
  // File-local helpers that wrap the above.
  "resolveAccessibleIssue",
  "assertIssueAccess",
  "requireRepoAdmin",
];

/**
 * Files exempt from the rule, each with a reason. Adding to this list should be
 * a deliberate, reviewed decision — not a way to silence the test.
 */
const EXEMPT: Record<string, string> = {
  // Pre-auth: creates the account and session that the guards later read.
  "app/(auth)/actions.ts": "signup/login run before any session exists",
  // Provisions the caller's FIRST workspace, so there is no membership to check
  // yet. It operates only on the authenticated user's own site and never
  // accepts a siteId/projectId from the client.
  "app/onboarding/actions.ts": "runs before the user has a membership",
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

describe("server action authorization", () => {
  const root = path.resolve(__dirname, "..");

  const actionFiles = [...walk(path.join(root, "app")), ...walk(path.join(root, "lib"))].filter(
    (f) => {
      const src = readFileSync(f, "utf8");
      return /^["']use server["']/m.test(src) && /\bprisma\./.test(src);
    }
  );

  it("finds the server action files to check", () => {
    // If this drops to zero the detection above silently stopped working and
    // every assertion below would vacuously pass.
    expect(actionFiles.length).toBeGreaterThan(5);
  });

  it.each(actionFiles.map((f) => [path.relative(root, f), f]))(
    "%s calls a tenant guard",
    (rel, full) => {
      if (EXEMPT[rel as string]) return;
      const src = readFileSync(full as string, "utf8");
      const used = GUARDS.filter((g) => src.includes(g));
      expect(
        used.length,
        `${rel} is a "use server" file that touches Prisma but references no tenant guard ` +
          `(one of: ${GUARDS.join(", ")}). getAuthUser() alone is authentication, not ` +
          `authorization — server actions are reachable by action id regardless of route.`
      ).toBeGreaterThan(0);
    }
  );

  it("keeps token crypto out of the server-action surface", () => {
    // Exporting these from a "use server" file turns them into an
    // unauthenticated decryption oracle for any stored ciphertext.
    const src = readFileSync(path.join(root, "lib/integrations/actions.ts"), "utf8");
    expect(src).not.toMatch(/export\s+(async\s+)?function\s+(encryptToken|decryptToken)/);
    expect(src).not.toMatch(/export\s+(async\s+)?function\s+getDecryptedToken/);
  });

  it("keeps a hardcoded AUTH_SECRET fallback out of the auth config", () => {
    const src = readFileSync(path.join(root, "lib/auth.config.ts"), "utf8");
    // A literal fallback lets anyone who can read the source forge a session.
    expect(src).not.toMatch(/AUTH_SECRET\s*\?\?[\s\S]{0,80}["'][A-Za-z0-9+/=]{20,}["']/);
  });
});
