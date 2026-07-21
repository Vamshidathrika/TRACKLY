# Trackly V2-1: Design System + Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Trackly's chrome as current Jira Cloud (2025-26): dual-theme ADS tokens, TopBar, global sidebar, project nav rail, dark mode, shortcuts, Cmd+K palette; migrate all pages.

**Architecture:** CSS-variable token system with `data-theme` on `<html>` (cookie-persisted, SSR-safe); `AppShell` client layout composed of `TopBar` + `GlobalSidebar`; project pages add `ProjectNav`; `useShortcuts` registry powers bindings + palette.

**Tech Stack:** Existing v1 stack (Next 15, Tailwind v4, Radix, Prisma 6, Vitest, Playwright). New dep: none required this phase (palette uses Radix Dialog already installed).

## Global Constraints

- Repo `/Users/nani/Downloads/trackly`, branch `feat/phase1-foundation`. Product name **Trackly**; never "Jira"/Atlassian branding.
- Token values (light/dark) EXACTLY as spec table in `docs/superpowers/specs/2026-07-21-trackly-v2-phase1-design-system-navigation.md` (§Token system).
- Legacy `--color-*` tokens must remain working as aliases until Task 8 sweep completes.
- v1 features must stay functional after every task — no dead routes, no broken imports. If an existing component's props don't match what this plan assumed, READ the component and adapt the integration (not the component) unless the task says otherwise.
- TDD where a testable unit exists; `npx tsc --noEmit` clean and `npm test` green before every commit; commit after every task.
- Model economy: sonnet default; Task 8 sweep = haiku. Escalate, never silently guess.
- Postgres via local brew (`postgresql://trackly:trackly@localhost:5432/trackly`); do NOT use docker compose. Prisma stays 6.x — never bump to 7.
- Dev server: `PORT=3001 npm run dev` (3000 often occupied by another app).

---

### Task 1: Token system + theme infrastructure

**Files:**
- Modify: `app/globals.css` (full rewrite below), `app/layout.tsx`
- Create: `lib/theme.ts`, `lib/theme.test.ts`, `components/theme/ThemeScript.tsx`

**Interfaces:**
- Produces: Tailwind classes `bg-surface`, `bg-surface-sunken`, `bg-surface-raised`, `bg-surface-overlay`, `text-default`, `text-subtle`, `text-subtlest`, `border-default`, `bg-brand`, `bg-brand-hovered`, `bg-neutral`, `bg-neutral-hovered`, `bg-selected`, `text-selected` (danger/success/warning stay on legacy-named classes `text-danger`/`text-success`/`text-warning`, now dual-theme); legacy classes (`bg-brand` old meaning, `text-text`, `border-border`, `rounded-ds`…) still resolve via aliases.
- Produces: `THEME_COOKIE = "trackly-theme"`, `type ThemePref = "light" | "dark" | "system"`, `parseThemeCookie(v: string | undefined): ThemePref`, `resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark"` in `lib/theme.ts`; `<ThemeScript />` inline no-flash script.

- [ ] **Step 1: Failing tests `lib/theme.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseThemeCookie, resolveTheme } from "./theme";

describe("parseThemeCookie", () => {
  it("returns valid prefs as-is", () => {
    expect(parseThemeCookie("dark")).toBe("dark");
    expect(parseThemeCookie("light")).toBe("light");
    expect(parseThemeCookie("system")).toBe("system");
  });
  it("defaults to system for undefined/garbage", () => {
    expect(parseThemeCookie(undefined)).toBe("system");
    expect(parseThemeCookie("banana")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("passes through explicit prefs", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("system follows OS", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
```
Run `npm test` → FAIL (module missing).

- [ ] **Step 2: Implement `lib/theme.ts`**

```ts
export const THEME_COOKIE = "trackly-theme";
export type ThemePref = "light" | "dark" | "system";

export function parseThemeCookie(v: string | undefined): ThemePref {
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}
```
Run `npm test` → PASS.

- [ ] **Step 3: Rewrite `app/globals.css`**

