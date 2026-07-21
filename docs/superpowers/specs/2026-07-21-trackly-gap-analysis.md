# Trackly — Gap Analysis vs Real Jira (Jira Software Core)

Date: 2026-07-21 · Author: planning pass (opus)
Basis: `prisma/schema.prisma` (22 models) + `app/`/`components/`/`lib/` inventory, compared to Jira Cloud Software.

## Verdict

v1 covers the *shape* of Jira (projects, issues, board, backlog, sprints, JQL, dashboards, reports, automation, admin) but at prototype depth. Against real Jira Software, the biggest missing pillars are **time tracking / worklog** (absent entirely) and **rich comments** (plain string today). Below: every gap, grouped, each mapped to a build phase.

---

## Tier 1 — Core work-management gaps (user-flagged; highest priority)

### 1. Time tracking & worklog — MISSING ENTIRELY
Real Jira: original estimate, remaining estimate, time spent; "Log work" dialog (time + date started + work description + remaining-estimate adjustment); time-tracking bar (blue spent / orange remaining) on issue; worklog tab in activity; time reports; `timespent`/`worklogAuthor`/`worklogDate` JQL fields.
Current Trackly: no `Worklog` model, no estimate fields on `Issue`, no UI. **0% present.**
- Add `Worklog { id, issueId, authorId, timeSpentSeconds, description, startedAt, createdAt }`.
- Add to `Issue`: `originalEstimateSeconds Int?`, `remainingEstimateSeconds Int?` (timeSpent = sum of worklogs).
- UI: Log Work dialog, time-tracking bar, Worklog list in activity tab, Jira duration parser (`2w 3d 4h 30m`).
- JQL: `timespent`, `originalEstimate`, `remainingEstimate`, `worklogAuthor`, `worklogDate`.

### 2. Comments — SHALLOW (plain `body String`)
Real Jira: rich text (ADF), @mentions (linked, notified), edit history, emoji reactions, comment visibility restriction (role/group), reply/threading, attachments & links inside comment, internal vs public (JSM).
Current Trackly: `Comment { body String }` plain; mentions parsed in `lib/notifications.ts` but not stored as links; no edit trail, no reactions, no restriction.
- Rich body: store TipTap JSON (`bodyJson Json`), keep `body` as plaintext fallback for search.
- `CommentReaction { id, commentId, userId, emoji }`.
- `edited Boolean` + edit history (reuse IssueHistory pattern or `CommentEdit`).
- Mention entities stored (link userId), drive notifications reliably.
- Visibility: `restrictedToRole String?`.

### 3. Rich text everywhere — MISSING (plain textarea)
Description, comments, custom text fields use `<textarea>`. Real Jira uses ProseMirror editor: headings, lists, tables, code blocks, panels, mentions, emojis, images, slash menu.
- Adopt **TipTap** (ProseMirror). Shared `RichEditor` + `RichRenderer`. Store JSON.

---

## Tier 2 — Issue model depth

### 4. Attachments — MISSING
No `Attachment` model, no upload. Jira: drag-drop files, image thumbnails, preview, attach in comment.
- `Attachment { id, issueId, uploaderId, filename, mimeType, sizeBytes, storageKey, createdAt }`; local disk store behind an interface (S3-swappable); thumbnail strip on issue.

### 5. Issue links — MISSING (only parent/subtask hierarchy)
Jira: typed links — blocks / is blocked by / relates to / duplicates / clones, cross-project. 
- `IssueLink { id, sourceId, targetId, type }` with inverse-pair labels; "Link issue" UI; blocked-badge on cards.

### 6. Components — MISSING
Jira: project components with component-lead + auto-assign; `component` JQL field; component filter.
- `Component { id, projectId, name, leadId?, description? }` + `Issue.components`.

### 7. Versions / Releases — MISSING
Jira: fixVersion / affectsVersion, releases page, release burndown, version status (unreleased/released/archived).
- `Version { id, projectId, name, description?, startDate?, releaseDate?, status }`; `Issue.fixVersions` / `affectsVersions`; Releases page.

