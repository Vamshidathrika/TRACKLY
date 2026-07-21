# Trackly — Phase 3: Board + Backlog — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Phase 3 implements the interactive **Kanban Board** and **Scrum Backlog** views in Trackly. Users can manage sprint lifecycles (create sprint, plan backlog, start sprint, complete sprint), drag and drop issues between board columns (To Do, In Progress, In Review, Done) with status updates, filter issues dynamically (Only my issues, Quick search), and rank backlog items.

---

## Technical & Domain Scope

### 1. Prisma Data Model Extensions
- **Sprint**:
  - `id`: CUID
  - `projectId`: Foreign key to `Project`
  - `name`: string (e.g., "Sprint 1", "Sprint 2")
  - `goal`: Text?
  - `startDate`: DateTime?
  - `endDate`: DateTime?
  - `status`: Enum `SprintStatus` (`FUTURE` | `ACTIVE` | `CLOSED`)
  - `createdAt`, `updatedAt`
- **Issue Model Updates**:
  - `sprintId`: Foreign key to `Sprint`? (optional, `null` = in backlog)
  - `rank`: Float (@default(0)) for drag-and-drop rank ordering

---

### 2. Interactive Interfaces & Components

#### **A. Interactive Kanban & Sprint Board** (`/projects/[key]/board`)
- **Columns**: `TO_DO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`.
- **Drag & Drop Cards**: Render issue card with TypeIcon, Key, Summary, PriorityIcon, Story Points badge, and Assignee Avatar.
- **Status Change**: Dragging card to another column updates the issue status in DB with automated `IssueHistory` log.
- **Quick Filters**:
  - "Only my issues" toggle
  - Text filter / search input
  - Clear filters button

#### **B. Scrum Backlog & Sprint Management** (`/projects/[key]/backlog`)
- **Active / Future Sprint Sections**: List issues grouped by Sprint. Displays sprint name, issue count, total story points, and "Start sprint" / "Complete sprint" action buttons.
- **Backlog Section**: Unassigned issue list. Allows moving issues into Sprints or creating new sprints.
- **Create Sprint Action**: Modal/form to create future sprint for the project.

---

## Verification Plan

1. **Database**: Migration for `Sprint` model and `sprintId`/`rank` issue fields.
2. **Unit Tests**:
   - Sprint lifecycle state machine tests (`FUTURE` -> `ACTIVE` -> `CLOSED`).
   - Drag-rank ordering logic.
3. **Playwright E2E Tests**:
   - Create Sprint -> Move Issue to Sprint -> Start Sprint -> Drag card on Kanban board to "DONE" -> Complete Sprint.
