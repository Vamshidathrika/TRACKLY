# Trackly Performance — Jira/Linear-grade Speed

## Problem

App feels laggy everywhere — navigation, board, drawer — in both dev and prod, despite tiny data volume (test-scale). A same-day perf commit (`b6b54c7`: memoized cards, parallel project queries, guarded drag-over) did not fix the felt lag. Since data is tiny, this rules out N+1/scale bottlenecks — the cause is fixed per-request overhead, not query complexity.

## Root cause (verified against current code)

1. **Serial DB waterfall on every navigation.** `app/(app)/layout.tsx` awaits `getAuthUser()` then `getChromeData()` sequentially. `app/(app)/projects/[key]/layout.tsx` then awaits `requireMembership()` → `resolveProjectByKey()` → `checkProjectAccess()` → `getCachedStar()`, each blocking the next. That's 4+ sequential round-trips before the page itself runs its own queries.
2. **Every round-trip hits CockroachDB Cloud (ap-south-1)** — in dev *and* prod. `docker-compose.yml` provisions a local Postgres that dev never uses (`.env` points straight at the cloud cluster). CockroachDB's distributed-consensus reads carry more per-query latency than local Postgres even before network distance is counted.
3. **No cross-request caching for the hot path.** `requireMembership`, `resolveProjectByKey`, `checkProjectAccess` use React's `cache()`, which only dedupes within a single request's render tree. Every navigation re-runs all of them from zero.
4. **Redis (Upstash) is underused.** It exists and is wired for chrome/star data but not for the membership/project/access checks that fire on every click — the actual hot path.
5. **Client feels the round-trip directly.** Mutations use `useTransition` (non-blocking) but not `useOptimistic` — UI waits for the full server response before reflecting a change. No prefetch-on-hover, no list virtualization.

## Goals

- Navigation and mutations feel instant (Linear-grade), not just "faster."
- No regression in multi-tenant access control correctness — a revoked role must stop working within a bounded, short window even under caching.
- Fix holds as data grows, not just at today's tiny scale.

## Non-goals

- Full real-time/websocket sync (already tracked separately as v2 Phase V2-5 — not required for single-user perceived speed).
- Any change to the visual/design system (out of scope; this is latency and responsiveness only).

## Architecture — 4 phases, each independently shippable

### Phase 1 — Kill the network tax (infra only)

`prisma/schema.prisma` datasource provider is locked to `cockroachdb`; swapping to plain `postgresql` for local dev would require reverting the provider and isn't schema-portable in practice. Instead:

- Add a **local single-node CockroachDB container** to `docker-compose.yml` (`cockroachdb/cockroach:latest-v23.x`, single-node `start-single-node --insecure`) as the dev target. Same provider as prod, zero schema changes.
- Update `.env.example` / `DEVELOPING.md` to point dev `DATABASE_URL` at the local container by default.
- Verify the prod `DATABASE_URL` uses the CockroachDB Cloud **pooled** connection string (DEPLOY.md flags this as required but current `.env` isn't confirmed to use it).
- Pin the Vercel deployment region to `bom1` (or the region nearest ap-south-1) so prod functions sit next to the CockroachDB cluster instead of Vercel's default region.

No application code changes in this phase — purely environment/config.

### Phase 2 — Collapse the waterfall

- In `AppLayout`: run `getAuthUser()` and any independent lookups concurrently; only serialize what actually depends on the prior result.
- In `ProjectLayout`: `resolveProjectByKey` depends on `requireMembership`'s `siteId`, so those two stay sequential. But `checkProjectAccess` and `getCachedStar` are independent of each other once `project` is resolved — run them via `Promise.all`.
- Add a Redis cache layer (extending `lib/redis.ts`, same pattern as existing chrome-data caching) for:
  - `membership:{userId}` → `{siteId, role}`, short TTL (e.g. 60s)
  - `project-access:{userId}:{projectId}` → boolean + `projectRole`, short TTL
  - `star:{userId}:{projectId}` → boolean, short TTL
- Invalidate explicitly (not just TTL-expire) on the mutations that change these: membership add/remove/role-change, project delete, project-member add/remove, star toggle. Each existing server action for these mutations gets an explicit `delCache(...)` call, same pattern already used in `requireMembership`'s auto-provision path.

### Phase 3 — Skip the DB on the common path

- Extend the NextAuth JWT (`lib/auth.config.ts` / session callback) to carry `{siteId, role, membershipVersion}`.
- Maintain a single Redis key per user, `user:version:{userId}`, incremented on any membership/role mutation.
- `requireMembership` becomes: read `siteId`/`role` from the session token directly (zero I/O); compare token's `membershipVersion` against `user:version:{userId}` (one fast Redis `GET`). Match → done, no DB call at all. Mismatch → fall back to the real Prisma query once, refresh the token via NextAuth's session `update()`.
- This is the change that removes DB calls from the common navigation path entirely, not just caches them.

**Risk:** a revoked role must not keep working past the version-check window. Mitigate with an explicit test: revoke a role, assert the very next request (which triggers the version mismatch) re-checks DB and denies access — no multi-request grace period for *denial*, only for the token's own claim being trusted when versions match.

### Phase 4 — Make the client feel instant

- Add `useOptimistic` to issue field edits, comment creation, and worklog entries in `IssueDetailDrawer.tsx` (board drag-drop already close to this via `startTransition` — bring it fully to `useOptimistic` parity).
- Add hover-prefetch (Next.js `<Link prefetch>` already defaults on; explicitly verify it's not disabled anywhere, add manual `router.prefetch()` on hover for board cards linking to the issue drawer).
- Virtualize board columns and backlog/search result lists (no library currently in `package.json` — add `@tanstack/react-virtual` or equivalent). Lower priority than Phases 1–3 given today's tiny data, but included so speed holds as data grows — no deferred compromise.

## Data flow (Phase 2/3 hot path, after fix)

```
Request → middleware (tenant slug header, no DB)
        → AppLayout: getAuthUser (session, no DB) ‖ getChromeData (Redis)
        → ProjectLayout: requireMembership (JWT + 1 Redis GET, DB only on version mismatch)
                        → resolveProjectByKey (Redis-cached)
                        → [checkProjectAccess ‖ getCachedStar] (Redis-cached, parallel)
        → Page renders
```

## Testing

- Vitest: cache invalidation correctness (mutate → cache cleared → next read reflects change), version-mismatch fallback path, optimistic-update rollback on server error.
- Playwright: role-revocation-denies-immediately e2e case; navigation timing assertion (smoke-level, not a hard perf gate) between project pages.
- `tsc --noEmit` clean after each phase, per project convention.

## Rollout order

Phase 1 → Phase 2 → Phase 3 → Phase 4, each its own commit/PR, tests green before advancing. Phase 3 ships last of the backend work since it carries the only real correctness risk (stale permissions) — by then the cache-invalidation patterns from Phase 2 are already proven.
