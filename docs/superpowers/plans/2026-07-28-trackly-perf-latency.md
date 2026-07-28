# Trackly Performance (Jira/Linear-grade Latency) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 6–7 sequential database round-trips that run on every navigation, so Trackly feels instant in dev and prod regardless of data size.

**Architecture:** Four independent phases. Phase 1 cuts raw per-query latency (local CockroachDB for dev, region/pooling correctness for prod). Phase 2 caches and parallelizes the tenant-guard waterfall through one invalidation choke point. Phase 3 moves identity into the session JWT so the common path makes zero database calls. Phase 4 makes the client render optimistically instead of waiting for the server.

**Tech Stack:** Next.js 15 (App Router, server components), Prisma 6 + CockroachDB, NextAuth v5 (JWT strategy), Upstash Redis with in-memory fallback, React 19, Vitest, Playwright.

## Global Constraints

- Prisma stays on 6.x. Never upgrade to 7.
- `prisma/schema.prisma` datasource provider stays `cockroachdb`. Do not switch to `postgresql`.
- Use `npx prisma db push`, never `prisma migrate dev` — the migrations folder has drifted from the live schema and `migrate dev` demands a reset that would drop data.
- Every task ends with `npx tsc --noEmit` clean and `npm test` green before commit.
- Access-control behaviour must not regress. A user whose role is revoked must be denied on their next request — caching may not extend a revoked permission.
- Cache reads must never throw into a page render. Follow the existing pattern in `lib/redis.ts`: catch, log, fall back.
- No changes to visual design or the design-token system. This plan is latency only.

## Measured baseline (verify before changing anything)

Per project-page navigation, these run **sequentially**, each a separate round-trip to CockroachDB Cloud in ap-south-1:

| Call | Site | DB queries | Cached across requests? |
|---|---|---|---|
| `getAuthUser()` | `lib/auth.ts:91` | 1 | Yes — Redis, 600s |
| `getChromeData()` | `lib/stars.ts` | 4 | Yes — Redis, 300s |
| `requireMembership()` | `lib/tenant.ts:37` | 1 | **No** |
| `resolveProjectByKey()` | `lib/projects.ts:333` | 2 | **No** |
| `checkProjectAccess()` | `lib/tenant.ts:93` | 2–3 | **No** |
| `getCachedStar()` | `app/(app)/projects/[key]/layout.tsx:9` | 1 | **No** |

`cache()` from React dedupes only *within a single request's render*. Six to seven uncached round-trips therefore run on every navigation. Data volume is tiny, so this is pure fixed overhead, which is why it feels slow at every scale.

## File Structure

**Phase 1 — infra**
- Modify: `docker-compose.yml` — add local single-node CockroachDB service
- Modify: `.env.example` — dev `DATABASE_URL` points at local Cockroach
- Modify: `DEVELOPING.md` — local DB startup instructions
- Create: `vercel.json` — pin function region to `bom1`

**Phase 2 — cache + parallelize**
- Create: `lib/access-cache.ts` — the single cache/invalidation choke point for tenant guards
- Create: `lib/access-cache.test.ts`
- Modify: `lib/tenant.ts` — `requireMembership` and `checkProjectAccess` read through the cache
- Modify: `lib/tenant.test.ts` — cover cached and uncached paths
- Modify: `lib/admin.ts`, `lib/invites.ts`, `lib/projects.ts` — call the invalidation helper on mutation
- Modify: `app/(app)/projects/[key]/layout.tsx` — parallelize independent awaits

**Phase 3 — JWT identity**
- Modify: `lib/auth.config.ts`, `lib/auth.ts` — carry `siteId`, `role`, `membershipVersion` in the token
- Modify: `lib/access-cache.ts` — add version get/bump
- Modify: `lib/tenant.ts` — `requireMembership` trusts the token when versions match
- Modify: `lib/tenant.test.ts` — version-match and version-mismatch paths
- Create: `e2e/permissions.spec.ts` — revoked role denied immediately

**Phase 4 — client responsiveness**
- Modify: `components/board/IssueDetailDrawer.tsx` — `useOptimistic` for field edits and comments
- Modify: `components/board/IssueCard.tsx` — prefetch on hover
- Create: `components/ui/VirtualList.tsx` + test — virtualized list primitive
- Modify: `components/board/BoardColumn.tsx` — use `VirtualList`

---

### Task 1: Local CockroachDB for dev + prod region pin

Dev currently queries the ap-south-1 cloud cluster on every request. `docker-compose.yml` provisions Postgres 16 that nothing uses, and the schema provider is `cockroachdb`, so Postgres could not serve it anyway. Replace it with a local single-node CockroachDB — same provider, no schema change.

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `DEVELOPING.md`
- Create: `vercel.json`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a local `DATABASE_URL` of the form `postgresql://root@localhost:26257/trackly?sslmode=disable` used by all later tasks' local test runs

- [ ] **Step 1: Replace the unused Postgres service with local CockroachDB**

Replace the entire contents of `docker-compose.yml`:

```yaml
services:
  db:
    image: cockroachdb/cockroach:v23.2.5
    command: start-single-node --insecure --http-addr=0.0.0.0:8080
    ports:
      - "26257:26257"
      - "8080:8080"
    volumes:
      - cockroachdata:/cockroach/cockroach-data
volumes:
  cockroachdata:
```

- [ ] **Step 2: Start it and create the database**

Run:

```bash
docker compose up -d db && sleep 10 && docker compose exec db ./cockroach sql --insecure --execute="CREATE DATABASE IF NOT EXISTS trackly;"
```

Expected: `CREATE DATABASE` printed, no error.

- [ ] **Step 3: Point local dev at it**

In `.env.example`, replace the `DATABASE_URL` block with:

```
# Local development: single-node CockroachDB from docker-compose.yml.
# Start it with `docker compose up -d db` before `npm run dev`.
# Pointing local dev at the cloud cluster adds a cross-region round-trip to
# every query — the app will feel slow even with no data in it.
DATABASE_URL="postgresql://root@localhost:26257/trackly?sslmode=disable"

# Production (Vercel): CockroachDB Cloud. Use the POOLED connection string,
# port 26257, sslmode=verify-full. Serverless functions open a connection per
# invocation and will exhaust a direct (unpooled) connection limit.
```

Then update your own `.env` to use the local URL, and push the schema:

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Seed the local database**

Run:

```bash
npm run db:seed
```

Expected: completes without error. If the seed script fails because it expects existing data, that is acceptable — note it and continue; the local DB is still usable.

- [ ] **Step 5: Pin the Vercel region next to the cloud database**

Create `vercel.json`:

