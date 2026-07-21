# Trackly — Phase 7: Workflow + Automation — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Phase 7 introduces **Custom Workflow Transition Rules** and an **Automation Engine** in Trackly. Teams can construct no-code automation rules (e.g., "When issue status changes to `IN_REVIEW`, automatically assign to lead" or "When an issue is created, add welcome comment") and enforce workflow transition constraints.

---

## Technical & Domain Scope

### 1. Prisma Data Model Extensions
- **AutomationRule**:
  - `id`: CUID
  - `projectId`: Foreign key to `Project`
  - `name`: string (e.g., "Auto-assign on In Review")
  - `eventTrigger`: Enum `AutomationTrigger` (`ISSUE_CREATED`, `STATUS_CHANGED`, `COMMENT_ADDED`)
  - `action`: Enum `AutomationAction` (`ASSIGN_USER`, `UPDATE_STATUS`, `ADD_COMMENT`)
  - `targetValue`: string
  - `enabled`: Boolean (`@default(true)`)
  - `createdAt`: DateTime (`@default(now())`)

---

### 2. Automation Engine Specification (`lib/automation.ts`)
- **Event Dispatcher**: `triggerAutomationRules(eventTrigger, payload)`
- **Rule Evaluator**: Evaluates enabled rules matching project and trigger, executing automated actions:
  - `ASSIGN_USER`: Automatically reassigns issue.
  - `UPDATE_STATUS`: Transitions issue status.
  - `ADD_COMMENT`: Posts automated comment to issue.

---

### 3. User Experience & Components

#### **A. Automation Rules Workspace Page** (`app/(app)/settings/automation/page.tsx`)
- Rule builder interface allowing users to select Trigger, Action, and Target Value.
- Toggle switch to enable/disable rules.
- List view of active automation rules per project.

---

## Verification Plan

1. **Database**: Migration for `AutomationRule` model.
2. **Unit Tests**:
   - `lib/automation.test.ts` testing trigger evaluation and action execution.
3. **Playwright E2E Tests**:
   - Create automation rule -> Trigger event -> Verify automated action executed.
