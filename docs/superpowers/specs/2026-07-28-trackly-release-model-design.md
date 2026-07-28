# Trackly: real Release / Fix Version model

**Date:** 2026-07-28
**Status:** Approved

## Problem

`ReleaseHub.tsx` (Jira's Releases & Versioning screen) persists to
`localStorage` only. `completedIssues`/`totalIssues` are typed in by hand at
creation time and never update as issues actually move. No `Release` model
exists in the schema.

## Schema

```prisma
enum ReleaseStatus {
  UNRELEASED
  RELEASED
  ARCHIVED
}

model Release {
  id            String        @id @default(cuid())
  projectId     String
  name          String
  description   String?
  status        ReleaseStatus @default(UNRELEASED)
  releaseDate   DateTime?
  notesMarkdown String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  issues        Issue[]

  @@index([projectId])
}
```

`Issue` gains `releaseId String?` + `release Release? @relation(fields: [releaseId], references: [id], onDelete: SetNull)`, indexed as `@@index([projectId, releaseId])`, mirroring the existing `sprintId` relation exactly.

`completedIssues` / `totalIssues` are never stored — always derived from `issues.filter(status)`, same principle already applied to the Sprint Health dashboard gadget.

## Data layer & actions

`lib/releases.ts`:
- `getReleasesByProject(projectId)` — includes `issues: { select: { id, status } }`, sorted by `releaseDate` desc / `createdAt` desc.
- `createRelease`, `updateRelease`, `deleteRelease`, `setReleaseStatus`, `updateReleaseNotes` — plain data functions, no guard (matches `lib/sprints.ts`/`lib/issues.ts` convention: guards live in the action layer).

New file `app/(app)/projects/[key]/releases/actions.ts`, all actions calling `checkProjectAccess(user.id, projectId)` before any write — guarded from creation, not retrofitted.

Issue-to-release assignment does **not** get a new action. `updateIssueFieldAction` in `app/(app)/projects/[key]/issues/actions.ts` gets one more case added to its existing field whitelist: `"releaseId"`, alongside the existing `"sprintId"` case. Same tenant check already runs there.

## UI

`ReleaseHub.tsx`: drop the `localStorage` init/save, take `releases` as a server-fetched prop (new `app/(app)/projects/[key]/releases/page.tsx`), call the new actions, refetch after each mutation — same pattern as the `IssueDetailDrawer` rewiring earlier this session. Remove "✨ AI Generate Notes" (no backend exists; same reasoning as the earlier AI-subtask-decompose removal). "Copy Notes" and manual notes editing stay — real, local-only actions with no false claim.

`IssueDetailDrawer.tsx`: add a "Fix Version" select in the sidebar field group (near Priority/Assignee), calling `updateIssueFieldAction(issue.id, "releaseId", value)`. Options come from `getReleasesByProject` for the issue's project, passed down alongside the existing `availableUsers` prop.

## Out of scope

- No burndown/velocity chart for releases.
- Single release per issue (matches existing single-sprint-per-issue design), not Jira's multi-Fix-Version.
- No release-scoped permissions beyond existing project access.
