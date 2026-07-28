# Trackly → Jira parity: audit findings and remediation design

**Date:** 2026-07-27
**Status:** Draft for approval
**Scope:** Whole-codebase review (285 TS/TSX files, ~36.7k lines) + remediation plan

---

## 1. How this audit was run

Five independent reviewers covered auth/tenancy, server actions and API routes, the lib data
layer, React components and user flows, and build/config/tests. Roughly 100 findings came back,
with heavy cross-confirmation: the two most severe defects were each found independently by
three reviewers. Every finding cited below was re-verified by reading the file directly — the
reviewer's claim alone was not treated as sufficient.

Baseline at audit time: `npx tsc --noEmit` clean; `npx vitest run` **flaky** (two runs of an
unchanged tree produced two disjoint failure sets); `npm run lint` 0 errors / 331 warnings;
`npm audit` 12 high-severity advisories.

---

## 2. Three root causes, not a hundred bugs

The findings collapse into three systemic causes. Fixing the causes retires most of the list.

### Cause A — `getAuthUser()` is used as an authorization check

It proves only that a session exists. Roughly 25 mutating server actions call it (or nothing at
all) and then pass a client-supplied `issueId` / `projectId` / `sprintId` / `membershipId` /
`repositoryId` straight into a Prisma `where` clause.

This is structural: `lib/issues.ts`, `lib/sprints.ts`, `lib/automation.ts` and `lib/admin.ts`
are guard-free *by design* — they are meant to be called behind a guard. `lib/tenant.ts` has the
correct primitives (`requireMembership`, `requireAdmin`, `checkProjectAccess`,
`requireProjectAccess`). The action layer is where the check must happen, and mostly it doesn't.

Compounding it: Next.js resolves server actions by global action id, not by route. The
`middleware.ts` matcher omits `/`, `/login`, `/signup` and `/invite/*`, and `lib/auth.ts`
returns `true` for `pathname === "/"`. An unguarded action is therefore reachable by POSTing a
`Next-Action` header to an unmatched route — for several actions, with no session at all.

### Cause B — there is no project access-level model

Ten consecutive commits oscillate between "shared board invisible to member" and "unshared board
leaking". They alternate because the data model cannot express the intent. Visibility is inferred
from `ProjectMember` rows plus a workspace-ADMIN bypass scattered across call sites, and
`getProjectsForUser(_siteId, userId)` ignores its `siteId` parameter entirely — returning projects
from every workspace the user administers, despite commit `50f766c` claiming the opposite.

Jira's team-managed model, by contrast, puts an explicit access level on the project and *derives*
roles from it:

| Access level | Everyone on the site gets | Named members get |
|---|---|---|
| Open | Member role | explicit override |
| Limited | Viewer role | explicit override |
| Private | nothing | the only source of access |

Jira evaluates in a fixed order: product access → global permissions → project permission
(Browse Projects) → issue-level security. Trackly has no equivalent ordering, so each bug fix
re-litigates the whole question at one more call site.

### Cause C — the UI is a demo shell wired to a real backend in places

Many features render convincingly and persist nothing. This is not cosmetic: it is silent data
loss, and it is what an evaluator would hit first.

Confirmed by direct read:

- `components/board/IssueDetailDrawer.tsx:637` — attachments are `URL.createObjectURL` blobs.
  The UI reports "Uploaded 1 attachment(s)" and offers a working Download link. Nothing is sent
  to the server; `uploadAttachmentAction` exists and is never imported here.
- `IssueDetailDrawer.tsx:550` — subtasks are written to `localStorage`. Invisible to teammates,
  gone on another device, while `createSubtaskAction` / `toggleSubtaskAction` sit unused.
- `IssueDetailDrawer.tsx:247-292` — when the server returns nothing, the drawer *invents* data:
  two subtasks, PR #42 MERGED, commit `8f3a12b`, a linked blocker `TRACK-04`. The fake blocker
  drives the real blocker banner and **blocks the Mark Complete transition** on a dependency that
  does not exist.