```css
@import "tailwindcss";

:root, :root[data-theme="light"] {
  --ds-surface: #FFFFFF;
  --ds-surface-sunken: #F7F8F9;
  --ds-surface-raised: #FFFFFF;
  --ds-surface-overlay: #FFFFFF;
  --ds-text: #172B4D;
  --ds-text-subtle: #44546F;
  --ds-text-subtlest: #626F86;
  --ds-border: #091E4224;
  --ds-brand: #0C66E4;
  --ds-brand-hovered: #0055CC;
  --ds-bg-neutral: #091E420F;
  --ds-bg-neutral-hovered: #091E4224;
  --ds-bg-selected: #E9F2FF;
  --ds-text-selected: #0C66E4;
  --ds-danger: #C9372C;
  --ds-success: #22A06B;
  --ds-warning: #E2B203;
}

:root[data-theme="dark"] {
  --ds-surface: #1D2125;
  --ds-surface-sunken: #161A1D;
  --ds-surface-raised: #22272B;
  --ds-surface-overlay: #282E33;
  --ds-text: #B6C2CF;
  --ds-text-subtle: #9FADBC;
  --ds-text-subtlest: #8C9BAB;
  --ds-border: #A6C5E229;
  --ds-brand: #579DFF;
  --ds-brand-hovered: #85B8FF;
  --ds-bg-neutral: #A1BDD914;
  --ds-bg-neutral-hovered: #A6C5E229;
  --ds-bg-selected: #1C2B41;
  --ds-text-selected: #579DFF;
  --ds-danger: #F87168;
  --ds-success: #4BCE97;
  --ds-warning: #F5CD47;
}

@theme inline {
  /* new tokens */
  --color-surface: var(--ds-surface);
  --color-surface-sunken: var(--ds-surface-sunken);
  --color-surface-raised: var(--ds-surface-raised);
  --color-surface-overlay: var(--ds-surface-overlay);
  --color-default: var(--ds-text);
  --color-subtle: var(--ds-text-subtle);
  --color-subtlest: var(--ds-text-subtlest);
  --color-border-default: var(--ds-border);
  --color-neutral: var(--ds-bg-neutral);
  --color-neutral-hovered: var(--ds-bg-neutral-hovered);
  --color-selected: var(--ds-bg-selected);
  --color-selected-text: var(--ds-text-selected);
  --color-brand-hovered: var(--ds-brand-hovered);
  /* legacy aliases — keep old classes working until Task 8 sweep */
  --color-brand: var(--ds-brand);
  --color-brand-hover: var(--ds-brand-hovered);
  --color-text: var(--ds-text);
  --color-text-subtle: var(--ds-text-subtle);
  --color-background: var(--ds-surface-sunken);
  --color-border: var(--ds-border);
  --color-danger: var(--ds-danger);
  --color-success: var(--ds-success);
  --color-warning: var(--ds-warning);
  --radius-ds: 3px;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
}

body {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--ds-text);
  background: var(--ds-surface-sunken);
}
```
Note: `--color-surface` doubles as new token; any legacy `bg-surface` usage keeps identical light value.

- [ ] **Step 4: `components/theme/ThemeScript.tsx`** (no-flash inline script)

```tsx
export function ThemeScript() {
  const code = `(function(){try{var m=document.cookie.match(/(?:^|; )trackly-theme=([^;]*)/);var p=m?decodeURIComponent(m[1]):"system";if(p!=="light"&&p!=="dark")p=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",p);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
```

- [ ] **Step 5: Update `app/layout.tsx`** — read cookie server-side, set initial attribute, include script:

```tsx
import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseThemeCookie, THEME_COOKIE } from "@/lib/theme";
import { ThemeScript } from "@/components/theme/ThemeScript";

export const metadata: Metadata = { title: "Trackly", description: "Project tracking for teams" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pref = parseThemeCookie((await cookies()).get(THEME_COOKIE)?.value);
  const attr = pref === "system" ? undefined : pref;
  return (
    <html lang="en" {...(attr ? { "data-theme": attr } : {})} suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verify** — `npm test` PASS, `npx tsc --noEmit` clean, `PORT=3001 npm run dev` boots and existing pages render unchanged in light theme; manually set `document.documentElement.dataset.theme="dark"` in devtools console → page shifts dark (chrome-less pages will be partially themed; full sweep is Task 8).

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(v2): ADS dual-theme token system with SSR-safe theme cookie"`

---

### Task 2: Star model + theme/star server actions

**Files:**
- Modify: `prisma/schema.prisma` (add model + relations), `lib/theme.ts`
- Create: `app/(app)/chrome-actions.ts`, `lib/stars.ts`, `lib/stars.test.ts`

**Interfaces:**
- Produces: Prisma `Star { id, userId, projectId, createdAt }` with `@@unique([userId, projectId])`, relations `User.stars`, `Project.stars` (onDelete Cascade both).
- Produces: `toggleStar(userId, projectId): Promise<{ starred: boolean }>` in `lib/stars.ts`; server actions `setThemeAction(pref: ThemePref)` (sets cookie, 1yr, path=/), `toggleStarAction(projectId: string)` in `app/(app)/chrome-actions.ts`; `getChromeData(userId)` in `lib/stars.ts` returning `{ projects: { id, key, name }[], starredProjectIds: string[] }`.

- [ ] **Step 1: Failing test `lib/stars.test.ts`** (mock prisma as in `lib/invites.test.ts` pattern)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    star: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    project: { findMany: vi.fn() },
    star_findMany: vi.fn(),
  },
}));
import { prisma } from "./prisma";
import { toggleStar } from "./stars";

beforeEach(() => vi.clearAllMocks());

