# Trackly v2 — Master Design (High-Fidelity Jira)

Date: 2026-07-21 · Status: Approved by user (roadmap + tech choices)

## Goal

Upgrade Trackly from v1 prototype to production-grade, pixel-faithful replica of **current Jira Cloud (2025-26 UI)** — full Jira Software core, then Plans, Forms + Goals, and JSM. Evolve the v1 codebase in place; no rebuild.

## Locked technical decisions

1. **Drag & drop:** `@atlaskit/pragmatic-drag-and-drop` (Atlassian's own OSS — exact Jira drag feel).
2. **Rich text:** TipTap (ProseMirror; same family as Jira's editor). Mentions, tables, code blocks, media, slash commands. Content stored as TipTap JSON in `Json` columns.
3. **Realtime:** standalone Node WebSocket service + Postgres LISTEN/NOTIFY. Rooms per board/issue/user. No Redis.
4. **Client data:** TanStack Query over server actions; optimistic updates for board/issue mutations.
5. **Workflow engine:** DB-driven — `Status`, `Workflow`, `WorkflowTransition`, `IssueTypeScheme`, `FieldConfiguration` tables replace `IssueStatus` enum. Migration converts v1 rows losslessly.
6. **Design tokens:** Atlassian Design System-style dual-theme CSS variables (`--ds-*`), light + dark, `data-theme` attribute, cookie-persisted for SSR.
7. **Pixel reference:** user's real Jira instance; every UI phase ends with a side-by-side fidelity pass before close.

## Phase roadmap (each phase: spec → plan → subagent execution; Fable plans, sonnet/haiku implement)

| # | Phase | Contents |
|---|-------|----------|
| V2-1 | Design system + navigation | ADS dual-theme tokens, left global sidebar, slim top bar, dark mode, keyboard-shortcut framework, Cmd+K command palette, migrate all pages to new chrome |
| V2-2 | Workflow engine | Status/Workflow/Transition/IssueTypeScheme/FieldConfiguration tables, visual workflow editor, enum migration |
| V2-3 | Issue experience | TipTap everywhere, attachments (disk store, S3-ready interface), issue links, subtask+epic hierarchy, components/versions, two-column issue view |
| V2-4 | Boards deep | Board config (column↔status map, WIP, swimlanes, card layout, quick filters), backlog epic/version panels, estimation, pragmatic-dnd everywhere |
| V2-5 | Realtime | ws service, live board/issue sync, presence, optimistic UI with TanStack Query |
| V2-6 | JQL v2 + navigator | Full grammar (parens, NOT, functions, ORDER BY), per-field autocomplete, column config, bulk edit |
| V2-7 | Dashboards + reports v2 | Draggable gadget grid, burnup, control chart, CFD, release burndown |
| V2-8 | Timeline + Plans | Project Gantt with dependencies, cross-project Plans, capacity |
| V2-9 | Admin depth | Permission + notification schemes, all custom field types, automation v2 (branches, audit log), priorities/resolutions, avatars |
| V2-10 | Forms + Goals | Form builder, goal tracking |
| V2-11 | JSM | Request types, portal, queues, SLAs |

## Quality bar (every phase)

- TDD; `npx tsc --noEmit` clean; Vitest + Playwright per surface.
- No data loss: every schema change ships a migration converting existing rows.
- Pixel pass vs user's Jira before phase closes.
- Process: subagent-driven development; progress ledger `.superpowers/sdd/progress.md`; every step logged for cross-session context.
- Model economy: Fable 5 plans/specs only; implementation = sonnet (standard), haiku (mechanical transcription), opus (only if sonnet blocked).

## Out of scope (all phases)

Atlassian trademarks/logos/artwork; Confluence; Marketplace; Bitbucket/GitHub integrations (later product decision); mobile apps.
