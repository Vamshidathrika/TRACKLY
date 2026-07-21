# Trackly V2-1 — Design System + Navigation — Design Spec

Date: 2026-07-21 · Status: Approved (part of v2 master roadmap)
Parent: `2026-07-21-trackly-v2-master-design.md`

## Scope

Rebuild Trackly's chrome to match current Jira Cloud (2025-26): dual-theme ADS-style tokens, slim top bar, left global sidebar, project-scoped nav panel, dark mode, keyboard shortcuts, Cmd+K command palette. Migrate every existing page onto the new chrome. No feature-surface changes (boards/issues untouched beyond re-theming).

## Token system

CSS variables on `:root[data-theme="light"]` / `:root[data-theme="dark"]`, exposed to Tailwind v4 via `@theme inline`. Palette (light / dark):

| Token | Light | Dark |
|---|---|---|
| `--ds-surface` | `#FFFFFF` | `#1D2125` |
| `--ds-surface-sunken` | `#F7F8F9` | `#161A1D` |
| `--ds-surface-raised` | `#FFFFFF` | `#22272B` |
| `--ds-surface-overlay` | `#FFFFFF` | `#282E33` |
| `--ds-text` | `#172B4D` | `#B6C2CF` |
| `--ds-text-subtle` | `#44546F` | `#9FADBC` |
| `--ds-text-subtlest` | `#626F86` | `#8C9BAB` |
| `--ds-border` | `#091E4224` | `#A6C5E229` |
| `--ds-brand` | `#0C66E4` | `#579DFF` |
| `--ds-brand-hovered` | `#0055CC` | `#85B8FF` |
| `--ds-bg-neutral` | `#091E420F` | `#A1BDD914` |
| `--ds-bg-neutral-hovered` | `#091E4224` | `#A6C5E229` |
| `--ds-bg-selected` | `#E9F2FF` | `#1C2B41` |
| `--ds-text-selected` | `#0C66E4` | `#579DFF` |
| `--ds-danger` | `#C9372C` | `#F87168` |
| `--ds-success` | `#22A06B` | `#4BCE97` |
| `--ds-warning` | `#E2B203` | `#F5CD47` |

Legacy v1 tokens (`--color-brand` etc.) become aliases of `--ds-*` so untouched components keep working until the sweep task re-tokens them. Radius stays 3px; font stack unchanged; base 14px.

Theme: `data-theme` on `<html>`, chosen from cookie `trackly-theme` (`light|dark|system`), SSR-safe (layout reads cookie), toggle in top bar settings menu + command palette; `system` follows `prefers-color-scheme` via inline script to avoid flash.

## Chrome layout

```
┌──────────────────────────────────────────────────────┐
│ TopBar (48px): [☰] [logo Trackly] [Search 780px]     │
│                [+ Create] [🔔] [?] [⚙] [avatar]      │
├──────────┬───────────────────────────────────────────┤
│ Global   │  content area                             │
│ Sidebar  │  (project pages add ProjectNav rail       │
│ (240px)  │   inside content, Jira-style)             │
└──────────┴───────────────────────────────────────────┘
```

**TopBar (48px, `--ds-surface`, bottom border):** sidebar collapse toggle; logo+wordmark → `/your-work`; centered search input (opens command palette on focus/Cmd+K); primary **Create** button (opens existing CreateIssueModal globally); notification bell (existing); help; settings menu (theme toggle lives here); avatar menu (existing UserMenu).

**Global sidebar (240px, collapsible to 0 with floating expand affordance, state in localStorage):** sections in order — **Your work** (`/your-work`), **Recent** (last 5 visited projects, localStorage), **Starred** (Star model, per-user), **Projects** (all site projects from DB, each linking `/projects/[key]`, + "View all projects"), **Filters** (`/filters/search`), **Dashboards** (`/dashboards`), **Teams** (stub), **Plans** (stub, disabled "Coming in V2-8"). Active item = `--ds-bg-selected` + `--ds-text-selected` left-edge indicator, matching Jira.

**ProjectNav rail (inside project pages, replaces v1 Sidebar):** project icon+name header, then Board, Backlog, Timeline (stub), Reports, Issues, Settings. Collapsible; active states as above.

## Keyboard shortcuts + command palette

- Shortcut registry hook (`useShortcuts`) — global keydown listener, ignores editable targets, supports sequences (`g d`) with 1s timeout.
- Bindings: `c` open Create issue; `/` focus search; `?` shortcuts help modal; `g d` dashboards; `g p` projects; `g y` your work; `Cmd/Ctrl+K` command palette; `\` toggle theme.
- Command palette (Radix Dialog): fuzzy list of actions (create issue, navigation targets, theme switch, all projects by name from DB) + live issue search (reuses existing quick-search server action) with recent-searches memory (localStorage). Arrow/enter navigation.

## Data model additions

`Star { id, userId, projectId, createdAt, @@unique([userId, projectId]) }` — starred projects. Nothing else; Recent is client-side.

## Migration of existing pages

All `(app)` routes render inside new `AppShell` (TopBar + global sidebar). Old `TopNav` deleted. Old project `Sidebar` replaced by ProjectNav. Every existing component's raw hex/legacy classes re-tokened to `--ds-*` in a sweep task (dark mode must look correct on every existing surface: boards, issue view, dashboards, settings, auth pages).

## Testing

- Vitest: shortcut registry (sequence handling, editable-target ignore), theme cookie util, palette action filtering.
- Playwright: chrome renders on all main routes; Cmd+K opens palette and navigates; `c` opens create modal; theme toggle persists across reload (cookie); sidebar collapse persists; dark mode screenshot smoke.
- Fidelity pass: side-by-side vs user's real Jira (top bar, sidebar, palette, dark mode) — user supplies screenshots/access at phase end.

## Success criteria

1. All v1 features reachable and functional inside new chrome; no dead routes.
2. Dark + light themes complete on every existing surface (no unthemed hexes on chrome or feature pages).
3. Shortcuts + palette work; e2e green; `tsc --noEmit` clean; all unit tests pass.
4. Visual match confirmed against real Jira reference.