describe("toggleStar", () => {
  it("creates star when absent", async () => {
    (prisma.star.findUnique as any).mockResolvedValue(null);
    (prisma.star.create as any).mockResolvedValue({ id: "s1" });
    expect(await toggleStar("u1", "p1")).toEqual({ starred: true });
    expect(prisma.star.create).toHaveBeenCalledWith({ data: { userId: "u1", projectId: "p1" } });
  });
  it("deletes star when present", async () => {
    (prisma.star.findUnique as any).mockResolvedValue({ id: "s1" });
    (prisma.star.delete as any).mockResolvedValue({});
    expect(await toggleStar("u1", "p1")).toEqual({ starred: false });
  });
});
```
Run → FAIL.

- [ ] **Step 2: Schema + migration** — add to `prisma/schema.prisma` (and back-relations `stars Star[]` on User and Project):

```prisma
model Star {
  id        String   @id @default(cuid())
  userId    String
  projectId String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@unique([userId, projectId])
}
```
Run: `npx prisma migrate dev --name star_model` → applied.

- [ ] **Step 3: Implement `lib/stars.ts`**

```ts
import { prisma } from "./prisma";

export async function toggleStar(userId: string, projectId: string) {
  const existing = await prisma.star.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (existing) {
    await prisma.star.delete({ where: { userId_projectId: { userId, projectId } } });
    return { starred: false };
  }
  await prisma.star.create({ data: { userId, projectId } });
  return { starred: true };
}

export async function getChromeData(userId: string) {
  const memberships = await prisma.membership.findMany({ where: { userId }, select: { siteId: true } });
  const siteIds = memberships.map((m) => m.siteId);
  const projects = await prisma.project.findMany({
    where: { siteId: { in: siteIds } },
    select: { id: true, key: true, name: true },
    orderBy: { name: "asc" },
  });
  const stars = await prisma.star.findMany({ where: { userId }, select: { projectId: true } });
  return { projects, starredProjectIds: stars.map((s) => s.projectId) };
}
```
(Adapt the `Project` field selection if v1 schema differs — read `prisma/schema.prisma` model Project first; `key` and `name` exist.)
Run `npm test` → PASS (mock `prisma.star.findMany`/`membership.findMany`/`project.findMany` additions may be needed for typecheck only; the two toggle tests are the gate).

- [ ] **Step 4: `app/(app)/chrome-actions.ts`**

```ts
"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { THEME_COOKIE, type ThemePref, parseThemeCookie } from "@/lib/theme";
import { toggleStar } from "@/lib/stars";

export async function setThemeAction(pref: ThemePref) {
  (await cookies()).set(THEME_COOKIE, parseThemeCookie(pref), {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
  });
}

export async function toggleStarAction(projectId: string) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { starred: false };
  const res = await toggleStar(userId, projectId);
  revalidatePath("/", "layout");
  return res;
}
```

- [ ] **Step 5: Verify + commit** — `npm test && npx tsc --noEmit` clean. `git add -A && git commit -m "feat(v2): Star model, chrome server actions (theme cookie, star toggle)"`

---

### Task 3: TopBar component

**Files:**
- Create: `components/chrome/TopBar.tsx`, `components/chrome/SettingsMenu.tsx`, `components/chrome/TopBar.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `Tooltip`, existing `NotificationBell`, existing `UserMenu` (read `components/nav/UserMenu.tsx` for its props and reuse as-is).
- Produces: `TopBar({ user, onToggleSidebar, onOpenPalette, onOpenCreate }: { user: { name: string; email: string; avatarUrl: string | null }; onToggleSidebar(): void; onOpenPalette(): void; onOpenCreate(): void })`. 48px tall, `bg-surface`, bottom `border-default`.

- [ ] **Step 1: Failing test `components/chrome/TopBar.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "./TopBar";

const user = { name: "V D", email: "v@u.com", avatarUrl: null };
const noop = () => {};

it("renders logo, search, create, and fires callbacks", async () => {
  const onOpenPalette = vi.fn();
  const onOpenCreate = vi.fn();
  const onToggleSidebar = vi.fn();
  render(<TopBar user={user} onToggleSidebar={onToggleSidebar} onOpenPalette={onOpenPalette} onOpenCreate={onOpenCreate} />);
  expect(screen.getByText("Trackly")).toBeInTheDocument();
  await userEvent.click(screen.getByPlaceholderText("Search"));
  expect(onOpenPalette).toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Create" }));
  expect(onOpenCreate).toHaveBeenCalled();
  await userEvent.click(screen.getByLabelText("Toggle sidebar"));
  expect(onToggleSidebar).toHaveBeenCalled();
});
```
Run → FAIL. (NotificationBell/UserMenu may need session mocks — if they fetch, render them behind a `hideRemote` prop default false and pass `hideRemote` in the test; keep the prop out of the interface docs.)

- [ ] **Step 2: Implement `components/chrome/TopBar.tsx`**

