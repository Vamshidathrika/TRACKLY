# Trackly — Phase 2: Projects + Issues Core — Design Spec

Date: 2026-07-21  
Status: Draft / Planning  
Author: Antigravity Superpowers  

## Product Goal

Phase 2 builds the core domain model and user interfaces for **Projects** and **Issues** in Trackly. Users can create projects (Scrum / Kanban), define project keys, create issues of various types (Epic, Story, Task, Bug, Subtask), view issue lists, and interact with a full Jira Cloud-style issue detail view (side drawer modal and standalone page) with comments and activity history.

---

## Technical & Domain Scope

### 1. Prisma Data Model Extensions
- **Project**:
  - `id`: CUID
  - `siteId`: Foreign key to `Site`
  - `name`: string (e.g. "Mobile App")
  - `key`: string (uppercase, e.g. "MOB", unique per site)
  - `type`: Enum `ProjectType` (`SCRUM` | `KANBAN`)
  - `leadId`: Foreign key to `User`
  - `issueCounter`: Int (defaults to 0, auto-increments for keys like `MOB-1`, `MOB-2`)
  - `createdAt`, `updatedAt`
- **Issue**:
  - `id`: CUID
  - `projectId`: Foreign key to `Project`
  - `number`: Int (sequential within project)
  - `key`: string (e.g. "MOB-12", indexed, unique per site)
  - `summary`: string
  - `description`: Text (Markdown / rich plain text)
  - `type`: Enum `IssueType` (`EPIC` | `STORY` | `TASK` | `BUG` | `SUBTASK`)
  - `status`: Enum `IssueStatus` (`TO_DO` | `IN_PROGRESS` | `IN_REVIEW` | `DONE`)
  - `priority`: Enum `IssuePriority` (`HIGHEST` | `HIGH` | `MEDIUM` | `LOW` | `LOWEST`)
  - `storyPoints`: Float?
  - `reporterId`: Foreign key to `User`
  - `assigneeId`: Foreign key to `User`?
  - `parentId`: Foreign key to `Issue`? (for Subtasks or Epic links)
  - `labels`: string[] (PostgreSQL scalar array)
  - `createdAt`, `updatedAt`
- **Comment**:
  - `id`: CUID
  - `issueId`: Foreign key to `Issue`
  - `authorId`: Foreign key to `User`
  - `body`: Text
  - `createdAt`, `updatedAt`
- **IssueHistory**:
  - `id`: CUID
  - `issueId`: Foreign key to `Issue`
  - `authorId`: Foreign key to `User`
  - `field`: string (e.g., "status", "assignee", "priority")
  - `oldValue`: string?
  - `newValue`: string?
  - `createdAt`

---

### 2. User Experience & UI Components

#### **Project Management**
- `/projects`: List all projects for the user's active site with search & filter.
- **Create Project Modal**: Form with Name, Key (auto-generated from name), Type (`Scrum` / `Kanban`), and Lead selection.
- Project Sidebar dynamic update: Displays selected Project name & key.

#### **Issue Management & Navigation**
- **Global "Create" Button (TopNav)**: Triggers Create Issue Modal from anywhere in the app. Allows selecting Project, Issue Type, Summary, Description, Priority, Assignee, and Story Points.
- **Issue List View** (`/projects/[key]`): Table view showing key, summary, type badge, status tag, priority icon, assignee avatar, and story points.
- **Issue Detail Panel / Modal** (`/projects/[key]/issues/[issueKey]` or drawer):
  - **Left Section**: Header with Key + Breadcrumbs, Editable Summary, Rich Description editor, Activity Tabs (Comments, History log).
  - **Right Section (Sidebar)**: Status dropdown, Assignee picker, Reporter display, Priority picker, Story Points input, Labels tag editor.
  - **Comments**: Add comment form, list of existing comments with author avatars and relative timestamps.

---

## Verification Plan

1. **Prisma & DB**: Run `npx prisma migrate dev` and test relations via Vitest.
2. **Unit Tests**:
   - Project creation & slug/key generation tests.
   - Issue creation sequence (`KEY-1`, `KEY-2`) tests.
   - Comment & History log creation tests.
3. **E2E Tests (Playwright)**:
   - Create Project -> Create Issue via TopNav -> Open Issue detail panel -> Update Status & add Comment.
4. **Visual Fidelity**: Jira-style issue badges (colors for Epic/Story/Bug/Task), status tags, priority icons, clean typography.
