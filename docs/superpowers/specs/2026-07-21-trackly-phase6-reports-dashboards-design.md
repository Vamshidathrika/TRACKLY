# Trackly — Phase 6: Reports + Dashboards — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Phase 6 introduces **Agile Reports** (Burndown Chart, Velocity Chart, Cumulative Flow Diagram) and **Customizable Dashboards** with interactive gadgets in Trackly. Teams can analyze sprint performance, track velocity across sprints, and monitor project status from dedicated dashboard gadgets.

---

## Technical & Domain Scope

### 1. Reports Data Calculations (`lib/reports.ts`)
- **Burndown Chart Data**:
  - Calculates ideal guideline slope vs actual remaining story points per day throughout a sprint duration.
- **Velocity Chart Data**:
  - Compares total committed story points vs completed story points for all sprints in a project.
- **Cumulative Flow Data**:
  - Aggregates issue distribution by status (`TO DO`, `IN PROGRESS`, `IN REVIEW`, `DONE`) over time.

---

### 2. User Experience & Components

#### **A. Project Agile Reports Page** (`app/(app)/projects/[key]/reports/page.tsx`)
- Sidebar link to **Reports** enabled.
- Interactive report tabs:
  - **Burndown Chart**: Dual line chart showing ideal vs remaining points.
  - **Velocity Chart**: Bar chart comparing committed vs completed points per sprint.
  - **Cumulative Flow Diagram**: Stacked area visual representing issue status flow.

#### **B. Dashboard Workspace & Gadgets** (`app/(app)/dashboards/page.tsx`)
- Configurable Jira-style dashboard layout:
  - **Project Status Summary Gadget**: Visual breakdown of issue statuses.
  - **Priority Breakdown Gadget**: Issue count distribution by priority level.
  - **Assigned to Me Gadget**: Quick table of issues assigned to the logged-in user.
  - **Recent Activity Stream Gadget**: Real-time history audit log feed.

---

## Verification Plan

1. **Unit Tests**:
   - `lib/reports.test.ts` testing burndown calculation, velocity totals, and status breakdown logic.
2. **Playwright E2E Tests**:
   - Navigate to `/projects/DEMO/reports` -> Switch report tabs -> Open `/dashboards` -> Verify gadgets.