- `components/settings/PermissionMatrixView.tsx:21,50` — the entire workspace permission matrix
  is `localStorage["trackly_permission_matrix"]`. It enforces nothing. This is the page an
  evaluator would use to satisfy themselves that the product has RBAC.
- `components/settings/SecurityAuditLogsView.tsx:19` — five hardcoded audit records naming a real
  user, a real email and IP `192.168.1.45`, with a working CSV export.
- `components/board/SpaceViews.tsx:219` — the calendar hardcodes "July 2026", always renders 31
  cells, and places issues by array index (`idx % 31`), ignoring `dueDate` entirely.
- Four dashboard gadgets (`AIRiskDetectorGadget`, `SprintHealthGadget`, `PieChartGadget`,
  `CreatedVsResolvedGadget`) are constant literals rendered beside genuinely data-driven widgets.

---

## 3. Already fixed in this pass

All verified individually; `tsc --noEmit` exit 0 and 154/154 tests green afterwards.

| Severity | Location | Defect | Fix |
|---|---|---|---|
| Critical | `lib/auth.config.ts:6` | Hardcoded `AUTH_SECRET` fallback sat under a comment saying it must never exist; `lib/auth.ts:8` claimed it threw. Anyone with repo access forges an ADMIN session if the env var is unset. | Throws at startup |
| Critical | `app/(app)/settings/members/page.tsx:11` | `include: { user: true }` shipped `User.passwordHash` into the RSC payload of a client component, on a page gated by `requireMembership()`. Every member could read every colleague's bcrypt hash from page source. | Explicit field select |
| Critical | `app/(app)/settings/members/actions.ts:40` | `updateMemberRoleAction` had no guard at all — pass your own membership id with `"ADMIN"` and self-promote. | `requireAdmin()` + site scope + last-admin protection |
| Critical | `app/(app)/filters/actions.ts:18` | `where: { project: { siteId }, ...whereClause }` — a JQL `project = ACME` clause emitted a top-level `project` key that overwrote the tenant scope. Full cross-tenant issue dump via the search box. | Parser emits `projectKey`; caller composes |
| Critical | `app/(app)/projects/[key]/join/route.ts` | Project looked up by key alone, then a `Membership` upsert into whatever site owned it. `GET /projects/ENG/join` enrolled any user into a stranger's workspace; keys are 2-3 chars. Also made member removal reversible by the removed user. | Resolves access instead of granting it |
| Critical | `lib/integrations/actions.ts` | `"use server"` file imported by a client component, exporting `decryptToken` (a decryption oracle), `encryptToken`, `getIntegrationConnections(siteId)` returning `webhookSecret` for a caller-supplied site, and `saveOAuthIntegration(siteId, …)`. | Split into `crypto.ts` + `store.ts`; actions now derive their own siteId |
| Critical | `components/board/ShareBoardModal.tsx:47` | "Invite Teammate by Email" set a success string and called nothing. `ShareBoardModal.test.tsx:26` asserted that fake string as if it were behaviour. | Real `shareBoardByEmailAction` (board-admin gated, tokenised, expiring); tests rewritten |
| High | `lib/jql.ts:55` | `key = DEMO-1` normalised to `DEMO_1`, matching nothing — the most obvious query a user types silently returned zero rows. | Normalise enum fields only |
| High | `components/board/BoardColumn.tsx:24` | `isAdmin = true` default and `KanbanBoard` never passed it, so `canEditStatus` was always true. Every card draggable and every status select enabled for every viewer, including VIEWERs. | `isAdmin={isOwnerOrAdmin}` at all 8 call sites |
| High | `.tmp/playwright-data/*/server.env` | `JWT_SECRET`, `STORAGE_ENCRYPTION_KEY`, `API_KEY_SECRET` tracked in git since `36b4abb`. `.gitignore` lists `.tmp/`, but gitignore never untracks. | `git rm --cached` — **values still in history, must be rotated** |
| Medium | `vitest.config.ts` | 5000ms default timeout against 5-12s component tests; two runs of an unchanged tree gave disjoint failure sets. A coin-flip suite is the same as no suite, and AGENTS.md makes it a commit precondition. | `testTimeout` / `hookTimeout` 20000 |

---

## 4. Remaining work, phased