### 8. Resolution — MISSING
Jira: resolution (Fixed / Won't Do / Duplicate / Cannot Reproduce), set on Done transition, `resolution`/`resolved` JQL, "unresolved" filter.
- `Issue.resolutionId` + `Resolution` table (or enum); resolution screen on close.

### 9. Due date, environment, votes — MISSING
- `Issue.dueDate DateTime?` (+ calendar view, `duedate` JQL).
- `Vote { issueId, userId }` + vote button/count.
- `Issue.environment String?` (bug field).

### 10. Custom field VALUES — MISSING (defs exist, no storage)
`CustomField` defines fields but nothing stores per-issue values, and only `fieldType String`.
- `CustomFieldValue { id, fieldId, issueId, value Json }`; real field types (select, multiselect, number, date, user-picker, url, checkbox, labels); render on issue view; JQL by custom field.

---

## Tier 3 — Workflow & board engine

### 11. Workflow engine — MISSING (hardcoded enum)
`IssueStatus` is a 4-value enum (TO_DO/IN_PROGRESS/IN_REVIEW/DONE). Real Jira: per-project workflows, arbitrary statuses in categories (To Do/In Progress/Done), defined transitions, transition rules/conditions/validators/post-functions, workflow editor diagram.
- `Status`, `StatusCategory`, `Workflow`, `WorkflowTransition`, `IssueTypeScheme` tables; migrate enum data; visual editor. (This is V2-2 in master roadmap.)

### 12. Configurable boards — PARTIAL (derived from enum)
Board columns are the status enum. Jira: board is an entity — column↔status mapping, swimlanes (by assignee/epic/subtask/query), WIP limits, card layout, quick filters, board settings, filter-backed boards.
- `Board`, `BoardColumn`, `BoardColumnStatus`, `QuickFilter`, `Swimlane` config. (V2-4.)

### 13. Backlog depth — PARTIAL
Missing: epics panel toggle, versions panel, sprint capacity/velocity, drag epic→issue, inline create in backlog, multi-select drag.

---

## Tier 4 — Search, reports, dashboards

### 14. JQL v2 — PARTIAL
Add: parentheses, NOT, functions (currentUser(), startOfDay(), membersOf()), ORDER BY multi, IN/IS/WAS/CHANGED, saved-filter subscriptions, per-field autocomplete. Plus new fields from Tiers 1-2 (timespent, fixVersion, component, resolution, duedate, custom fields).

### 15. Issue navigator — PARTIAL
Add: configurable columns, CSV/print export, bulk edit (transition/assign/label/delete N issues), detail/list split view.

### 16. Reports v2 — PARTIAL
Add/verify: burnup, cumulative flow diagram, control chart, velocity, sprint report, epic report, release burndown, time-tracking report, created-vs-resolved, average age.

### 17. Dashboards — PARTIAL
Add: draggable gadget grid, gadget catalog (assigned to me, filter results, pie, two-dimensional, activity stream, sprint health, burndown gadget), shared dashboards, per-user layout persistence.

---

## Tier 5 — Admin, permissions, notifications

### 18. Permission schemes — MISSING (only ADMIN/MEMBER)
Jira: project roles (Admin/Member/Viewer + custom), permission scheme (40+ granular permissions: browse, create, edit, assign, transition, delete, manage sprints…), per-project assignment.
- `ProjectRole`, `PermissionScheme`, `PermissionGrant`; enforce in server actions.

### 19. Notification schemes + email — MISSING
In-app notifications only. Jira: email on assign/comment/mention/transition, notification scheme per event, user notification preferences, batching.
- Email transport (dev: console/mailhog), `NotificationScheme`, per-user prefs.

### 20. Groups / Teams — STUB
- `Group`, `GroupMembership`; Teams pages; membersOf() in JQL; group-based permissions.

### 21. Global/project config — PARTIAL
Issue type schemes, screens/screen schemes, field configurations, priority scheme, statuses admin, project categories, project avatars, project archive/delete.

---

## Tier 6 — Beyond core (later products)

- **Timeline (project Gantt)** — stub → dependencies, bars, rollup. (V2-8)
- **Plans / Advanced Roadmaps** — cross-project planning, capacity, scenarios. (V2-8)
- **Forms** — form builder on issues. (V2-10)
- **Goals** — goal tracking. (V2-10)
- **JSM** — request types, portal, queues, SLAs, approvals, KB. (V2-11)
- **Automation v2** — multi-condition/branch rules, more triggers/actions, audit log, scheduled rules.

---

## Recommended sequencing (revised roadmap)

The master v2 roadmap already sequences most of this. This analysis adds two under-specified items into the near term because the user flagged them and they are pure daily-driver core:

1. **V2-1 Design system + navigation** — in progress (chrome, dark mode, palette).
2. **V2-2 Workflow engine** — Tier 3 #11 (unblocks boards/automation depth).
3. **V2-3 Issue experience** — now explicitly includes: **TipTap rich text (#3), rich comments (#2), time tracking/worklog (#1), attachments (#4), issue links (#5), components (#6), versions (#7), resolution (#8), due date/votes (#9), custom field values (#10)**. This is the heaviest phase; may split into V2-3a (editor + comments + worklog) and V2-3b (links/components/versions/fields).
4. **V2-4 Boards deep**, **V2-5 Realtime**, **V2-6 JQL v2 + navigator + bulk**, **V2-7 Reports/dashboards v2**, **V2-8 Timeline+Plans**, **V2-9 Admin/permissions/notifications/email**, **V2-10 Forms+Goals**, **V2-11 JSM**.

### Proposed split of V2-3 (the user's priorities land here)
- **V2-3a — Editor, comments, worklog** (highest value): TipTap `RichEditor`/`RichRenderer`; migrate description + comments to JSON; comment reactions + edit + reliable mentions; `Worklog` model + estimate fields + Log Work dialog + time-tracking bar + worklog activity + duration parser.
- **V2-3b — Issue relationships & fields**: attachments, issue links, components, versions/releases, resolution, due date/votes/environment, custom field values.

Each sub-phase: own spec → plan → subagent execution (opus implementers, sonnet reviewers), TDD, migration-safe, pixel pass vs real Jira.