```tsx
"use client";
import Link from "next/link";
import { Menu, Search, HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { NotificationBell } from "@/components/nav/NotificationBell";
import { UserMenu } from "@/components/nav/UserMenu";
import { SettingsMenu } from "./SettingsMenu";

export type ChromeUser = { name: string; email: string; avatarUrl: string | null };

export function TopBar({ user, onToggleSidebar, onOpenPalette, onOpenCreate, hideRemote = false }: {
  user: ChromeUser; onToggleSidebar(): void; onOpenPalette(): void; onOpenCreate(): void; hideRemote?: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border-default bg-surface px-3">
      <Tooltip content="Toggle sidebar">
        <button aria-label="Toggle sidebar" onClick={onToggleSidebar} className="rounded-ds p-1.5 hover:bg-neutral-hovered">
          <Menu size={18} className="text-subtle" />
        </button>
      </Tooltip>
      <Link href="/your-work" className="mr-2 flex items-center gap-1.5 px-1 text-[15px] font-bold text-brand">
        Trackly
      </Link>
      <div className="relative mx-auto w-full max-w-195">
        <Search size={14} className="absolute top-2 left-2.5 text-subtlest" />
        <input
          placeholder="Search"
          readOnly
          onClick={onOpenPalette}
          onFocus={onOpenPalette}
          className="h-8 w-full cursor-pointer rounded-[5px] border border-border-default bg-surface pl-8 text-sm outline-none hover:bg-neutral"
        />
      </div>
      <button onClick={onOpenCreate}
        className="flex h-8 items-center rounded-ds bg-brand px-3 text-sm font-medium text-white hover:bg-brand-hovered">
        Create
      </button>
      {!hideRemote && <NotificationBell />}
      <Tooltip content="Help"><button aria-label="Help" className="rounded-full p-1.5 hover:bg-neutral-hovered"><HelpCircle size={18} className="text-subtle" /></button></Tooltip>
      <SettingsMenu />
      {!hideRemote && <UserMenu user={user} />}
    </header>
  );
}
```
Adapt `NotificationBell`/`UserMenu` imports+props to their real v1 signatures (read the files; wrap if needed). If `UserMenu` expects `NavUser`, it is the same shape as `ChromeUser`.

- [ ] **Step 3: `components/chrome/SettingsMenu.tsx`** — Radix dropdown with three theme options calling `setThemeAction` then setting `document.documentElement.dataset.theme` immediately (resolve `system` via `matchMedia`):

```tsx
"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Settings } from "lucide-react";
import { setThemeAction } from "@/app/(app)/chrome-actions";
import type { ThemePref } from "@/lib/theme";

const options: { label: string; value: ThemePref }[] = [
  { label: "Light", value: "light" }, { label: "Dark", value: "dark" }, { label: "Match system", value: "system" },
];

export function SettingsMenu() {
  async function choose(pref: ThemePref) {
    const resolved = pref === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : pref;
    document.documentElement.setAttribute("data-theme", resolved);
    await setThemeAction(pref);
  }
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button aria-label="Settings" className="rounded-full p-1.5 hover:bg-neutral-hovered"><Settings size={18} className="text-subtle" /></button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={4} className="z-50 min-w-45 rounded-ds border border-border-default bg-surface-overlay py-1 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25)]">
          <p className="px-4 py-1 text-[11px] font-bold tracking-wide text-subtlest uppercase">Theme</p>
          {options.map((o) => (
            <DM.Item key={o.value} onSelect={() => choose(o.value)}
              className="cursor-pointer px-4 py-1.5 text-sm text-default outline-none data-[highlighted]:bg-neutral-hovered">
              {o.label}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
```

- [ ] **Step 4: Verify + commit** — tests PASS, tsc clean. `git commit -m "feat(v2): TopBar with palette trigger, create, settings/theme menu"`

---

### Task 4: GlobalSidebar + AppShell + layout integration

**Files:**
- Create: `components/chrome/GlobalSidebar.tsx`, `components/chrome/AppShell.tsx`, `components/chrome/GlobalSidebar.test.tsx`
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `getChromeData` (Task 2), `TopBar` (Task 3), `toggleStarAction`.
- Produces: `GlobalSidebar({ projects, starredProjectIds, collapsed })` — nav sections per spec §Chrome layout (Your work, Recent from localStorage key `trackly-recent-projects` JSON array of keys, Starred, Projects + "View all projects", Filters, Dashboards, Teams stub, Plans disabled). Active route detection via `usePathname()`; active item gets `bg-selected text-selected` + 2px left brand indicator.
- Produces: `AppShell({ user, projects, starredProjectIds, children })` — client component: state `sidebarCollapsed` (localStorage `trackly-sidebar-collapsed`), palette open state (placeholder until Task 6 — render nothing), create open state (renders existing global create, see Step 4), composes TopBar + GlobalSidebar + `<main className="flex-1 overflow-auto">{children}</main>`.
- `app/(app)/layout.tsx` becomes: auth guard (unchanged) → `getChromeData(userId)` → `<AppShell …>{children}</AppShell>`. Old `TopNav` import removed (file deleted in Task 5).

- [ ] **Step 1: Failing test `GlobalSidebar.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { GlobalSidebar } from "./GlobalSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboards" }));

const projects = [{ id: "p1", key: "TRK", name: "Trackly Core" }];

it("renders sections and marks active route", () => {
  render(<GlobalSidebar projects={projects} starredProjectIds={[]} collapsed={false} />);
  for (const label of ["Your work", "Projects", "Filters", "Dashboards", "Plans"]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  expect(screen.getByText("Trackly Core")).toBeInTheDocument();
  expect(screen.getByText("Dashboards").closest("a")).toHaveClass("bg-selected");
});

it("renders nothing when collapsed", () => {
  const { container } = render(<GlobalSidebar projects={projects} starredProjectIds={[]} collapsed />);
  expect(container.querySelector("nav")).toBeNull();
});
```
Run → FAIL.