### P0 — remaining security (no schema change)

1. **Rotate the four leaked secrets.** They are in git history; untracking does not remove them.
2. **`npm audit fix`** — 12 high advisories, all non-breaking. Includes Next.js
   `GHSA-955p-x3mx-jcvp` (unauthenticated disclosure of internal Server Function endpoints),
   which directly compounds Cause A.
3. **Guard the remaining unguarded actions.** At minimum: all five sprint actions
   (`backlog/actions.ts:10,33,52,63,74` — no auth call whatsoever), both automation actions
   (`settings/automation/actions.ts:10,27` — same), `bulkUpdateIssuesAction` /
   `bulkDeleteIssuesAction` (unscoped `updateMany` / `deleteMany` over client-supplied id arrays),
   `deleteIssueAction`, `updateIssueFieldAction`, `fetchLiveBoardIssuesAction`, the five
   project-settings actions that call `requireMembership()` and discard the result, and the four
   dev/GitHub actions.
4. **Webhooks.** `app/api/webhooks/[provider]/route.ts` verifies no signature for any provider;
   `app/api/webhooks/github/route.ts:18` skips verification when the secret is unset and falls back
   to `prisma.site.findFirst()` — an arbitrary tenant — when nothing resolves. Fail closed on both.
5. **`scripts/clean-demo-data.ts:9`** deletes every Site whose name *contains* "demo" and every
   User whose name or email contains "demo", with no `NODE_ENV` guard. A customer named "Demo
   Corp" or a user named "Demond" is destroyed. Restrict to exact seeded ids and refuse in prod.

### P1 — one guard, enforced structurally

Build `resolveProjectAccess(userId, projectId) → { canView, canEdit, canAdmin }` and route every
read and write through it. Delete the duplicated weaker copies — attachment delete, bulk update
and custom fields each exist twice with different rules, and in every pair the UI reaches the
weaker one.

Add a test that fails when a `"use server"` export touches Prisma without importing a guard.
Without this, Cause A regresses; it already has once.

### P2 — access levels (schema migration)

`Project.accessLevel: OPEN | LIMITED | PRIVATE`, `ProjectMember` demoted to an override table,
workspace-ADMIN bypass removed from call sites and centralised in the resolver. Backfill existing
projects as PRIVATE.

Also in P2, because they need the same migration: an explicit active-workspace concept.
`requireMembership()` currently returns the *oldest* membership unconditionally and nothing
anywhere selects an active workspace — no switcher, no cookie, no route segment. A user in two
workspaces can open the second workspace's board but **cannot open any issue in it**, creates
projects into the wrong workspace, and has GitHub OAuth tokens stored against the wrong site.

### P3 — make the UI honest

Wire or remove every Cause-C surface. Each item is independently shippable. Highest user-visible
value: attachments, subtasks, and the drawer's fabricated fallbacks (which actively block a real
workflow via the phantom blocker).

Also: optimistic writes across `KanbanBoard` and `BacklogView` discard the action result, so a
rejected write is masked for ~5 seconds and then silently reverted by the poller with no message —
the user assumes a rendering glitch and retries.

### P4 — competitive surface

Only after P0-P3. Market read: Jira wins on configurability and agile depth; Linear wins on speed
and opinionated flow. A new entrant beats Jira on time-to-first-board and keyboard-first
interaction, not by matching Jira's admin surface. Target that.

---

## 5. Decisions needed

1. **Sequencing** — P0 alone, or P0+P1 as one branch? P1 touches ~25 files and will conflict with
   anything else in flight.
2. **Backfill default for P2** — PRIVATE (safe; members lose boards until re-shared) or OPEN
   (preserves today's behaviour, keeps the leak)? Recommendation: PRIVATE, with a one-time admin
   migration screen.
3. **Auto-accept invites** — `lib/auth.ts:114` silently accepts any pending invite matching the
   user's email on their next page load, with no consent step. Since anyone who signs up is ADMIN
   of their own workspace, anyone can invite anyone. Keep as a UX convenience, or require explicit
   acceptance at `/invite/[token]`? Recommendation: require explicit acceptance.