```json
{
  "regions": ["bom1"]
}
```

`bom1` is Mumbai, matching the `aws-ap-south-1` CockroachDB cluster. Without this, Vercel defaults to `iad1` (Washington DC) and every production query crosses continents.

- [ ] **Step 6: Document it**

In `DEVELOPING.md`, add this section immediately after the existing setup/prerequisites section:

```markdown
## Database

Local development runs a single-node CockroachDB in Docker — the same engine as
production, so no schema differences.

```bash
docker compose up -d db
npx prisma db push
npm run db:seed
```

Do not point `DATABASE_URL` at the CockroachDB Cloud cluster for local
development. Every query then pays a cross-region round-trip, and the app feels
slow no matter how little data it holds.
```

- [ ] **Step 7: Verify the app runs against local DB**

Run:

```bash
npm run dev
```

Open http://localhost:3000, log in, navigate to a project board. Expected: pages load, no database connection errors in the terminal. Navigation should already feel noticeably quicker than against the cloud cluster.

- [ ] **Step 8: Typecheck and test**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; test suite green.

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yml .env.example DEVELOPING.md vercel.json
git commit -m "perf(infra): run local CockroachDB for dev, pin prod region to bom1

Dev pointed DATABASE_URL at the ap-south-1 cloud cluster, so every query in
local development paid a cross-region round-trip. The compose file provisioned
Postgres 16 that nothing used and that the cockroachdb provider could not serve
anyway. Replaces it with single-node CockroachDB and pins Vercel functions to
bom1 so production sits next to its database."
```

---

### Task 2: Access-cache module

One module owns caching and invalidation for the tenant guards, so there is a single place to reason about staleness. Phase 3 extends this same module rather than adding a parallel mechanism.

**Files:**
- Create: `lib/access-cache.ts`
- Create: `lib/access-cache.test.ts`

**Interfaces:**
- Consumes: `getCache`, `setCache`, `delCache` from `lib/redis.ts`
- Produces:
  - `getCachedMembership(userId: string): Promise<CachedMembership | null>`
  - `setCachedMembership(userId: string, value: CachedMembership): Promise<void>`
  - `getCachedProjectAccess(userId: string, projectId: string): Promise<CachedProjectAccess | null>`
  - `setCachedProjectAccess(userId: string, projectId: string, value: CachedProjectAccess): Promise<void>`
  - `invalidateUserAccess(userId: string): Promise<void>`
  - `type CachedMembership = { siteId: string; role: "ADMIN" | "MEMBER"; siteName: string }`
  - `type CachedProjectAccess = { projectId: string; projectKey: string; projectName: string; siteId: string; projectRole: "ADMIN" | "MEMBER" | "VIEWER" | "WORKSPACE_ADMIN" } | { denied: true }`

- [ ] **Step 1: Write the failing test**

Create `lib/access-cache.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, any>();

vi.mock("./redis", () => ({
  getCache: vi.fn(async (key: string) => store.get(key) ?? null),
  setCache: vi.fn(async (key: string, value: any) => {
    store.set(key, value);
  }),
  delCache: vi.fn(async (...keys: string[]) => {
    for (const k of keys) store.delete(k);
  }),
  delCachePrefix: vi.fn(async (prefix: string) => {
    for (const k of Array.from(store.keys())) {
      if (k.startsWith(prefix)) store.delete(k);
    }
  }),
}));

