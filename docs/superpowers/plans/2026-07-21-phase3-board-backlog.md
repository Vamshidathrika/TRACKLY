# Trackly Phase 3: Board + Backlog Implementation Plan

Goal: Build interactive Kanban Board (drag-and-drop status changes, quick filters), Scrum Backlog, and Sprint lifecycle management.

## Proposed Tasks

### Task 1: Prisma Schema Extensions (Sprint model & Issue relations)
- Files: `prisma/schema.prisma`
- Add Enum: `SprintStatus` (`FUTURE`, `ACTIVE`, `CLOSED`)
- Add Model: `Sprint`
- Add fields to `Issue`: `sprintId`, `rank`
- Run migration `phase3_sprint_board`

### Task 2: Sprint & Board Data Layer & Unit Tests
- Files: `lib/sprints.ts`, `lib/sprints.test.ts`
- Implement `createSprint`, `startSprint`, `completeSprint`, `moveIssueToSprint`, `updateIssueStatusAndRank`.

### Task 3: Interactive Kanban Board Component & Page
- Files: `components/board/KanbanBoard.tsx`, `components/board/BoardColumn.tsx`, `components/board/IssueCard.tsx`, `app/(app)/projects/[key]/board/page.tsx`
- Implement drag & drop or one-click status transitions across columns with quick filters (Only my issues, search).

### Task 4: Scrum Backlog & Sprint Lifecycle Page
- Files: `components/backlog/BacklogView.tsx`, `components/backlog/SprintHeader.tsx`, `app/(app)/projects/[key]/backlog/page.tsx`
- Implement Sprint planning view with Start/Complete sprint actions and backlog issue list.

### Task 5: Sidebar Navigation Integration
- Files: Enable "Board" (`/projects/[key]/board`) and "Backlog" (`/projects/[key]/backlog`) links in `components/nav/Sidebar.tsx`.

### Task 6: Playwright E2E Tests for Phase 3
- Files: `e2e/board-backlog.spec.ts`
- Test full flow: Create Sprint -> Assign Issue to Sprint -> Start Sprint -> Move card on Board -> Complete Sprint.
