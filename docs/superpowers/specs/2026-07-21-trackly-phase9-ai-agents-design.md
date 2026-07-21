# Trackly — Phase 9: Autonomous AI Agent & Status Permissions — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Phase 9 equips Trackly with an **Autonomous All-in-One AI Agent** that possesses complete domain knowledge of the platform and can autonomously perform any ticket operation (create issues, update fields, change statuses, manage sprints, add comments) via natural language. Additionally, it introduces **Assignee-Only Status Transition Permissions**.

---

## Technical & Domain Scope

### 1. Autonomous Ticket Action Agent (`lib/ai/ticketAgent.ts`)
Executes natural language commands by invoking platform tools:
- **`createIssue`**: Creates new issues with type, summary, description, assignee, priority, and story points.
- **`updateIssue`**: Modifies any issue attribute (status, priority, summary, description, assignee).
- **`addComment`**: Posts comments and `@mentions`.
- **`createSprint` / `moveIssueToSprint`**: Manages sprint planning.
- **`searchPlatform`**: Queries issues, projects, and members across the workspace.

---

### 2. Platform Knowledge Base Context (`lib/ai/knowledgeBase.ts`)
- Aggregates full workspace context (active projects, user members, open sprints, recent issues, custom fields) to feed into the AI Copilot.

---

### 3. Assignee Status Change Permission Rule (`lib/issues.ts`, `components/issues/IssueDetail.tsx`, `components/board/IssueCard.tsx`)
- **Rule**: Users can change an issue's status **IF AND ONLY IF**:
  1. The user is the **Assignee** of the issue, OR
  2. The user has **`ADMIN`** role.
- Unassigned non-admin users attempting status updates receive a clear permission notice: *"Status changes restricted to Assignee or Admin"*.

---

## Verification Plan

1. **Unit Tests**:
   - `lib/ai/ticketAgent.test.ts` testing autonomous action parsing and permission evaluation.
2. **Playwright E2E Tests**:
   - `e2e/ai-agents.spec.ts`: Test autonomous issue creation via AI Copilot drawer and assignee status change restriction.