- [ ] **Step 2: Implement `GlobalSidebar.tsx`** — sections as spec; item component:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, Clock, Star, Folder, Filter, LayoutDashboard, Users, Map } from "lucide-react";

type Proj = { id: string; key: string; name: string };

function Item({ href, label, icon: Icon, disabled, title }: {
  href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; disabled?: boolean; title?: string;
}) {
  const pathname = usePathname();
  const active = !disabled && (pathname === href || (href !== "/your-work" && pathname.startsWith(href)));
  if (disabled) {
    return (
      <span title={title} className="flex cursor-not-allowed items-center gap-3 rounded-ds px-3 py-1.5 text-sm text-subtlest opacity-60">
        <Icon size={16} /> {label}
      </span>
    );
  }
  return (
    <Link href={href}
      className={`relative flex items-center gap-3 rounded-ds px-3 py-1.5 text-sm ${active ? "bg-selected text-selected-text before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded before:bg-brand" : "text-default hover:bg-neutral-hovered"}`}>
      <Icon size={16} /> {label}
    </Link>
  );
}

export function GlobalSidebar({ projects, starredProjectIds, collapsed }: {
  projects: Proj[]; starredProjectIds: string[]; collapsed: boolean;
}) {
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  useEffect(() => {
    try { setRecentKeys(JSON.parse(localStorage.getItem("trackly-recent-projects") ?? "[]")); } catch { /* ignore */ }
  }, []);
  if (collapsed) return null;
  const starred = projects.filter((p) => starredProjectIds.includes(p.id));
  const recent = recentKeys.map((k) => projects.find((p) => p.key === k)).filter(Boolean) as Proj[];
  return (
    <nav className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border-default bg-surface px-2 py-3">
      <div className="flex flex-col gap-0.5">
        <Item href="/your-work" label="Your work" icon={Briefcase} />
      </div>
      {recent.length > 0 && (
        <Section title="Recent" icon={Clock}>
          {recent.slice(0, 5).map((p) => <Item key={p.id} href={`/projects/${p.key}`} label={p.name} icon={Folder} />)}
        </Section>
      )}
      {starred.length > 0 && (
        <Section title="Starred" icon={Star}>
          {starred.map((p) => <Item key={p.id} href={`/projects/${p.key}`} label={p.name} icon={Folder} />)}
        </Section>
      )}
      <Section title="Projects" icon={Folder}>
        {projects.map((p) => <Item key={p.id} href={`/projects/${p.key}`} label={p.name} icon={Folder} />)}
        <Item href="/projects" label="View all projects" icon={Folder} />
      </Section>
      <div className="flex flex-col gap-0.5">
        <Item href="/filters/search" label="Filters" icon={Filter} />
        <Item href="/dashboards" label="Dashboards" icon={LayoutDashboard} />
        <Item href="/teams" label="Teams" icon={Users} disabled title="Coming soon" />
        <Item href="/plans" label="Plans" icon={Map} disabled title="Coming in V2-8" />
      </div>
    </nav>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number }>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="flex items-center gap-2 px-3 py-1 text-[11px] font-bold tracking-wide text-subtlest uppercase"><Icon size={12} /> {title}</p>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Implement `AppShell.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";
import { TopBar, type ChromeUser } from "./TopBar";
import { GlobalSidebar } from "./GlobalSidebar";

type Proj = { id: string; key: string; name: string };

export function AppShell({ user, projects, starredProjectIds, children }: {
  user: ChromeUser; projects: Proj[]; starredProjectIds: string[]; children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem("trackly-sidebar-collapsed") === "1");
  }, []);
  function toggleSidebar() {
    setCollapsed((c) => { localStorage.setItem("trackly-sidebar-collapsed", c ? "0" : "1"); return !c; });
  }
  return (
    <div className="flex h-screen flex-col">
      <TopBar user={user} onToggleSidebar={toggleSidebar} onOpenPalette={() => setPaletteOpen(true)} onOpenCreate={() => setCreateOpen(true)} />
      <div className="flex min-h-0 flex-1">
        <GlobalSidebar projects={projects} starredProjectIds={starredProjectIds} collapsed={collapsed} />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
      {/* palette mounts in Task 6; create wiring in Step 4 of Task 4 */}
      {createOpen && <GlobalCreate onClose={() => setCreateOpen(false)} projects={projects} />}
      {paletteOpen && null}
    </div>
  );
}
```

- [ ] **Step 4: `GlobalCreate`** — read `components/issues/CreateIssueModal.tsx` first. If it already accepts a project (key or id) prop and renders a Radix Dialog, implement `GlobalCreate` in `AppShell.tsx`'s file (or `components/chrome/GlobalCreate.tsx` if >40 lines) as a thin wrapper: project `<select>` from `projects` defaulting to first, then render `CreateIssueModal` for the chosen project with `open` controlled. If `CreateIssueModal`'s contract can't support this without modification, report DONE_WITH_CONCERNS describing its actual props — do NOT modify the modal.

- [ ] **Step 5: Rewrite `app/(app)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getChromeData } from "@/lib/stars";
import { AppShell } from "@/components/chrome/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user as { id?: string; name?: string; email?: string; image?: string };
  const { projects, starredProjectIds } = await getChromeData(u.id ?? "");
  return (
    <AppShell
      user={{ name: u.name ?? "", email: u.email ?? "", avatarUrl: u.image ?? null }}
      projects={projects}
      starredProjectIds={starredProjectIds}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 6: Verify** — `npm test` PASS, tsc clean, dev server: all main routes render inside new chrome; no import errors from removed TopNav usage (TopNav file still exists until Task 5 — layout just stops using it).

- [ ] **Step 7: Commit** — `git commit -m "feat(v2): global sidebar, AppShell, new chrome layout"`

---

### Task 5: ProjectNav rail + project page migration + delete old nav

**Files:**
- Create: `components/chrome/ProjectNav.tsx`, `components/chrome/ProjectNav.test.tsx`, `app/(app)/projects/[key]/layout.tsx`
- Delete: `components/nav/TopNav.tsx`, `components/nav/Sidebar.tsx` (after all imports migrated — grep first)

**Interfaces:**
- Produces: `ProjectNav({ projectKey, projectName })` — 240px rail: project header (2-letter key avatar, name, "Software project"), items Board `/projects/[key]/board`, Backlog `/projects/[key]/backlog`, Timeline (disabled, "Coming in V2-8"), Reports `/projects/[key]/reports`, Issues `/projects/[key]`, Settings `/projects/[key]/settings`. Active styling identical to GlobalSidebar Item. Collapsible (chevron, localStorage `trackly-projectnav-collapsed`).
- Produces: `app/(app)/projects/[key]/layout.tsx` — fetches project name by key (read `lib/projects.ts` for existing fetch helper; use it), renders `<div className="flex h-full"><ProjectNav …/><div className="min-w-0 flex-1 overflow-auto">{children}</div></div>`. Also records the visit: small client component `RecentTracker({ projectKey })` inside the layout pushes key to localStorage `trackly-recent-projects` (dedupe, max 5, most-recent first).

- [ ] **Step 1: Failing test** — same pattern as GlobalSidebar test: renders items, marks active via mocked `usePathname() => "/projects/TRK/board"`, Timeline disabled.

```tsx
import { render, screen } from "@testing-library/react";
import { ProjectNav } from "./ProjectNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/projects/TRK/board" }));