import {
  getCachedMembership,
  setCachedMembership,
  getCachedProjectAccess,
  setCachedProjectAccess,
  invalidateUserAccess,
} from "./access-cache";

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("access-cache", () => {
  it("returns null for an unseen membership", async () => {
    expect(await getCachedMembership("u1")).toBeNull();
  });

  it("round-trips a membership", async () => {
    await setCachedMembership("u1", { siteId: "s1", role: "ADMIN", siteName: "Acme" });
    expect(await getCachedMembership("u1")).toEqual({
      siteId: "s1",
      role: "ADMIN",
      siteName: "Acme",
    });
  });

  it("round-trips a project access grant", async () => {
    await setCachedProjectAccess("u1", "p1", {
      projectId: "p1",
      projectKey: "TRK",
      projectName: "Trackly",
      siteId: "s1",
      projectRole: "WORKSPACE_ADMIN",
    });
    expect(await getCachedProjectAccess("u1", "p1")).toMatchObject({ projectRole: "WORKSPACE_ADMIN" });
  });

  it("caches a denial so repeated denied loads do not re-query", async () => {
    await setCachedProjectAccess("u1", "p1", { denied: true });
    expect(await getCachedProjectAccess("u1", "p1")).toEqual({ denied: true });
  });

  it("invalidateUserAccess clears membership and every project grant for that user", async () => {
    await setCachedMembership("u1", { siteId: "s1", role: "ADMIN", siteName: "Acme" });
    await setCachedProjectAccess("u1", "p1", { denied: true });
    await setCachedProjectAccess("u1", "p2", { denied: true });
    await setCachedMembership("u2", { siteId: "s1", role: "MEMBER", siteName: "Acme" });

    await invalidateUserAccess("u1");

    expect(await getCachedMembership("u1")).toBeNull();
    expect(await getCachedProjectAccess("u1", "p1")).toBeNull();
    expect(await getCachedProjectAccess("u1", "p2")).toBeNull();
    expect(await getCachedMembership("u2")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run lib/access-cache.test.ts
```

Expected: FAIL — cannot resolve `./access-cache`.

- [ ] **Step 3: Write the implementation**

Create `lib/access-cache.ts`:

```typescript
/**
 * Caching and invalidation for the tenant guards in lib/tenant.ts.
 *
 * These guards run on every navigation. React's cache() dedupes them only
 * within a single request, so without this layer each navigation re-queries
 * membership and project access from the database.
 *
 * Every mutation that can change what a user may see MUST call
 * invalidateUserAccess for the affected user. TTL alone is not sufficient:
 * a revoked role would otherwise keep working until it expired.
 */
import { getCache, setCache, delCache, delCachePrefix } from "./redis";
import type { Role, ProjectRole } from "@prisma/client";

const MEMBERSHIP_TTL_SECONDS = 300;
const PROJECT_ACCESS_TTL_SECONDS = 300;

export type CachedMembership = {
  siteId: string;
  role: Role;
  siteName: string;
};

export type CachedProjectAccess =
  | {
      projectId: string;
      projectKey: string;
      projectName: string;
      siteId: string;
      projectRole: ProjectRole | "WORKSPACE_ADMIN";
    }
  | { denied: true };

const membershipKey = (userId: string) => `access:membership:${userId}`;
const projectAccessKey = (userId: string, projectId: string) =>
  `access:project:${userId}:${projectId}`;
const projectAccessPrefix = (userId: string) => `access:project:${userId}:`;

export async function getCachedMembership(userId: string): Promise<CachedMembership | null> {
  return getCache<CachedMembership>(membershipKey(userId));
}

export async function setCachedMembership(userId: string, value: CachedMembership): Promise<void> {
  await setCache(membershipKey(userId), value, MEMBERSHIP_TTL_SECONDS);
}

export async function getCachedProjectAccess(
  userId: string,
  projectId: string
): Promise<CachedProjectAccess | null> {
  return getCache<CachedProjectAccess>(projectAccessKey(userId, projectId));
}

export async function setCachedProjectAccess(
  userId: string,
  projectId: string,
  value: CachedProjectAccess
): Promise<void> {
  await setCache(projectAccessKey(userId, projectId), value, PROJECT_ACCESS_TTL_SECONDS);
}

/**
 * Drops every cached access decision for a user. Call from any mutation that
 * changes membership, role, project membership, or project visibility.
 */
export async function invalidateUserAccess(userId: string): Promise<void> {
  await delCache(membershipKey(userId)).catch(() => {});
  await delCachePrefix(projectAccessPrefix(userId)).catch(() => {});
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run lib/access-cache.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Typecheck**

Run:

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add lib/access-cache.ts lib/access-cache.test.ts
git commit -m "perf(access): add cache module for tenant guard decisions

Single choke point for caching membership and project-access decisions, with
one invalidateUserAccess helper that mutations call. Denials are cached too,
so a repeatedly-denied load does not re-query on every attempt."
```

---

### Task 3: Read tenant guards through the cache

**Files:**
- Modify: `lib/tenant.ts:37-68` (`requireMembership`), `lib/tenant.ts:93-150` (`checkProjectAccess`)
- Modify: `lib/tenant.test.ts`

**Interfaces:**
- Consumes: `getCachedMembership`, `setCachedMembership`, `getCachedProjectAccess`, `setCachedProjectAccess` from Task 2
- Produces: unchanged public signatures — `requireMembership(): Promise<TenantContext>` and `checkProjectAccess(userId, projectId, _siteId?): Promise<ProjectContext | null>`. Callers need no changes.

- [ ] **Step 1: Write the failing tests**

Append to `lib/tenant.test.ts`. Also add the mock for `./access-cache` at the top of the file, next to the existing `vi.mock("./prisma", ...)` block:

```typescript
vi.mock("./access-cache", () => ({
  getCachedMembership: vi.fn(),
  setCachedMembership: vi.fn(),
  getCachedProjectAccess: vi.fn(),
  setCachedProjectAccess: vi.fn(),
  invalidateUserAccess: vi.fn(),
}));
```

Then append these test blocks at the end of the file:

```typescript
import {
  getCachedMembership,
  setCachedMembership,
  getCachedProjectAccess,
  setCachedProjectAccess,
} from "./access-cache";
import { requireMembership } from "./tenant";

describe("requireMembership caching", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serves from cache without touching the database", async () => {
    (getCachedMembership as any).mockResolvedValue({
      siteId: "s1",
      role: "ADMIN",
      siteName: "Acme",
    });

    const ctx = await requireMembership();

    expect(ctx).toEqual({ userId: "user-1", siteId: "s1", role: "ADMIN", siteName: "Acme" });
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("queries and populates the cache on a miss", async () => {
    (getCachedMembership as any).mockResolvedValue(null);
    (prisma.membership.findFirst as any).mockResolvedValue({
      siteId: "s1",
      role: "MEMBER",
      site: { name: "Acme" },
    });

    const ctx = await requireMembership();

    expect(ctx.siteId).toBe("s1");
    expect(prisma.membership.findFirst).toHaveBeenCalled();
    expect(setCachedMembership).toHaveBeenCalledWith("user-1", {
      siteId: "s1",
      role: "MEMBER",
      siteName: "Acme",
    });
  });
});

describe("checkProjectAccess caching", () => {
  beforeEach(() => vi.clearAllMocks());

  it("serves a cached grant without touching the database", async () => {
    (getCachedProjectAccess as any).mockResolvedValue({
      projectId: "p1",
      projectKey: "TRK",
      projectName: "Trackly",
      siteId: "s1",
      projectRole: "WORKSPACE_ADMIN",
    });

    const access = await checkProjectAccess("user-1", "p1");

    expect(access).toMatchObject({ projectRole: "WORKSPACE_ADMIN" });
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it("serves a cached denial as null without touching the database", async () => {
    (getCachedProjectAccess as any).mockResolvedValue({ denied: true });

    const access = await checkProjectAccess("user-1", "p1");

    expect(access).toBeNull();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it("caches a denial when the project does not exist", async () => {
    (getCachedProjectAccess as any).mockResolvedValue(null);
    (prisma.project.findUnique as any).mockResolvedValue(null);

    const access = await checkProjectAccess("user-1", "p1");

    expect(access).toBeNull();
    expect(setCachedProjectAccess).toHaveBeenCalledWith("user-1", "p1", { denied: true });
  });
});
```

Note: `requireMembership` and `checkProjectAccess` are wrapped in React `cache()`, which memoizes per call arguments within a module instance. If a test sees a stale memoized value, add `vi.resetModules()` in that test's `beforeEach` and re-import the module under test.

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npx vitest run lib/tenant.test.ts
```

Expected: FAIL — the new cases fail because `tenant.ts` does not consult the cache yet (`prisma.membership.findFirst` *is* called, `setCachedMembership` is not).

- [ ] **Step 3: Make `requireMembership` cache-aware**

In `lib/tenant.ts`, add to the imports at the top:

```typescript
import {
  getCachedMembership,
  setCachedMembership,
  getCachedProjectAccess,
  setCachedProjectAccess,
} from "./access-cache";
```

Replace the body of `requireMembership` (currently `lib/tenant.ts:37-68`) with:

```typescript
export const requireMembership = cache(async (): Promise<TenantContext> => {
  const user = await getAuthUser();

  const cached = await getCachedMembership(user.id);
  if (cached) {
    return {
      userId: user.id,
      siteId: cached.siteId,
      role: cached.role,
      siteName: cached.siteName,
    };
  }

  let membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { site: true },
    orderBy: { createdAt: "asc" }, // oldest = primary workspace
  });

  if (!membership) {
    // Auto-provision a dedicated isolated workspace for the user
    const { makeSlug } = await import("./slug");
    const siteName = `${user.name || "Main"}'s Workspace`;
    const newSite = await prisma.site.create({
      data: { name: siteName, slug: makeSlug(siteName) },
    });
    membership = await prisma.membership.create({
      data: { userId: user.id, siteId: newSite.id, role: "ADMIN" },
      include: { site: true },
    });

    const { delCache } = await import("./redis");
    await delCache(`user:chrome:${user.id}`);
  }

  await setCachedMembership(user.id, {
    siteId: membership.siteId,
    role: membership.role,
    siteName: membership.site.name,
  });

  return {
    userId: user.id,
    siteId: membership.siteId,
    role: membership.role,
    siteName: membership.site.name,
  };
});
```

- [ ] **Step 4: Make `checkProjectAccess` cache-aware**

Replace the body of `checkProjectAccess` (currently `lib/tenant.ts:93-150`) with:

```typescript
export const checkProjectAccess = cache(
  async (userId: string, projectId: string, _siteId?: string): Promise<ProjectContext | null> => {
    const cached = await getCachedProjectAccess(userId, projectId);
    if (cached) {
      return "denied" in cached ? null : cached;
    }

    const deny = async (): Promise<null> => {
      await setCachedProjectAccess(userId, projectId, { denied: true });
      return null;
    };

    const grant = async (ctx: ProjectContext): Promise<ProjectContext> => {
      await setCachedProjectAccess(userId, projectId, ctx);
      return ctx;
    };

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true, name: true, siteId: true, leadId: true },
    });

    if (!project) return deny();

    const targetSiteId = project.siteId;

    // Must have active workspace membership
    const membership = await prisma.membership.findUnique({
      where: { userId_siteId: { userId, siteId: targetSiteId } },
    });

    if (!membership) return deny();

    // Workspace ADMINs have full access to all projects in their workspace
    if (membership.role === "ADMIN") {
      return grant({
        projectId: project.id,
        projectKey: project.key,
        projectName: project.name,
        siteId: project.siteId,
        projectRole: "WORKSPACE_ADMIN",
      });
    }

    // Project Lead has ADMIN role on project
    if (project.leadId === userId) {
      return grant({
        projectId: project.id,
        projectKey: project.key,
        projectName: project.name,
        siteId: project.siteId,
        projectRole: "ADMIN",
      });
    }

    // Check for explicit ProjectMember membership
    const projectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!projectMember) return deny();

    return grant({
      projectId: project.id,
      projectKey: project.key,
      projectName: project.name,
      siteId: project.siteId,
      projectRole: projectMember.role,
    });
  }
);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
npx vitest run lib/tenant.test.ts
```

Expected: PASS, including all pre-existing `checkProjectAccess` cases. Those older tests do not mock `getCachedProjectAccess` to return a value, so it resolves `undefined` from the auto-mock and falls through to the database path unchanged.

- [ ] **Step 6: Run the whole suite and typecheck**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 7: Commit**

```bash
git add lib/tenant.ts lib/tenant.test.ts
git commit -m "perf(tenant): read membership and project access through cache

requireMembership and checkProjectAccess ran 3-4 uncached database queries on
every navigation — React cache() dedupes only within one request. Both now read
through the access cache, including caching denials so a denied board does not
re-query on each load."
```

---

### Task 4: Invalidate on every mutation that changes access

Caching a permission is only safe if every mutation that changes it clears the cache. This task wires `invalidateUserAccess` into all such call sites.

**Files:**
- Modify: `lib/admin.ts` — `updateMemberRole`, `removeWorkspaceMember`
- Modify: `lib/tenant.ts` — `grantProjectAccess`, `revokeProjectAccess`, `grantAllProjectAccess`
- Modify: `lib/projects.ts:282`, `lib/projects.ts:311` — project member add/remove
- Modify: `lib/invites.ts:75` — membership upsert on invite acceptance
- Modify: `lib/admin.test.ts`

**Interfaces:**
- Consumes: `invalidateUserAccess(userId: string): Promise<void>` from Task 2
- Produces: no new exports; existing function signatures unchanged

- [ ] **Step 1: Write the failing test**

Append to `lib/admin.test.ts`. Add this mock alongside the file's existing `vi.mock` calls:

```typescript
vi.mock("./access-cache", () => ({
  invalidateUserAccess: vi.fn(),
}));
```

Then append:

```typescript
import { invalidateUserAccess } from "./access-cache";
import { updateMemberRole } from "./admin";

describe("access invalidation on role change", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears cached access when a member's role changes", async () => {
    (prisma.membership.update as any).mockResolvedValue({
      id: "m1",
      userId: "u1",
      siteId: "s1",
      role: "MEMBER",
    });

    await updateMemberRole("m1", "MEMBER");

    expect(invalidateUserAccess).toHaveBeenCalledWith("u1");
  });
});
```

If `lib/admin.test.ts` does not already mock `prisma.membership.update`, add `update: vi.fn()` to the `membership` object inside its existing `vi.mock("./prisma", ...)` block.

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run lib/admin.test.ts
```

