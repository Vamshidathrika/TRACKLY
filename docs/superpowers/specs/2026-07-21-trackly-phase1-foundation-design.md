# Trackly — Phase 1: Foundation + Jira Shell — Design Spec

Date: 2026-07-21
Status: Approved pending user review
Author: brainstormed with Claude (Fable 5)

## Product vision

Trackly is a full-featured Jira Cloud replica: same layout, interactions, and feature set, rebuilt as an independent product. No Atlassian trademarks, logos, or artwork — the look-and-feel is replicated through our own design tokens and components under the Trackly name.

Target: multi-user team product with real authentication, realtime collaboration, and eventually the complete Jira feature surface (boards, backlog, sprints, JQL, reports, workflow editor, automation, admin schemes).

## Working rules (apply to every phase)

- Every step logged for cross-session context: claude-mem passive capture + committed spec/plan docs in this repo.
- Model economy: Fable 5 only for planning/architecture/specs. Execution subagents run with explicit cheaper models — haiku (mechanical edits), sonnet (standard implementation), opus (complex implementation).
- TDD per superpowers for all implementation work.
- Pixel fidelity verified against Jira Cloud side-by-side in browser during UI work.

## Phase roadmap (approved)

1. **Foundation + Jira shell** (this spec) — repo, stack, auth, org model, top nav + sidebar chrome, design tokens.
2. **Projects + issues core** — project CRUD (Scrum/Kanban), issue types (Epic/Story/Task/Bug/Subtask), issue detail panel: description editor, status, assignee, priority, labels, story points, comments, activity history, issue links, attachments.
3. **Board + backlog** — Kanban drag-drop board, swimlanes, WIP limits; Scrum backlog, sprint lifecycle, drag-rank ordering, quick filters.
4. **Realtime + notifications** — WebSocket service, live board/comment updates, presence, notification bell, @mentions, watchers, email notifications.
5. **Search + JQL** — global quick search, JQL-style query language with autocomplete, saved filters, issue navigator with configurable columns.
6. **Reports + dashboards** — burndown/burnup, velocity, cumulative flow, control chart; dashboard page with gadgets.
7. **Workflow + automation** — custom workflow editor (statuses, transitions, rules), automation engine (triggers/conditions/actions).
8. **Admin + permissions** — permission schemes, roles, project settings, custom fields, issue type schemes, user management.

Each phase gets its own spec → plan → implementation cycle. Phases 1–3 produce a daily-driver tool; 4–8 stack on top.

## Phase 1 scope

In scope: repo scaffolding, stack setup, design tokens, component primitives, app shell (top nav, project sidebar, breadcrumbs), auth (signup/login/Google), Site (organization) model, membership + email invites, testing infrastructure.

Out of scope (later phases): projects, issues, boards, realtime, search, reports, workflow, admin schemes.

## Architecture

- **Framework:** Next.js 15, App Router, TypeScript, React Server Components where sensible.
- **Database:** Postgres 16 via Docker Compose for local dev. Prisma ORM + migrations.
- **Auth:** NextAuth v5 — credentials (email/password, bcrypt) + Google OAuth. JWT sessions.
- **Styling:** Tailwind CSS v4. Design tokens as CSS variables mirroring Atlassian Design System values:
  - Brand blue `#0052CC`, hover `#0747A6`; text navy `#172B4D`; subtle text `#6B778C`; surface `#FFFFFF`; background `#F4F5F7`; border `#DFE1E6`; danger `#DE350B`; success `#00875A`; warning `#FF991F`.
  - Border radius 3px; 8px spacing grid; system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`); 14px base font.
- **Component primitives:** custom-built with Radix UI for accessibility (Dropdown, Dialog, Tooltip, Popover) + Tailwind styling. No Atlaskit dependency.
- **Realtime:** none in Phase 1. `services/realtime/` directory reserved; Phase 4 adds a standalone Node WebSocket service.

## Repo layout

```
trackly/
  app/
    (auth)/login/  (auth)/signup/  (auth)/invite/[token]/
    (app)/your-work/  (app)/projects/  (app)/settings/
    api/auth/[...nextauth]/  api/invites/
  components/
    ui/        # Button, Input, Dropdown, Modal, Avatar, Tag, Tooltip, Spinner, Toast
    nav/       # TopNav, Sidebar, Breadcrumbs, ProjectSwitcher, CreateButton
  lib/         # auth.ts, prisma.ts, validation (zod)
  prisma/      # schema.prisma, migrations/, seed.ts
  services/realtime/   # reserved, empty until Phase 4
  docs/superpowers/specs/
  docker-compose.yml   # postgres
```

## Data model (Phase 1 slice)

```prisma
model User       { id, email (unique), name, passwordHash?, avatarUrl?, createdAt; memberships Membership[] }
model Site       { id, name, slug (unique), createdAt; memberships Membership[]; invites Invite[] }
model Membership { id, userId, siteId, role (ADMIN | MEMBER), createdAt; @@unique([userId, siteId]) }
model Invite     { id, siteId, email, token (unique), role, expiresAt, acceptedAt? }
```

Signup creates User + Site + ADMIN Membership in one transaction. Invite flow: admin enters email → tokened link (dev: logged to console; email provider deferred to Phase 4) → recipient signs up/logs in → Membership created, invite marked accepted.

Phase 2 will add Project/Issue tables referencing `Site` — nothing in this slice needs rework for that.

## UI shell specification

**Top nav (56px, white, bottom border):** left — app switcher grid icon, Trackly logo + wordmark; center-left — "Your work", "Projects", "Filters", "Dashboards", "Teams" dropdown triggers; blue **Create** button; right — search input (expands on focus), notification bell, help icon, settings gear, user avatar menu (profile, personal settings, log out).

**Project sidebar (240px, collapsible to icon rail):** project icon + name + category header; navigation groups — "Planning" (Timeline, Backlog, Board, Reports — disabled/stub until later phases), "Development" (stub); "Project settings" pinned at bottom. Chevron collapse control on the divider.

**Breadcrumbs:** `Projects / <Project name> / <Page>` above page content.

**Pages in Phase 1:** login, signup, invite-accept, "Your work" (empty-state), site settings (members list + invite form). Project pages are stubs behind the sidebar links.

All measurements, colors, spacing, and hover states matched against Jira Cloud by side-by-side browser comparison during implementation.

## Error handling

- Zod validation on all API inputs; typed error responses `{ error: { code, message } }`.
- Auth failures: generic "Invalid email or password" (no user enumeration).
- Invite: expired/used tokens render a dedicated error page with re-request guidance.
- Global Next.js error boundary + not-found pages styled to match the shell.

## Testing

- **Vitest:** unit tests for lib functions (validation, invite token lifecycle, membership logic).
- **Playwright:** e2e smoke — signup → land on Your work; login; invite flow end-to-end; shell renders with nav/sidebar; logout.
- CI deferred until GitHub repo exists (user decision later).

## Success criteria

1. `docker compose up` + `npm run dev` gives a working app from a clean checkout.
2. Signup/login/Google/invite flows pass Playwright e2e.
3. Shell is visually faithful to Jira Cloud (side-by-side check).
4. All tests green; `tsc --noEmit` clean.