it("renders project header, items, active board, disabled timeline", () => {
  render(<ProjectNav projectKey="TRK" projectName="Trackly Core" />);
  expect(screen.getByText("Trackly Core")).toBeInTheDocument();
  expect(screen.getByText("Board").closest("a")).toHaveClass("bg-selected");
  expect(screen.getByText("Timeline").closest("span")).toHaveClass("cursor-not-allowed");
});
```

- [ ] **Step 2: Implement ProjectNav + RecentTracker** (RecentTracker: `"use client"`, `useEffect` writing localStorage, returns null). ProjectNav reuses the Item/Section pattern from GlobalSidebar — import `Item`/`Section` by EXPORTING them from `GlobalSidebar.tsx` rather than duplicating.

- [ ] **Step 3: Project layout** — implement `app/(app)/projects/[key]/layout.tsx` per interface. `params` is a Promise in Next 15: `const { key } = await params;`.

- [ ] **Step 3b: Star toggle UI** — in the ProjectNav project header add a star icon button (`Star` from lucide, filled `text-warning-token` when starred, outline `text-subtlest` otherwise) calling `toggleStarAction(projectId)` with optimistic local state. ProjectNav therefore also receives `projectId: string` and `initiallyStarred: boolean` props — layout fetches starred state via `getChromeData` values already loaded in the app layout? No — simpler: layout queries `prisma.star.findUnique` directly server-side and passes the boolean. Update the Task 5 test accordingly (`projectId="p1" initiallyStarred={false}` props added; assert star button present via `aria-label="Star project"`).

- [ ] **Step 4: Migrate + delete** — `grep -rn "nav/TopNav\|nav/Sidebar" app components` → update every remaining import to new chrome equivalents or remove; project pages that rendered old `Sidebar` themselves get it removed (layout provides ProjectNav now). Delete both old files. `grep` again → zero hits.

- [ ] **Step 5: Verify** — tests PASS, tsc clean, dev: project board/backlog/reports/settings pages show rail + correct active item; non-project pages unaffected.

- [ ] **Step 6: Commit** — `git commit -m "feat(v2): project nav rail, recent tracking, remove v1 nav"`

---

### Task 6: Shortcut framework + help modal + command palette

**Files:**
- Create: `lib/shortcuts.ts`, `lib/shortcuts.test.ts`, `components/chrome/ShortcutsHelp.tsx`, `components/chrome/CommandPalette.tsx`, `components/chrome/CommandPalette.test.tsx`
- Modify: `components/chrome/AppShell.tsx`

**Interfaces:**
- Produces: `matchShortcut(e: { key, metaKey, ctrlKey, target }, binding: string, pending: string | null): { match: boolean; pending: string | null }` pure helper in `lib/shortcuts.ts` — bindings: single key `"c"`, sequence `"g d"`, chord `"mod+k"`. `isEditableTarget(t: EventTarget | null): boolean`. React hook `useShortcuts(map: Record<string, () => void>)` wiring window keydown with 1s sequence timeout.
- Produces: `CommandPalette({ open, onOpenChange, projects, onCreateIssue, onSetTheme })` — Radix Dialog, input, grouped results: Actions (Create issue, Toggle theme, Go to Your work/Projects/Filters/Dashboards), Projects (fuzzy by name/key), Issues (live: call existing quick-search server action — read `app/(app)/search/actions.ts` for its exact export and reuse; debounce 200ms). Arrow-key selection, Enter navigates (use `useRouter()`), Esc closes. Recent searches: localStorage `trackly-recent-searches` (max 5, shown when query empty).
- AppShell wires: `useShortcuts({ "mod+k": openPalette, "c": openCreate, "/": openPalette, "?": openHelp, "g d": () => router.push("/dashboards"), "g p": () => router.push("/projects"), "g y": () => router.push("/your-work"), "\\": toggleTheme })`; mounts palette + help modal.

- [ ] **Step 1: Failing tests `lib/shortcuts.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { matchShortcut, isEditableTarget } from "./shortcuts";