Expected: FAIL — `invalidateUserAccess` was not called.

- [ ] **Step 3: Invalidate in `lib/admin.ts`**

Add to the imports in `lib/admin.ts`:

```typescript
import { invalidateUserAccess } from "./access-cache";
```

In `updateMemberRole`, immediately after the two existing `delCache` calls and before `return updated;`:

```typescript
  await invalidateUserAccess(updated.userId).catch(() => {});
```

In `removeWorkspaceMember`, in the step 5 cache-invalidation block alongside the existing `delCache` call:

```typescript
  await invalidateUserAccess(userId).catch(() => {});
```

- [ ] **Step 4: Invalidate in `lib/tenant.ts` helpers**

Add to the imports in `lib/tenant.ts` (extend the `./access-cache` import added in Task 3):

```typescript
import { invalidateUserAccess } from "./access-cache";
```

Rewrite the three helpers at the bottom of `lib/tenant.ts`:

```typescript
export async function grantProjectAccess(
  projectId: string,
  userId: string,
  role: ProjectRole = "MEMBER"
) {
  const result = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: { role },
  });
  await invalidateUserAccess(userId).catch(() => {});
  return result;
}

export async function revokeProjectAccess(projectId: string, userId: string) {
  const result = await prisma.projectMember.deleteMany({
    where: { projectId, userId },
  });
  await invalidateUserAccess(userId).catch(() => {});
  return result;
}

export async function grantAllProjectAccess(
  siteId: string,
  userId: string,
  role: ProjectRole = "MEMBER"
) {
  const projects = await prisma.project.findMany({
    where: { siteId },
    select: { id: true },
  });

  if (projects.length === 0) return;

  await prisma.projectMember.createMany({
    data: projects.map((p) => ({ projectId: p.id, userId, role })),
    skipDuplicates: true,
  });
  await invalidateUserAccess(userId).catch(() => {});
}
```

