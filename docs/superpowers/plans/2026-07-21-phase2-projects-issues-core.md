# Trackly Phase 2: Projects + Issues Core Implementation Plan

Goal: Build full Project CRUD, Issue creation/management, Jira-style Issue Detail view, Comments, and History logging.

## Proposed Tasks

### Task 1: Prisma Schema Extensions (Project, Issue, Comment, IssueHistory)
- Files: `prisma/schema.prisma`
- Add Enums: `ProjectType`, `IssueType`, `IssueStatus`, `IssuePriority`
- Add Models: `Project`, `Issue`, `Comment`, `IssueHistory`
- Run `npx prisma migrate dev --name phase2_projects_issues`

### Task 2: Project Data Layer & Actions
- Files: `lib/projects.ts`, `lib/projects.test.ts`
- Implement `createProject`, `getProjects`, `getProjectByKey`.
- Auto-generate uppercase unique keys (e.g., "TRK").

### Task 3: Projects Page & Create Project Modal
- Files: `components/projects/CreateProjectModal.tsx`, `app/(app)/projects/page.tsx`
- Implement project creation dialog and project list view.

### Task 4: Issue Data Layer & Actions
- Files: `lib/issues.ts`, `lib/issues.test.ts`
- Implement `createIssue` (with auto-incrementing key e.g. `TRK-1`), `updateIssue`, `getIssuesByProject`, `getIssueByKey`, `addComment`.

### Task 5: Global Create Issue Modal
- Files: `components/issues/CreateIssueModal.tsx`, update `components/nav/TopNav.tsx`
- Connect TopNav "Create" button to open Create Issue Modal.

### Task 6: Project Issues Table View
- Files: `app/(app)/projects/[key]/page.tsx`, `components/issues/IssueTable.tsx`, `components/ui/TypeIcon.tsx`, `components/ui/PriorityIcon.tsx`
- Render issue list with status tags, priority icons, type badges, assignees.

### Task 7: Issue Detail Panel & Standalone Page
- Files: `components/issues/IssueDetail.tsx`, `app/(app)/projects/[key]/issues/[issueKey]/page.tsx`
- Build issue detail layout with inline editing, sidebar attributes, and comment feed.

### Task 8: E2E Smoke Tests for Phase 2
- Files: `e2e/projects-issues.spec.ts`
- Playwright test for project creation, issue creation, status change, and commenting.