const ev = (key: string, mod = false) => ({ key, metaKey: mod, ctrlKey: false, target: null });

describe("matchShortcut", () => {
  it("matches single key", () => {
    expect(matchShortcut(ev("c"), "c", null)).toEqual({ match: true, pending: null });
  });
  it("matches mod+k chord", () => {
    expect(matchShortcut(ev("k", true), "mod+k", null)).toEqual({ match: true, pending: null });
    expect(matchShortcut(ev("k"), "mod+k", null).match).toBe(false);
  });
  it("handles two-key sequence via pending state", () => {
    const first = matchShortcut(ev("g"), "g d", null);
    expect(first).toEqual({ match: false, pending: "g" });
    expect(matchShortcut(ev("d"), "g d", "g")).toEqual({ match: true, pending: null });
    expect(matchShortcut(ev("x"), "g d", "g")).toEqual({ match: false, pending: null });
  });
});

describe("isEditableTarget", () => {
  it("true for input elements", () => {
    const input = document.createElement("input");
    expect(isEditableTarget(input)).toBe(true);
  });
  it("false for body", () => {
    expect(isEditableTarget(document.body)).toBe(false);
  });
});
```
Run → FAIL.

- [ ] **Step 2: Implement `lib/shortcuts.ts`**

```ts
import { useEffect, useRef } from "react";

export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable;
}

type KeyEvent = { key: string; metaKey: boolean; ctrlKey: boolean; target: EventTarget | null };

export function matchShortcut(e: KeyEvent, binding: string, pending: string | null): { match: boolean; pending: string | null } {
  const mod = e.metaKey || e.ctrlKey;
  if (binding.startsWith("mod+")) {
    return { match: mod && e.key.toLowerCase() === binding.slice(4), pending: null };
  }
  if (mod) return { match: false, pending: null };
  const parts = binding.split(" ");
  if (parts.length === 2) {
    if (pending === parts[0]) return { match: e.key === parts[1], pending: null };
    if (e.key === parts[0]) return { match: false, pending: parts[0] };
    return { match: false, pending: null };
  }
  return { match: e.key === binding, pending: null };
}