- [ ] **Step 5: Invalidate in `lib/projects.ts` and `lib/invites.ts`**

In `lib/projects.ts`, add to the imports:

```typescript
import { invalidateUserAccess } from "./access-cache";
```

At `lib/projects.ts:282` the function creates a `projectMember`. Capture its result and invalidate before returning — change `return prisma.projectMember.create({...})` to:

```typescript
  const created = await prisma.projectMember.create({
    // ...leave the existing argument object exactly as it is...
  });
  await invalidateUserAccess(userId).catch(() => {});
  return created;
```

At `lib/projects.ts:311` the function deletes a `projectMember` into `const res`. Add immediately after that statement:

```typescript
  await invalidateUserAccess(userId).catch(() => {});
```

In `lib/invites.ts`, add the same import, and after the transaction containing the `membership.upsert` at line 75 completes, invalidate the accepting user:

```typescript
  await invalidateUserAccess(userId).catch(() => {});
```

Use whatever local variable in that function holds the accepting user's id — if it is not named `userId`, use the correct name rather than introducing a new one.

- [ ] **Step 6: Run the tests to verify they pass**

Run:

```bash
npx vitest run lib/admin.test.ts lib/tenant.test.ts lib/projects.test.ts lib/invites.test.ts
```

Expected: PASS.

- [ ] **Step 7: Verify no mutation site was missed**

Run:

```bash
grep -rn "membership.update\|membership.create\|membership.upsert\|membership.deleteMany\|projectMember.create\|projectMember.upsert\|projectMember.delete" --include="*.ts" lib app | grep -v ".test.ts"
```

Expected: every hit is either (a) followed by an `invalidateUserAccess` call, or (b) inside `lib/signup.ts` / `lib/auth.ts`, which create brand-new users who cannot have a stale cache entry. Confirm each line falls into one of those two cases before continuing.

- [ ] **Step 8: Typecheck and full suite**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 9: Commit**

```bash
git add lib/admin.ts lib/tenant.ts lib/projects.ts lib/invites.ts lib/admin.test.ts
git commit -m "fix(access): invalidate cached access on every membership mutation

Caching an access decision is only safe if the mutations that change it clear
it. Role change, workspace removal, project member add/remove, and invite
acceptance now all call invalidateUserAccess for the affected user, so a
revoked permission stops working on the next request rather than at TTL."
```

---

### Task 5: Parallelize the project layout waterfall

`ProjectLayout` awaits four calls in sequence. `checkProjectAccess` and `getCachedStar` both depend only on `project`, not on each other, so they can run concurrently.

**Files:**
- Modify: `app/(app)/projects/[key]/layout.tsx:22-35`

**Interfaces:**
- Consumes: `requireMembership()`, `resolveProjectByKey(userId, siteId, key)`, `checkProjectAccess(userId, projectId, siteId)` — all unchanged from Task 3
- Produces: no new exports

- [ ] **Step 1: Parallelize the two independent awaits**

In `app/(app)/projects/[key]/layout.tsx`, replace the body from `const access = await checkProjectAccess(...)` through `const star = await getCachedStar(...)` with:

```typescript
  const [access, star] = await Promise.all([
    checkProjectAccess(userId, project.id, project.siteId),
    getCachedStar(userId, project.id),
  ]);

  if (!access) {
    return <BoardNotFound projectKey={key.toUpperCase()} isAdmin={role === "ADMIN"} />;
  }
```

The access check still gates rendering; it just no longer blocks the star lookup from starting. Fetching the star for a board the user cannot see is harmless — the result is discarded and it reveals nothing.

- [ ] **Step 2: Verify in the browser**

Run:

```bash
npm run dev
```

Navigate to a project board, then to a second project board. Expected: both render correctly, project nav shows the right name, star state is correct, no console or terminal errors.

- [ ] **Step 3: Verify the denial path still works**

While logged in as a non-admin user without access, navigate to `/projects/SOMEKEY` for a project that user cannot see. Expected: the `BoardNotFound` component renders. Access is not granted.

- [ ] **Step 4: Typecheck and full suite**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/projects/[key]/layout.tsx"
git commit -m "perf(layout): run project access and star lookup concurrently

Both depend only on the resolved project, not on each other, so serializing
them added a round-trip to every project navigation for no reason."
```

---

### Task 6: Carry identity in the session token

With Phases 1–2 done, the common path is Redis-bound rather than database-bound. This task removes even the Redis round-trip for the membership read by putting `siteId` and `role` in the JWT, guarded by a version counter so a revoked role cannot survive in a stale token.

**Files:**
- Modify: `lib/access-cache.ts` — add version get/bump
- Modify: `lib/access-cache.test.ts`
- Modify: `lib/auth.config.ts` — type and pass through the new token fields
- Modify: `lib/auth.ts` — populate them at sign-in

**Interfaces:**
- Consumes: `getCache`, `setCache` from `lib/redis.ts`; `invalidateUserAccess` from Task 2
- Produces:
  - `getAccessVersion(userId: string): Promise<number>`
  - `bumpAccessVersion(userId: string): Promise<number>`
  - JWT token fields: `token.siteId?: string`, `token.role?: Role`, `token.membershipVersion?: number`

- [ ] **Step 1: Write the failing test**

Append to `lib/access-cache.test.ts`:

```typescript
import { getAccessVersion, bumpAccessVersion } from "./access-cache";

