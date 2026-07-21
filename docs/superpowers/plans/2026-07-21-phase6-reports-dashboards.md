# Trackly Phase 6: Reports + Dashboards Implementation Plan

Goal: Build Agile Reports (Burndown, Velocity, Cumulative Flow) and customizable Dashboard workspace with gadgets.

## Proposed Tasks

### Task 1: Reports Data Layer & Unit Tests
- Files: `lib/reports.ts`, `lib/reports.test.ts`
- Implement `getBurndownData`, `getVelocityData`, and `getProjectMetrics`.

### Task 2: Agile Reports View & Component
- Files: `components/reports/ReportsView.tsx`, `app/(app)/projects/[key]/reports/page.tsx`
- Interactive SVG charts for Burndown, Velocity, and Cumulative Flow diagrams. Enable Reports link in Sidebar.

### Task 3: Dashboards Workspace & Gadgets
- Files: `components/dashboards/DashboardView.tsx`, `app/(app)/dashboards/page.tsx`
- Build Dashboard page with Status Summary, Priority Breakdown, Assigned to Me, and Recent Activity gadgets. Enable Dashboards link in TopNav dropdown.

### Task 4: Playwright E2E Tests for Phase 6
- Files: `e2e/reports-dashboards.spec.ts`
- Test full flow: Visit project reports -> View velocity/burndown charts -> Visit dashboards.