export function useShortcuts(map: Record<string, () => void>) {
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditableTarget(e.target) && !(e.metaKey || e.ctrlKey)) return;
      for (const [binding, fn] of Object.entries(map)) {
        const res = matchShortcut(e, binding, pendingRef.current);
        if (res.match) {
          e.preventDefault();
          pendingRef.current = null;
          fn();
          return;
        }
        if (res.pending) {
          pendingRef.current = res.pending;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => { pendingRef.current = null; }, 1000);
          return;
        }
      }
      pendingRef.current = null;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map]);
}
```
Run → PASS.

- [ ] **Step 3: `CommandPalette.tsx` + test** — test: renders input when open; typing filters project list; Actions group shows "Create issue". Implementation: Radix Dialog with `bg-surface-overlay` panel (640px wide, top-aligned 120px from top), sections per interface; issue search wired to the real quick-search action (read its signature first; if it's not callable client-side as a server action, add a thin `"use server"` re-export in `app/(app)/chrome-actions.ts`). Keep component under ~220 lines; extract `PaletteItem` row component.

- [ ] **Step 4: `ShortcutsHelp.tsx`** — Radix Dialog listing all bindings in a two-column table (`?` opens; Esc closes). Static content.

- [ ] **Step 5: Wire AppShell** — add `useShortcuts` map per interface; mount `CommandPalette` and `ShortcutsHelp`; `toggleTheme` flips current `data-theme` and calls `setThemeAction`. Replace the `{paletteOpen && null}` placeholder.

- [ ] **Step 6: Verify + commit** — all tests PASS, tsc clean; manual: Cmd+K opens palette, `g d` navigates, `c` opens create, `?` help. `git commit -m "feat(v2): shortcut framework, command palette, shortcuts help"`

---

### Task 7: Token sweep — dark-mode-correct every existing surface (haiku)

**Files:**
- Modify: every file under `app/` and `components/` still using legacy raw hexes or legacy token classes (`grep -rn "#EBECF0\|#DEEBFF\|#F4F5F7\|#FFEBE6\|#E3FCEF\|#172B4D\|#0052CC\|bg-\[#\|text-\[#\|border-\[#" app components --include="*.tsx"`)

**Interfaces:**
- Consumes: token classes from Task 1.
- Mapping rules (apply mechanically): `#F4F5F7`/`bg-[#F4F5F7]` → `bg-neutral` (when used as hover/fill) or `bg-surface-sunken` (page background); `#EBECF0` hover fills → `bg-neutral-hovered`; `#DEEBFF` → `bg-selected` (+ text → `text-selected-text`; NEVER bare `text-selected` — it resolves to the fill color); raw `#172B4D` text → `text-default`; `#0052CC` → `text-brand`/`bg-brand` (token now resolves to `#0C66E4`); `#FFEBE6` → `bg-danger/10` equivalent — use `bg-[color-mix(in_srgb,var(--ds-danger)_15%,transparent)]`? NO — keep simple: Tag colors switch to `bg-neutral text-default` (gray), `bg-selected text-selected` (blue), success/danger tags use `text-success`/`text-danger` (legacy-named classes now resolving to `--ds-*` values) on `bg-neutral`. Shadows `rgba(9,30,66,…)` stay as-is (acceptable both themes).
- Legacy alias tokens keep old class names compiling; this task moves usages to the new names so dark values apply everywhere.

- [ ] **Step 1:** Run the grep above; list files. For each file apply mapping rules; do not change any logic, props, or structure — class strings only.
- [ ] **Step 2:** After sweep, rerun grep → only intentional remnants (shadows) remain. `npm test` PASS (Button test asserts `bg-brand` — still valid; Task 3 v1 Button test asserting `bg-[#F4F5F7]` must be updated to `bg-neutral` as part of this task), tsc clean.
- [ ] **Step 3:** Manual dark check: dev server, toggle dark, visit your-work, projects, board, backlog, issue view, dashboards, reports, settings, login — no white flashes, no unreadable text.
- [ ] **Step 4: Commit** — `git commit -m "refactor(v2): re-token all surfaces for dual-theme"`

---

### Task 8: Playwright chrome e2e

**Files:**
- Create: `e2e/chrome.spec.ts`
- Modify (only if needed): `playwright.config.ts` (ensure baseURL port matches dev server; use `PORT=3001` in webServer command and baseURL `http://localhost:3001`)

- [ ] **Step 1: `e2e/chrome.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

const email = `chrome-${Date.now()}@test.dev`;

test.beforeAll(async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/signup");
  await page.getByPlaceholder("Full name").fill("Chrome User");
  await page.getByPlaceholder("Work email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill("password123");
  await page.getByPlaceholder("Site name (e.g. your company)").fill("Chrome Site");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/your-work/);
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter password").fill("password123");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/your-work/);
}

test("chrome renders with sidebar and topbar", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Trackly")).toBeVisible();
  await expect(page.getByText("Your work")).toBeVisible();
  await expect(page.getByText("Dashboards")).toBeVisible();
});

test("command palette opens and navigates", async ({ page }) => {
  await login(page);
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
  await expect(page.getByPlaceholder(/Search or jump/i)).toBeVisible();
  await page.getByText("Go to Dashboards").click();
  await expect(page).toHaveURL(/\/dashboards/);
});

test("theme toggle persists across reload", async ({ page }) => {
  await login(page);
  await page.getByLabel("Settings").click();
  await page.getByText("Dark", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("sidebar collapse persists", async ({ page }) => {
  await login(page);
  await page.getByLabel("Toggle sidebar").click();
  await expect(page.getByText("Dashboards")).not.toBeVisible();
  await page.reload();
  await expect(page.getByText("Dashboards")).not.toBeVisible();
});
```
Adjust palette placeholder text to the real one implemented in Task 6 if it differs.

- [ ] **Step 2:** Run `npx playwright test e2e/chrome.spec.ts` → all pass. Then full `npx playwright test` → pre-existing suites still green (fix locator drift caused by chrome change — old tests referencing TopNav elements must be updated to new chrome equivalents; do not weaken assertions).
- [ ] **Step 3: Commit** — `git commit -m "test(v2): chrome e2e — palette, theme, sidebar persistence"`

---

### Task 9: Fidelity pass vs real Jira (controller-led, NOT a subagent task)

- [ ] **Step 1:** Controller (main session) opens Trackly + user's Jira side-by-side in browser; compares TopBar metrics, sidebar spacing/typography, palette layout, dark palette, active states. Requests user screenshots where access needed.
- [ ] **Step 2:** File concrete diffs as fix list; dispatch one fix subagent if needed; re-verify.
- [ ] **Step 3:** Update ledger; commit any fixes as `fix(v2): fidelity adjustments to chrome`.