describe("access version counter", () => {
  it("starts at 0 for an unseen user", async () => {
    expect(await getAccessVersion("u1")).toBe(0);
  });

  it("increments on bump", async () => {
    expect(await bumpAccessVersion("u1")).toBe(1);
    expect(await bumpAccessVersion("u1")).toBe(2);
    expect(await getAccessVersion("u1")).toBe(2);
  });

  it("invalidateUserAccess bumps the version so stale tokens are rejected", async () => {
    await invalidateUserAccess("u1");
    expect(await getAccessVersion("u1")).toBe(1);
  });

  it("tracks versions independently per user", async () => {
    await bumpAccessVersion("u1");
    expect(await getAccessVersion("u2")).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run lib/access-cache.test.ts
```

Expected: FAIL — `getAccessVersion` is not exported.

- [ ] **Step 3: Add the version counter**

In `lib/access-cache.ts`, add:

```typescript
const ACCESS_VERSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

const versionKey = (userId: string) => `access:version:${userId}`;

/**
 * Monotonic counter of "how many times this user's access changed".
 * A session token carrying a matching version may be trusted without a
 * database read. Any mismatch forces a fresh lookup.
 */
export async function getAccessVersion(userId: string): Promise<number> {
  const raw = await getCache<number>(versionKey(userId));
  return typeof raw === "number" ? raw : 0;
}

export async function bumpAccessVersion(userId: string): Promise<number> {
  const next = (await getAccessVersion(userId)) + 1;
  await setCache(versionKey(userId), next, ACCESS_VERSION_TTL_SECONDS);
  return next;
}
```

Then extend `invalidateUserAccess` so a single call handles both mechanisms — every mutation site from Task 4 gets version bumping for free:

```typescript
export async function invalidateUserAccess(userId: string): Promise<void> {
  await delCache(membershipKey(userId)).catch(() => {});
  await delCachePrefix(projectAccessPrefix(userId)).catch(() => {});
  await bumpAccessVersion(userId).catch(() => {});
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx vitest run lib/access-cache.test.ts
```

Expected: PASS. If the "starts at 0" case now fails because a prior test in the same file bumped `u1`, confirm `store.clear()` runs in `beforeEach` — it does — and that these new tests are in their own `describe` block.

- [ ] **Step 5: Declare the token fields**

In `lib/auth.config.ts`, add above `export const authConfig`:

```typescript
import type { Role } from "@prisma/client";

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    siteId?: string;
    role?: Role;
    membershipVersion?: number;
  }
}
```

- [ ] **Step 6: Populate the token at sign-in**

In `lib/auth.ts`, replace the `jwt` callback with:

```typescript
    async jwt({ token, user, trigger }) {
      if (user) {
        token.userId = user.id;
        if (user.email) {
          try {
            const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
            if (dbUser) {
              token.userId = dbUser.id;
            }
          } catch (e) {
            console.error("[JWT Callback dbUser Error]:", e);
          }
        }
      }

      // Load workspace identity into the token at sign-in and whenever a
      // session update is explicitly triggered. requireMembership reads these
      // fields instead of querying, guarded by membershipVersion.
      if ((user || trigger === "update") && token.userId) {
        try {
          const { getAccessVersion } = await import("./access-cache");
          const membership = await prisma.membership.findFirst({
            where: { userId: token.userId as string },
            include: { site: true },
            orderBy: { createdAt: "asc" },
          });
          if (membership) {
            token.siteId = membership.siteId;
            token.role = membership.role;
            token.membershipVersion = await getAccessVersion(token.userId as string);
          }
        } catch (e) {
          console.error("[JWT Callback membership Error]:", e);
        }
      }

      return token;
    },
```

Leaving these fields unset on failure is safe: Task 7's guard treats a missing `siteId` or `membershipVersion` as a miss and falls back to the database path.

- [ ] **Step 7: Typecheck and full suite**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 8: Verify sign-in still works**

Run:

```bash
npm run dev
```

Log out, log back in, navigate to a board. Expected: login succeeds, board renders, no auth errors in the terminal.

- [ ] **Step 9: Commit**

```bash
git add lib/access-cache.ts lib/access-cache.test.ts lib/auth.config.ts lib/auth.ts
git commit -m "feat(auth): carry workspace identity and access version in the JWT

Adds a per-user access version counter bumped by invalidateUserAccess, and
populates siteId, role, and membershipVersion into the session token at
sign-in. Nothing reads these yet — the guard change lands next."
```

---

### Task 7: Trust the token when the version matches

**Files:**
- Modify: `lib/tenant.ts` — `requireMembership`
- Modify: `lib/tenant.test.ts`
- Create: `e2e/permissions.spec.ts`

**Interfaces:**
- Consumes: `getAccessVersion` from Task 6; the `auth()` helper exported from `lib/auth.ts`
- Produces: `requireMembership(): Promise<TenantContext>` — signature unchanged

- [ ] **Step 1: Write the failing tests**

Append to `lib/tenant.test.ts`. First extend the existing `./access-cache` mock to include the version functions:

```typescript
vi.mock("./access-cache", () => ({
  getCachedMembership: vi.fn(),
  setCachedMembership: vi.fn(),
  getCachedProjectAccess: vi.fn(),
  setCachedProjectAccess: vi.fn(),
  invalidateUserAccess: vi.fn(),
  getAccessVersion: vi.fn(),
}));
```

Extend the existing `./auth` mock so it also exports `auth`:

```typescript
vi.mock("./auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User" }),
  auth: vi.fn(),
}));
```

Then append:

```typescript
import { auth } from "./auth";
import { getAccessVersion } from "./access-cache";

