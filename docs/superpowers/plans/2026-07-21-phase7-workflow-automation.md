# Trackly Phase 7: Workflow + Automation Implementation Plan

Goal: Build Automation Rules Engine, Rule Builder UI, and workflow transition execution triggers.

## Proposed Tasks

### Task 1: Prisma Schema Extensions (AutomationRule model)
- Files: `prisma/schema.prisma`
- Add Enums: `AutomationTrigger`, `AutomationAction`
- Add Model: `AutomationRule`
- Run migration `phase7_automation_rules`

### Task 2: Automation Engine & Unit Tests
- Files: `lib/automation.ts`, `lib/automation.test.ts`
- Implement `createAutomationRule`, `getAutomationRules`, `toggleAutomationRule`, and `evaluateAutomationTriggers`.

### Task 3: Automation Rules Manager Page & UI
- Files: `components/automation/AutomationView.tsx`, `app/(app)/settings/automation/page.tsx`, `app/(app)/settings/automation/actions.ts`
- Build interactive Rule Builder form and active rules toggle list.

### Task 4: Workflow Triggers Integration
- Files: `app/(app)/projects/[key]/issues/actions.ts`
- Hook `evaluateAutomationTriggers` into issue status updates and comment posting.

### Task 5: Playwright E2E Tests for Phase 7
- Files: `e2e/workflow-automation.spec.ts`
- Test full flow: Create automation rule -> Change status -> Verify automated comment/assignment.