describe("requireMembership token fast path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("trusts the token when the version matches and makes no database call", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "user-1" },
      siteId: "s1",
      role: "ADMIN",
      siteName: "Acme",
      membershipVersion: 3,
    });
    (getAccessVersion as any).mockResolvedValue(3);

    const ctx = await requireMembership();

    expect(ctx).toMatchObject({ userId: "user-1", siteId: "s1", role: "ADMIN" });
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to the database when the version is stale", async () => {
    (auth as any).mockResolvedValue({
      user: { id: "user-1" },
      siteId: "s1",
      role: "ADMIN",
      siteName: "Acme",
      membershipVersion: 2,
    });
    (getAccessVersion as any).mockResolvedValue(5);
    (getCachedMembership as any).mockResolvedValue(null);
    (prisma.membership.findFirst as any).mockResolvedValue({
      siteId: "s1",
      role: "MEMBER",
      site: { name: "Acme" },
    });

    const ctx = await requireMembership();

    expect(ctx.role).toBe("MEMBER");
    expect(prisma.membership.findFirst).toHaveBeenCalled();
  });

  it("falls back to the database when the token carries no version", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (getAccessVersion as any).mockResolvedValue(0);
    (getCachedMembership as any).mockResolvedValue(null);
    (prisma.membership.findFirst as any).mockResolvedValue({
      siteId: "s1",
      role: "MEMBER",
      site: { name: "Acme" },
    });

    await requireMembership();

    expect(prisma.membership.findFirst).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```bash
npx vitest run lib/tenant.test.ts
```

Expected: FAIL — the fast-path case still calls `prisma.membership.findFirst`.

- [ ] **Step 3: Expose the token fields on the session**

In `lib/auth.ts`, replace the `session` callback with:

```typescript
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = (token.userId || token.sub) as string;
      }
      (session as any).siteId = token.siteId;
      (session as any).role = token.role;
      (session as any).membershipVersion = token.membershipVersion;
      return session;
    },
```

- [ ] **Step 4: Add the fast path to `requireMembership`**

In `lib/tenant.ts`, extend the `./auth` import to include `auth`, and the `./access-cache` import to include `getAccessVersion`:

```typescript
import { getAuthUser, auth } from "./auth";
import {
  getCachedMembership,
  setCachedMembership,
  getCachedProjectAccess,
  setCachedProjectAccess,
  getAccessVersion,
  invalidateUserAccess,
} from "./access-cache";
```

Insert this block in `requireMembership` immediately after `const user = await getAuthUser();` and before the `getCachedMembership` call:

```typescript
  // Fast path: the session token already carries workspace identity. Trust it
  // only when its version matches the current one — any access mutation bumps
  // the version, so a revoked role fails this check on the very next request
  // and falls through to a fresh lookup below.
  try {
    const session = (await auth()) as
      | { siteId?: string; role?: Role; siteName?: string; membershipVersion?: number }
      | null;
    if (
      session?.siteId &&
      session.role &&
      typeof session.membershipVersion === "number"
    ) {
      const currentVersion = await getAccessVersion(user.id);
      if (session.membershipVersion === currentVersion) {
        return {
          userId: user.id,
          siteId: session.siteId,
          role: session.role,
          siteName: session.siteName ?? "",
        };
      }
    }
  } catch (err) {
    console.error("[requireMembership token fast path]:", err);
    // fall through to the cache/database path
  }
```

`siteName` is not carried in the token because it is display-only and changes independently of access. Callers that need it hit the cache path. If a caller renders an empty workspace name, that is the signal to add `siteName` to the token in a follow-up — do not paper over it here.

- [ ] **Step 5: Run the tests to verify they pass**

Run:

```bash
npx vitest run lib/tenant.test.ts
```

Expected: PASS.

- [ ] **Step 6: Write the end-to-end cross-tenant denial test**

`loginDemo` in `e2e/helpers.ts` signs up a brand-new user who becomes ADMIN of a brand-new workspace, so there is no existing fixture for a second non-admin user in an established workspace. That makes cross-tenant denial the property this layer can assert honestly: caching a token-derived `siteId` must never resolve a board outside the caller's own workspace. The stale-version fallback itself is already covered by the Vitest cases in Step 1, and the revocation path is covered manually in Step 8.

Create `e2e/permissions.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";
import { loginDemo } from "./helpers";

test("a workspace admin cannot resolve a board outside their workspace", async ({ browser }) => {
  // Tenant A: its own fresh workspace with the seeded DEMO board.
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await loginDemo(pageA);
  await pageA.goto("/projects/DEMO");
  await expect(pageA).toHaveURL(/\/projects\/DEMO/);

  // Tenant B: a different workspace in a separate browser context, so no
  // session, cookie, or client cache state is shared with tenant A.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await loginDemo(pageB);

  // Tenant B's own board resolves.
  await pageB.goto("/projects/DEMO");
  await expect(pageB).toHaveURL(/\/projects\/DEMO/);

  // A key that exists in no workspace of tenant B must be refused outright,
  // not resolved through a cached or token-derived siteId.
  await pageB.goto("/projects/ZZZNOPE");
  await expect(pageB.getByText(/not found|no access|doesn't exist/i)).toBeVisible();

  await contextA.close();
  await contextB.close();
});
```

The final assertion targets the `BoardNotFound` component rendered by `app/(app)/projects/[key]/layout.tsx`. Open `components/projects/BoardNotFound.tsx` and match the assertion to its actual copy if the regex above does not match.

- [ ] **Step 7: Run the e2e suite**

Run:

```bash
npm run e2e -- permissions.spec.ts
```

Expected: PASS. If Playwright cannot find a running server, start `npm run dev` in another terminal first, or use the port override documented in `playwright.config.ts`.

- [ ] **Step 8: Manually verify revocation in the browser**

This is the check the e2e fixtures cannot make today, so do it by hand.

With `npm run dev` running: sign up as an admin, invite a second user through `/settings/members`, and accept that invite in a private window. As the member, open a project board and confirm it loads. As the admin, remove that member from the workspace. As the member, navigate back to that board.

Expected: access is denied on the very next navigation — no logout required, no waiting for a TTL to expire. If the board still loads, `invalidateUserAccess` is not reaching that mutation path. Fix the missing call rather than shortening any TTL.

- [ ] **Step 9: Typecheck and full suite**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 10: Commit**

```bash
git add lib/tenant.ts lib/tenant.test.ts lib/auth.ts e2e/permissions.spec.ts
git commit -m "perf(tenant): serve membership from the session token when fresh

requireMembership now reads siteId and role straight off the JWT, verified
against a single access-version lookup, so the common navigation path makes no
membership query at all. Any access mutation bumps the version, so a revoked
role fails the check on the next request and falls back to a fresh lookup."
```

---

### Task 8: Optimistic issue edits

The drawer already wraps mutations in `startTransition`, which keeps the UI responsive but still shows the old value until the server responds. `useOptimistic` shows the new value immediately and rolls back on failure.

**Files:**
- Modify: `components/board/IssueDetailDrawer.tsx`

**Interfaces:**
- Consumes: the existing server actions already called in the drawer (`updateIssueFieldAction` and the comment-creation action)
- Produces: no new exports

- [ ] **Step 1: Read the current mutation call sites**

Run:

```bash
grep -n "startTransition\|useState\|Action(" components/board/IssueDetailDrawer.tsx | head -40
```

Note which local state each `startTransition` block updates, and which server action it calls. Every optimistic wrapper below must pair one state value with one action.

- [ ] **Step 2: Add optimistic state for issue field edits**

In `components/board/IssueDetailDrawer.tsx`, import `useOptimistic` from React alongside the existing hook imports. For the issue object held in local state, add:

```typescript
  const [optimisticIssue, applyOptimisticIssue] = useOptimistic(
    issue,
    (current, patch: Partial<typeof issue>) => ({ ...current, ...patch })
  );
```

Render from `optimisticIssue` instead of `issue` throughout the drawer body.

In each field-edit handler, call `applyOptimisticIssue` with the patch as the first statement inside `startTransition`, before awaiting the server action:

```typescript
    startTransition(async () => {
      applyOptimisticIssue({ status: nextStatus });
      await updateIssueFieldAction(issue.id, "status", nextStatus);
    });
```

React discards the optimistic value automatically when the transition settles, so a failed action reverts to the server's truth with no manual rollback.

- [ ] **Step 3: Add optimistic comments**

For the comments list, add:

```typescript
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (current, pending: (typeof comments)[number]) => [...current, pending]
  );
```

Render `optimisticComments`. In the comment submit handler, inside `startTransition`, append a provisional comment before awaiting:

```typescript
      addOptimisticComment({
        ...existingCommentShape,
        id: `optimistic-${Date.now()}`,
        body: draft,
        createdAt: new Date().toISOString(),
      });
```

Match `existingCommentShape` to the actual comment type already used in the file — read the type before writing this, and construct a value that satisfies it rather than casting.

- [ ] **Step 4: Verify in the browser**

Run:

```bash
npm run dev
```

Open a board, open an issue, change status and priority, and post a comment. Expected: each change appears instantly, with no visible pause between the click and the update. Reload the page and confirm the changes persisted.

- [ ] **Step 5: Verify rollback on failure**

Stop the dev server's database (`docker compose stop db`), then change an issue field in the still-open browser tab. Expected: the value appears immediately, then reverts when the action fails. Restart with `docker compose start db`.

- [ ] **Step 6: Typecheck and full suite**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 7: Commit**

```bash
git add components/board/IssueDetailDrawer.tsx
git commit -m "perf(drawer): render issue edits and comments optimistically

startTransition kept the UI interactive but still showed the previous value
until the server replied, so every edit felt like it lagged. useOptimistic
paints the change immediately and reverts if the action fails."
```

---

### Task 9: Prefetch boards and issues on hover

**Files:**
- Modify: `components/board/IssueCard.tsx`

**Interfaces:**
- Consumes: `useRouter` from `next/navigation`
- Produces: no new exports

- [ ] **Step 1: Confirm prefetch is not disabled anywhere**

Run:

```bash
grep -rn "prefetch={false}\|prefetch={ false }" components app --include="*.tsx"
```

Expected: no results. If any are found, remove the `prefetch={false}` prop — Next.js `<Link>` prefetches by default and disabling it is what makes navigation feel slow.

- [ ] **Step 2: Prefetch the issue route on card hover**

In `components/board/IssueCard.tsx`, add:

```typescript
import { useRouter } from "next/navigation";
```

Inside the component:

```typescript
  const router = useRouter();
```

Add an `onMouseEnter` to the card's root element:

```typescript
      onMouseEnter={() => router.prefetch(`/projects/${projectKey}/issues/${issue.key}`)}
```

Use the props the component already receives for the project key and issue key. If `projectKey` is not currently a prop, thread it down from `BoardColumn` rather than deriving it from the URL inside the card.

- [ ] **Step 3: Verify prefetching happens**

Run `npm run dev`, open a board with DevTools → Network open, and hover over issue cards without clicking. Expected: prefetch requests fire on hover. Then click a card — it should open faster than a card you did not hover.

- [ ] **Step 4: Typecheck and full suite**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 5: Commit**

```bash
git add components/board/IssueCard.tsx
git commit -m "perf(board): prefetch the issue route on card hover

The route is usually already fetched by the time the click lands, so opening an
issue from the board is immediate rather than a fresh round-trip."
```

---

### Task 10: Virtualize long lists

Today's data is tiny, so this changes nothing perceptible now. It is what keeps the board fast once a column holds hundreds of issues, and it is cheap to add while the code is already open.

**Files:**
- Modify: `package.json` — add `@tanstack/react-virtual`
- Create: `components/ui/VirtualList.tsx`
- Create: `components/ui/VirtualList.test.tsx`
- Modify: `components/board/BoardColumn.tsx`

**Interfaces:**
- Consumes: `useVirtualizer` from `@tanstack/react-virtual`
- Produces: `VirtualList<T>({ items, estimateSize, renderItem, className }: VirtualListProps<T>): JSX.Element`

- [ ] **Step 1: Install the virtualizer**

Run:

```bash
npm install @tanstack/react-virtual
```

Expected: installs cleanly, `package.json` gains the dependency.

- [ ] **Step 2: Write the failing test**

Create `components/ui/VirtualList.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VirtualList } from "./VirtualList";

describe("VirtualList", () => {
  it("renders items through the render prop", () => {
    render(
      <VirtualList
        items={[{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }]}
        estimateSize={() => 40}
        renderItem={(item) => <div key={item.id}>{item.label}</div>}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders nothing for an empty list without crashing", () => {
    const { container } = render(
      <VirtualList items={[]} estimateSize={() => 40} renderItem={() => <div />} />
    );
    expect(container).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
npx vitest run components/ui/VirtualList.test.tsx
```

Expected: FAIL — cannot resolve `./VirtualList`.

- [ ] **Step 4: Write the component**

Create `components/ui/VirtualList.tsx`:

```typescript
"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type VirtualListProps<T> = {
  items: T[];
  estimateSize: (index: number) => number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
};

export function VirtualList<T>({
  items,
  estimateSize,
  renderItem,
  className,
}: VirtualListProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 8,
  });

  return (
    <div ref={scrollRef} className={className} style={{ overflowY: "auto" }}>
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
npx vitest run components/ui/VirtualList.test.tsx
```

Expected: PASS. jsdom reports zero element heights, so the virtualizer may render only the first item — the first test asserts only on "Alpha" for that reason. Do not add height mocks to force more.

- [ ] **Step 6: Use it in the board column**

In `components/board/BoardColumn.tsx`, replace the direct `.map()` over issues with `VirtualList`:

```typescript
      <VirtualList
        items={issues}
        estimateSize={() => 96}
        renderItem={(issue) => <IssueCard key={issue.id} issue={issue} {...existingCardProps} />}
      />
```

Pass through exactly the props `IssueCard` already receives at that call site — do not drop drag handlers or the project key added in Task 9.

- [ ] **Step 7: Verify drag-and-drop still works**

Run `npm run dev`, open a board, and drag a card between columns. Expected: drag works exactly as before, the card lands in the target column, and the change persists after reload. Virtualization unmounts off-screen cards, so if dragging breaks, raise `overscan` in `VirtualList.tsx` before considering reverting this task.

- [ ] **Step 8: Typecheck and full suite**

Run:

```bash
npx tsc --noEmit && npm test
```

Expected: no type errors; suite green.

- [ ] **Step 9: Run the e2e board suite**

Run:

```bash
npm run e2e
```

Expected: PASS — in particular the board and drag-drop specs.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json components/ui/VirtualList.tsx components/ui/VirtualList.test.tsx components/board/BoardColumn.tsx
git commit -m "perf(board): virtualize column issue lists

Renders only the visible window plus overscan, so a column holding hundreds of
issues costs the same as one holding ten."
```

---

## Verification after all tasks

- [ ] `npx tsc --noEmit` — clean
- [ ] `npm test` — green
- [ ] `npm run e2e` — green
- [ ] Manual: navigate between three projects in a row. Each transition should feel immediate.
- [ ] Manual: revoke a member's project access as admin; confirm the member is denied on their next navigation, with no logout required.
- [ ] Manual: with `docker compose stop db`, confirm optimistic edits revert rather than sticking.
