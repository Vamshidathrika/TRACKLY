# Trackly Phase 1: Foundation + Jira Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold Trackly (Jira Cloud replica) with auth, org model, and pixel-faithful app shell.

**Architecture:** Next.js 15 App Router monolith; Postgres 16 in Docker; Prisma ORM; NextAuth v5 (credentials + Google); Tailwind v4 design tokens mirroring Atlassian Design System; custom Radix-based primitives.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 6, NextAuth v5 (beta), Tailwind CSS v4, Radix UI, bcryptjs, zod, Vitest + Testing Library, Playwright.

## Global Constraints

- Repo root: `/Users/nani/Downloads/trackly`. All paths below relative to it.
- Product name is **Trackly** everywhere. NEVER use "Jira", Atlassian logos, or Atlassian artwork in product code/copy.
- Design tokens (exact values from spec): brand `#0052CC`, brand-hover `#0747A6`, text `#172B4D`, text-subtle `#6B778C`, surface `#FFFFFF`, background `#F4F5F7`, border `#DFE1E6`, danger `#DE350B`, success `#00875A`, warning `#FF991F`; radius `3px`; 8px spacing grid; system font stack; 14px base font.
- TDD: every task writes failing test first where a testable unit exists.
- Commit after every task (messages below). `npx tsc --noEmit` must stay clean.
- Model economy (session rule): execute tasks with subagent `model: "sonnet"` unless task says otherwise; mechanical steps may use `haiku`.
- Auth rule: never log passwords; bcrypt cost 10; login errors always generic "Invalid email or password".

---

### Task 1: Scaffold app, Tailwind tokens, Docker Postgres

**Files:**
- Create: entire Next.js scaffold at repo root, `docker-compose.yml`, `.env`, `.env.example`, edit `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Produces: running dev server; Tailwind theme tokens `brand, brand-hover, text, text-subtle, surface, background, border, danger, success, warning`, radius token `ds`; Postgres on `localhost:5432` db `trackly`.

- [ ] **Step 1: Scaffold Next.js into existing repo**

```bash
cd /Users/nani/Downloads/trackly
npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir=false --import-alias "@/*" --use-npm --yes
```
(Existing `docs/` and `.git/` are preserved; answer overwrite prompts with keep/merge if asked.)

- [ ] **Step 2: Replace `app/globals.css` with token theme**

```css
@import "tailwindcss";

@theme {
  --color-brand: #0052CC;
  --color-brand-hover: #0747A6;
  --color-text: #172B4D;
  --color-text-subtle: #6B778C;
  --color-surface: #FFFFFF;
  --color-background: #F4F5F7;
  --color-border: #DFE1E6;
  --color-danger: #DE350B;
  --color-success: #00875A;
  --color-warning: #FF991F;
  --radius-ds: 3px;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
}

body {
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--color-text);
  background: var(--color-background);
}
```

- [ ] **Step 3: Simplify `app/layout.tsx` and `app/page.tsx`**

`app/layout.tsx`:
```tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trackly", description: "Project tracking for teams" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/your-work");
}
```

- [ ] **Step 4: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: trackly
      POSTGRES_PASSWORD: trackly
      POSTGRES_DB: trackly
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- [ ] **Step 5: Create `.env` and `.env.example` (same content for now)**

```bash
DATABASE_URL="postgresql://trackly:trackly@localhost:5432/trackly"
AUTH_SECRET="dev-secret-change-me"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
```
Append `.env` to `.gitignore` if scaffold didn't.

- [ ] **Step 6: Verify**

Run: `docker compose up -d && npm run dev &` then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/your-work`
Expected: `404` (route not built yet) — server up, no build errors. Kill dev server after.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js app with Trackly design tokens and Postgres"
```

---

### Task 2: Prisma schema + client + Vitest setup

**Files:**
- Create: `prisma/schema.prisma`, `lib/prisma.ts`, `vitest.config.ts`, `lib/slug.ts`, `lib/slug.test.ts`

**Interfaces:**
- Produces: models `User`, `Site`, `Membership` (enum `Role { ADMIN MEMBER }`), `Invite`; `prisma` singleton export from `lib/prisma.ts`; `makeSlug(name: string): string` (lowercase, hyphenated, 6-char random suffix).

- [ ] **Step 1: Install deps**

```bash
npm i prisma @prisma/client && npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role { ADMIN MEMBER }

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  name         String
  passwordHash String?
  avatarUrl    String?
  createdAt    DateTime     @default(now())
  memberships  Membership[]
}

model Site {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  createdAt   DateTime     @default(now())
  memberships Membership[]
  invites     Invite[]
}

model Membership {
  id        String   @id @default(cuid())
  userId    String
  siteId    String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  site      Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  @@unique([userId, siteId])
}

model Invite {
  id         String    @id @default(cuid())
  siteId     String
  email      String
  token      String    @unique
  role       Role      @default(MEMBER)
  expiresAt  DateTime
  acceptedAt DateTime?
  createdAt  DateTime  @default(now())
  site       Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: Migrate**

Run: `npx prisma migrate dev --name init`
Expected: migration applied, client generated.

- [ ] **Step 4: Create `lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, include: ["**/*.test.{ts,tsx}"] },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
```
Add script to `package.json`: `"test": "vitest run"`.

- [ ] **Step 6: Failing test `lib/slug.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { makeSlug } from "./slug";

describe("makeSlug", () => {
  it("lowercases, hyphenates, strips symbols, adds 6-char suffix", () => {
    const slug = makeSlug("USK Corp!! Site");
    expect(slug).toMatch(/^usk-corp-site-[a-z0-9]{6}$/);
  });
  it("is unique across calls", () => {
    expect(makeSlug("Team")).not.toBe(makeSlug("Team"));
  });
});
```
Run: `npm test` — Expected: FAIL (module not found).

- [ ] **Step 7: Implement `lib/slug.ts`**

```ts
export function makeSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `${base}-${suffix}`;
}
```
Run: `npm test` — Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: Prisma schema (User/Site/Membership/Invite), client singleton, vitest"
```

---

### Task 3: UI primitives (Button, Input, Tag, Avatar, Spinner)

**Files:**
- Create: `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/Tag.tsx`, `components/ui/Avatar.tsx`, `components/ui/Spinner.tsx`, `components/ui/Button.test.tsx`, `components/ui/Avatar.test.tsx`, `test/setup.ts`

**Interfaces:**
- Produces: `Button({ appearance?: "primary"|"default"|"subtle"|"danger", ...buttonProps })`; `Input(props: InputHTMLAttributes & { label?: string; error?: string })`; `Tag({ children, color?: "gray"|"blue"|"green"|"red" })`; `Avatar({ name, src?, size?: 24|32 })` shows image or initials; `Spinner({ size?: number })`.

- [ ] **Step 1: Add `test/setup.ts` and wire into vitest config**

```ts
import "@testing-library/jest-dom/vitest";
```
In `vitest.config.ts` test block add: `setupFiles: ["./test/setup.ts"]`.

- [ ] **Step 2: Failing tests**

`components/ui/Button.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

it("renders primary appearance with brand background class", () => {
  render(<Button appearance="primary">Create</Button>);
  const btn = screen.getByRole("button", { name: "Create" });
  expect(btn.className).toContain("bg-brand");
});
it("defaults to default appearance", () => {
  render(<Button>Cancel</Button>);
  expect(screen.getByRole("button").className).toContain("bg-[#F4F5F7]");
});
```

`components/ui/Avatar.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

it("renders initials when no src", () => {
  render(<Avatar name="Vamshi Dathrika" />);
  expect(screen.getByText("VD")).toBeInTheDocument();
});
it("renders img when src given", () => {
  render(<Avatar name="V" src="/x.png" />);
  expect(screen.getByRole("img")).toHaveAttribute("src", "/x.png");
});
```
Run: `npm test` — Expected: FAIL.

- [ ] **Step 3: Implement components**

`components/ui/Button.tsx`:
```tsx
import { ButtonHTMLAttributes } from "react";

const styles = {
  primary: "bg-brand hover:bg-brand-hover text-white",
  default: "bg-[#F4F5F7] hover:bg-[#EBECF0] text-text",
  subtle: "bg-transparent hover:bg-[#EBECF0] text-text",
  danger: "bg-danger hover:bg-[#BF2600] text-white",
} as const;

export function Button({ appearance = "default", className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { appearance?: keyof typeof styles }) {
  return (
    <button
      className={`inline-flex h-8 items-center gap-1 rounded-ds px-3 text-sm font-medium transition-colors disabled:opacity-50 ${styles[appearance]} ${className}`}
      {...props}
    />
  );
}
```

`components/ui/Input.tsx`:
```tsx
import { InputHTMLAttributes, useId } from "react";

export function Input({ label, error, className = "", ...props }:
  InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-xs font-semibold text-text-subtle">{label}</label>}
      <input
        id={id}
        className={`h-9 rounded-ds border-2 bg-surface px-2 text-sm outline-none transition-colors focus:border-brand ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
```

`components/ui/Tag.tsx`:
```tsx
const colors = {
  gray: "bg-[#DFE1E6] text-text",
  blue: "bg-[#DEEBFF] text-brand",
  green: "bg-[#E3FCEF] text-success",
  red: "bg-[#FFEBE6] text-danger",
} as const;

export function Tag({ children, color = "gray" }: { children: React.ReactNode; color?: keyof typeof colors }) {
  return <span className={`inline-flex items-center rounded-ds px-1.5 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}
```

`components/ui/Avatar.tsx`:
```tsx
export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: 24 | 32 }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  if (src) return <img src={src} alt={name} width={size} height={size} className="rounded-full" />;
  return (
    <span
      style={{ width: size, height: size, fontSize: size === 24 ? 10 : 12 }}
      className="flex items-center justify-center rounded-full bg-brand font-semibold text-white"
    >
      {initials}
    </span>
  );
}
```

`components/ui/Spinner.tsx`:
```tsx
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className="inline-block animate-spin rounded-full border-2 border-border border-t-brand"
    />
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test` — Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: UI primitives - Button, Input, Tag, Avatar, Spinner"
```

---

### Task 4: Radix primitives (Dropdown, Tooltip)

**Files:**
- Create: `components/ui/Dropdown.tsx`, `components/ui/Tooltip.tsx`, `components/ui/Dropdown.test.tsx`

**Interfaces:**
- Produces: `Dropdown({ trigger: ReactNode, items: { label: string; onSelect?: () => void; href?: string }[], align?: "start"|"end" })`; `Tooltip({ content: string, children })`.

- [ ] **Step 1: Install**

```bash
npm i @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
```

- [ ] **Step 2: Failing test `components/ui/Dropdown.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dropdown } from "./Dropdown";

it("opens menu on trigger click and fires onSelect", async () => {
  const onSelect = vi.fn();
  render(<Dropdown trigger={<span>Projects</span>} items={[{ label: "View all projects", onSelect }]} />);
  await userEvent.click(screen.getByText("Projects"));
  await userEvent.click(await screen.findByText("View all projects"));
  expect(onSelect).toHaveBeenCalled();
});
```
Run: `npm test` — Expected: FAIL.

- [ ] **Step 3: Implement**

`components/ui/Dropdown.tsx`:
```tsx
"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import Link from "next/link";

export type DropdownItem = { label: string; onSelect?: () => void; href?: string };

export function Dropdown({ trigger, items, align = "start" }:
  { trigger: React.ReactNode; items: DropdownItem[]; align?: "start" | "end" }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button className="flex h-8 items-center gap-1 rounded-ds px-2 text-sm font-medium text-text hover:bg-[#EBECF0] data-[state=open]:bg-[#DEEBFF] data-[state=open]:text-brand">
          {trigger}
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align={align} sideOffset={4}
          className="z-50 min-w-45 rounded-ds border border-border bg-surface py-1 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25)]">
          {items.map((item) => (
            <DM.Item key={item.label} onSelect={item.onSelect}
              className="cursor-pointer px-4 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-[#F4F5F7]">
              {item.href ? <Link href={item.href} className="block">{item.label}</Link> : item.label}
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
```

`components/ui/Tooltip.tsx`:
```tsx
"use client";
import * as T from "@radix-ui/react-tooltip";

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <T.Provider delayDuration={300}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content sideOffset={4} className="z-50 rounded-ds bg-[#172B4D] px-2 py-1 text-xs text-white">
            {content}
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: Radix Dropdown and Tooltip primitives"
```

---

### Task 5: Auth core — NextAuth v5 + signup action

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/signup.ts`, `lib/signup.test.ts`, `middleware.ts`

**Interfaces:**
- Consumes: `prisma` from `lib/prisma.ts`, `makeSlug` from `lib/slug.ts`.
- Produces: `auth()`, `signIn()`, `signOut()`, `handlers` from `lib/auth.ts`; session shape `{ user: { id, email, name, avatarUrl } }`; `createAccount(input: { email, password, name, siteName }): Promise<{ userId: string; siteId: string }>` — throws `Error("EMAIL_TAKEN")` on duplicate email; middleware redirects unauthenticated app routes to `/login`.

- [ ] **Step 1: Install**

```bash
npm i next-auth@beta bcryptjs zod && npm i -D @types/bcryptjs
```

- [ ] **Step 2: Failing test `lib/signup.test.ts`** (mock prisma)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));
import { prisma } from "./prisma";
import { createAccount } from "./signup";

describe("createAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws EMAIL_TAKEN when email exists", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1" });
    await expect(createAccount({ email: "a@b.c", password: "secret123", name: "A", siteName: "S" }))
      .rejects.toThrow("EMAIL_TAKEN");
  });

  it("creates user+site+admin membership in one transaction", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.$transaction as any).mockImplementation(async (fn: any) =>
      fn({
        user: { create: vi.fn().mockResolvedValue({ id: "u1" }) },
        site: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
        membership: { create: vi.fn().mockResolvedValue({ id: "m1" }) },
      }));
    const res = await createAccount({ email: "a@b.c", password: "secret123", name: "A", siteName: "S" });
    expect(res).toEqual({ userId: "u1", siteId: "s1" });
  });
});
```
Run: `npm test` — Expected: FAIL.

- [ ] **Step 3: Implement `lib/signup.ts`**

```ts
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { makeSlug } from "./slug";

export async function createAccount(input: { email: string; password: string; name: string; siteName: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new Error("EMAIL_TAKEN");
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: input.email.toLowerCase(), name: input.name, passwordHash },
    });
    const site = await tx.site.create({ data: { name: input.siteName, slug: makeSlug(input.siteName) } });
    await tx.membership.create({ data: { userId: user.id, siteId: site.id, role: "ADMIN" } });
    return { userId: user.id, siteId: site.id };
  });
}
```
Run: `npm test` — Expected: PASS.

- [ ] **Step 4: Implement `lib/auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase();
        const password = String(creds?.password ?? "");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { id?: string }).id = token.userId as string;
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      if (!existing) {
        const { makeSlug } = await import("./slug");
        await prisma.$transaction(async (tx) => {
          const u = await tx.user.create({
            data: { email: user.email!.toLowerCase(), name: user.name ?? user.email!, avatarUrl: user.image },
          });
          const site = await tx.site.create({
            data: { name: `${u.name}'s site`, slug: makeSlug(u.name) },
          });
          await tx.membership.create({ data: { userId: u.id, siteId: site.id, role: "ADMIN" } });
        });
      }
      return true;
    },
  },
});
```

`app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 5: `middleware.ts` route protection**

```ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api/auth|login|signup|invite|_next|favicon.ico).*)"],
};
```
In `lib/auth.ts` add to NextAuth config callbacks:
```ts
    authorized({ auth, request }) {
      return !!auth?.user || request.nextUrl.pathname === "/";
    },
```
(Unauthenticated users get redirected to `pages.signIn` = `/login`.)

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit` — Expected: clean. Run `npm test` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: NextAuth v5 auth core, signup transaction, route protection"
```

---

### Task 6: Login + signup pages

**Files:**
- Create: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/login/LoginForm.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/signup/SignupForm.tsx`, `app/(auth)/actions.ts`

**Interfaces:**
- Consumes: `createAccount` (`lib/signup.ts`), `signIn` (`lib/auth.ts`), `Button`, `Input`.
- Produces: server actions `signupAction(prev, formData)`, `loginAction(prev, formData)` returning `{ error?: string }`; routes `/login`, `/signup`.

- [ ] **Step 1: `app/(auth)/actions.ts`**

```ts
"use server";
import { z } from "zod";
import { AuthError } from "next-auth";
import { createAccount } from "@/lib/signup";
import { signIn } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  siteName: z.string().min(1, "Site name is required"),
});

export async function signupAction(_prev: { error?: string }, formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await createAccount(parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") return { error: "An account with this email already exists" };
    throw e;
  }
  await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: "/your-work" });
  return {};
}

export async function loginAction(_prev: { error?: string }, formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/your-work",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Invalid email or password" };
    throw e; // NEXT_REDIRECT must propagate
  }
}
```

- [ ] **Step 2: `app/(auth)/layout.tsx`** (centered card, Jira-style auth screen)

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-100 rounded-ds bg-surface p-8 shadow-[0_8px_16px_-4px_rgba(9,30,66,0.25)]">
        <h1 className="mb-1 text-center text-xl font-semibold text-brand">Trackly</h1>
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Login page + form**

`app/(auth)/login/page.tsx`:
```tsx
import { LoginForm } from "./LoginForm";
export default function LoginPage() {
  return <LoginForm />;
}
```

`app/(auth)/login/LoginForm.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-center text-sm font-medium text-text-subtle">Log in to continue</p>
      <Input name="email" type="email" placeholder="Enter your email" required />
      <Input name="password" type="password" placeholder="Enter password" required />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button appearance="primary" type="submit" disabled={pending} className="justify-center">
        {pending ? "Logging in…" : "Continue"}
      </Button>
      <Link href="/signup" className="text-center text-sm text-brand hover:underline">Create an account</Link>
    </form>
  );
}
```

- [ ] **Step 4: Signup page + form** (same pattern)

`app/(auth)/signup/page.tsx`:
```tsx
import { SignupForm } from "./SignupForm";
export default function SignupPage() {
  return <SignupForm />;
}
```

`app/(auth)/signup/SignupForm.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-center text-sm font-medium text-text-subtle">Sign up to continue</p>
      <Input name="name" placeholder="Full name" required />
      <Input name="email" type="email" placeholder="Work email" required />
      <Input name="password" type="password" placeholder="Password (8+ characters)" required />
      <Input name="siteName" placeholder="Site name (e.g. your company)" required />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button appearance="primary" type="submit" disabled={pending} className="justify-center">
        {pending ? "Creating…" : "Sign up"}
      </Button>
      <Link href="/login" className="text-center text-sm text-brand hover:underline">Already have an account? Log in</Link>
    </form>
  );
}
```

- [ ] **Step 5: Manual verify**

Run: `docker compose up -d && npm run dev` — visit `/signup`, create account, expect redirect to `/your-work` (404 page for now is OK — auth cookie set). `npx tsc --noEmit` clean.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: login and signup pages with server actions"
```

---

### Task 7: Invite flow

**Files:**
- Create: `lib/invites.ts`, `lib/invites.test.ts`, `app/(auth)/invite/[token]/page.tsx`, `app/(app)/settings/members/actions.ts`

**Interfaces:**
- Consumes: `prisma`, `auth`.
- Produces: `createInvite({ siteId, email, role }): Promise<Invite>` (token = 32-byte base64url, expires in 7 days); `acceptInvite(token: string, userId: string): Promise<{ ok: true } | { ok: false; reason: "INVALID"|"EXPIRED"|"USED" }>`; server action `inviteMemberAction`; route `/invite/[token]`.

- [ ] **Step 1: Failing tests `lib/invites.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    invite: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    membership: { upsert: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));
import { prisma } from "./prisma";
import { createInvite, acceptInvite } from "./invites";

beforeEach(() => vi.clearAllMocks());

describe("createInvite", () => {
  it("creates invite with unique token and 7-day expiry", async () => {
    (prisma.invite.create as any).mockImplementation(async ({ data }: any) => data);
    const inv = await createInvite({ siteId: "s1", email: "x@y.z", role: "MEMBER" });
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const days = (new Date(inv.expiresAt).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });
});

describe("acceptInvite", () => {
  it("INVALID for unknown token", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue(null);
    expect(await acceptInvite("nope", "u1")).toEqual({ ok: false, reason: "INVALID" });
  });
  it("EXPIRED for past expiry", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), acceptedAt: null });
    expect(await acceptInvite("t", "u1")).toEqual({ ok: false, reason: "EXPIRED" });
  });
  it("USED for accepted invite", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue({ expiresAt: new Date(Date.now() + 1000), acceptedAt: new Date() });
    expect(await acceptInvite("t", "u1")).toEqual({ ok: false, reason: "USED" });
  });
  it("creates membership and marks accepted on success", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue({
      id: "i1", siteId: "s1", role: "MEMBER", expiresAt: new Date(Date.now() + 1000), acceptedAt: null,
    });
    expect(await acceptInvite("t", "u1")).toEqual({ ok: true });
    expect(prisma.membership.upsert).toHaveBeenCalled();
    expect(prisma.invite.update).toHaveBeenCalled();
  });
});
```
Run: `npm test` — Expected: FAIL.

- [ ] **Step 2: Implement `lib/invites.ts`**

```ts
import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export async function createInvite(input: { siteId: string; email: string; role: Role }) {
  return prisma.invite.create({
    data: {
      siteId: input.siteId,
      email: input.email.toLowerCase(),
      role: input.role,
      token: randomBytes(32).toString("base64url"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite) return { ok: false as const, reason: "INVALID" as const };
  if (invite.acceptedAt) return { ok: false as const, reason: "USED" as const };
  if (invite.expiresAt < new Date()) return { ok: false as const, reason: "EXPIRED" as const };
  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId_siteId: { userId, siteId: invite.siteId } },
      create: { userId, siteId: invite.siteId, role: invite.role },
      update: {},
    }),
    prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  return { ok: true as const };
}
```
Run: `npm test` — Expected: PASS.

- [ ] **Step 3: Invite accept page `app/(auth)/invite/[token]/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";

const messages = {
  INVALID: "This invite link is not valid.",
  EXPIRED: "This invite link has expired. Ask your admin to send a new one.",
  USED: "This invite has already been used.",
} as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/invite/${token}`);
  const result = await acceptInvite(token, (session.user as { id: string }).id);
  if (result.ok) redirect("/your-work");
  return (
    <div className="flex flex-col gap-3 text-center">
      <p className="text-sm text-text">{messages[result.reason]}</p>
      <Link href="/your-work" className="text-sm text-brand hover:underline">Go to Trackly</Link>
    </div>
  );
}
```

- [ ] **Step 4: Invite server action `app/(app)/settings/members/actions.ts`**

```ts
"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvite } from "@/lib/invites";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export async function inviteMemberAction(_prev: { error?: string; link?: string }, formData: FormData) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { error: "Not authenticated" };
  const membership = await prisma.membership.findFirst({ where: { userId, role: "ADMIN" } });
  if (!membership) return { error: "Only admins can invite members" };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const invite = await createInvite({ siteId: membership.siteId, email: parsed.data.email, role: "MEMBER" });
  console.log(`[invite] ${parsed.data.email} -> http://localhost:3000/invite/${invite.token}`);
  revalidatePath("/settings/members");
  return { link: `/invite/${invite.token}` };
}
```
(Email delivery deferred to Phase 4 — dev shows the link in the UI + console.)

- [ ] **Step 5: Run all tests + typecheck**

Run: `npm test && npx tsc --noEmit` — Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: invite creation and acceptance flow"
```

---

### Task 8: App shell — TopNav

**Files:**
- Create: `app/(app)/layout.tsx`, `components/nav/TopNav.tsx`, `components/nav/UserMenu.tsx`, `components/nav/TopNav.test.tsx`

**Interfaces:**
- Consumes: `auth`, `signOut`, `Avatar`, `Dropdown`, `Tooltip`, `Button`.
- Produces: `(app)` layout wrapping all authed pages with `<TopNav user={...} />`; `TopNav({ user: { name: string; email: string; avatarUrl: string | null } })`.

- [ ] **Step 1: Failing test `components/nav/TopNav.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { TopNav } from "./TopNav";

const user = { name: "Vamshi D", email: "v@u.com", avatarUrl: null };

it("renders logo, nav dropdowns, Create button, search", () => {
  render(<TopNav user={user} />);
  expect(screen.getByText("Trackly")).toBeInTheDocument();
  for (const label of ["Your work", "Projects", "Filters", "Dashboards", "Teams"]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
});
```
Run: `npm test` — Expected: FAIL.

- [ ] **Step 2: Implement `components/nav/TopNav.tsx`**

```tsx
"use client";
import Link from "next/link";
import { Grid3X3, Search, Bell, HelpCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Tooltip } from "@/components/ui/Tooltip";
import { UserMenu } from "./UserMenu";

export type NavUser = { name: string; email: string; avatarUrl: string | null };

export function TopNav({ user }: { user: NavUser }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-border bg-surface px-4">
      <button aria-label="App switcher" className="rounded-ds p-1.5 hover:bg-[#EBECF0]">
        <Grid3X3 size={16} className="text-text-subtle" />
      </button>
      <Link href="/your-work" className="mr-2 flex items-center gap-1 text-base font-bold text-brand">
        Trackly
      </Link>
      <nav className="flex items-center gap-1">
        <Dropdown trigger="Your work" items={[{ label: "Go to your work", href: "/your-work" }]} />
        <Dropdown trigger="Projects" items={[{ label: "View all projects", href: "/projects" }]} />
        <Dropdown trigger="Filters" items={[{ label: "Coming soon" }]} />
        <Dropdown trigger="Dashboards" items={[{ label: "Coming soon" }]} />
        <Dropdown trigger="Teams" items={[{ label: "Coming soon" }]} />
        <Button appearance="primary" className="ml-1">Create</Button>
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <div className="relative mr-1">
          <Search size={14} className="absolute top-2.5 left-2 text-text-subtle" />
          <input
            placeholder="Search"
            className="h-8 w-50 rounded-ds border-2 border-border bg-surface pr-2 pl-7 text-sm outline-none transition-all focus:w-70 focus:border-brand"
          />
        </div>
        {[
          { icon: Bell, label: "Notifications" },
          { icon: HelpCircle, label: "Help" },
          { icon: Settings, label: "Settings" },
        ].map(({ icon: Icon, label }) => (
          <Tooltip key={label} content={label}>
            <button aria-label={label} className="rounded-full p-1.5 hover:bg-[#EBECF0]">
              <Icon size={18} className="text-text-subtle" />
            </button>
          </Tooltip>
        ))}
        <UserMenu user={user} />
      </div>
    </header>
  );
}
```
Install icons: `npm i lucide-react`.

- [ ] **Step 3: `components/nav/UserMenu.tsx`**

```tsx
"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Avatar } from "@/components/ui/Avatar";
import type { NavUser } from "./TopNav";

export function UserMenu({ user }: { user: NavUser }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button aria-label="Your profile" className="ml-1 rounded-full p-0.5 hover:opacity-80">
          <Avatar name={user.name} src={user.avatarUrl} size={24} />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={4}
          className="z-50 min-w-55 rounded-ds border border-border bg-surface py-2 shadow-[0_4px_8px_-2px_rgba(9,30,66,0.25)]">
          <div className="flex items-center gap-2 px-4 pb-2">
            <Avatar name={user.name} src={user.avatarUrl} size={32} />
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-text-subtle">{user.email}</p>
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          <DM.Item asChild className="cursor-pointer px-4 py-1.5 text-sm outline-none data-[highlighted]:bg-[#F4F5F7]">
            <a href="/settings/members">Site settings</a>
          </DM.Item>
          <DM.Item asChild className="cursor-pointer px-4 py-1.5 text-sm outline-none data-[highlighted]:bg-[#F4F5F7]">
            <button className="w-full text-left" onClick={() => { window.location.href = "/api/auth/signout"; }}>
              Log out
            </button>
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
```

- [ ] **Step 4: `app/(app)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TopNav } from "@/components/nav/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user as { name?: string; email?: string; image?: string };
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={{ name: u.name ?? "", email: u.email ?? "", avatarUrl: u.image ?? null }} />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npm test` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: Jira-style top navigation with user menu"
```

---

### Task 9: Sidebar + Breadcrumbs

**Files:**
- Create: `components/nav/Sidebar.tsx`, `components/nav/Breadcrumbs.tsx`, `components/nav/Sidebar.test.tsx`

**Interfaces:**
- Produces: `Sidebar({ projectName, projectKey }: { projectName: string; projectKey: string })` — collapsible 240px rail with Planning group (Timeline, Backlog, Board, Reports — links disabled with Tooltip "Coming in a later phase") and pinned "Project settings"; `Breadcrumbs({ items }: { items: { label: string; href?: string }[] })`.

- [ ] **Step 1: Failing test `components/nav/Sidebar.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./Sidebar";

it("renders project header and planning group", () => {
  render(<Sidebar projectName="Demo" projectKey="DEM" />);
  expect(screen.getByText("Demo")).toBeInTheDocument();
  for (const l of ["Timeline", "Backlog", "Board", "Reports", "Project settings"]) {
    expect(screen.getByText(l)).toBeInTheDocument();
  }
});

it("collapses on chevron click", async () => {
  render(<Sidebar projectName="Demo" projectKey="DEM" />);
  await userEvent.click(screen.getByLabelText("Collapse sidebar"));
  expect(screen.queryByText("Backlog")).not.toBeInTheDocument();
});
```
Run: `npm test` — Expected: FAIL.

- [ ] **Step 2: Implement `components/nav/Sidebar.tsx`**

```tsx
"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, List, Columns3, BarChart3, Settings } from "lucide-react";

const planning = [
  { label: "Timeline", icon: Calendar },
  { label: "Backlog", icon: List },
  { label: "Board", icon: Columns3 },
  { label: "Reports", icon: BarChart3 },
];

export function Sidebar({ projectName, projectKey }: { projectName: string; projectKey: string }) {
  const [collapsed, setCollapsed] = useState(false);
  if (collapsed) {
    return (
      <aside className="relative w-5 border-r border-border bg-surface">
        <button
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="absolute top-8 -right-3 z-10 rounded-full border border-border bg-surface p-1 shadow-sm hover:bg-brand hover:text-white"
        >
          <ChevronRight size={12} />
        </button>
      </aside>
    );
  }
  return (
    <aside className="relative flex w-60 flex-col border-r border-border bg-surface">
      <button
        aria-label="Collapse sidebar"
        onClick={() => setCollapsed(true)}
        className="absolute top-8 -right-3 z-10 rounded-full border border-border bg-surface p-1 shadow-sm hover:bg-brand hover:text-white"
      >
        <ChevronLeft size={12} />
      </button>
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-ds bg-brand text-xs font-bold text-white">
          {projectKey.slice(0, 2)}
        </span>
        <div>
          <p className="text-sm font-medium">{projectName}</p>
          <p className="text-xs text-text-subtle">Software project</p>
        </div>
      </div>
      <p className="px-4 pb-1 text-[11px] font-bold tracking-wide text-text-subtle uppercase">Planning</p>
      <nav className="flex flex-col">
        {planning.map(({ label, icon: Icon }) => (
          <button
            key={label}
            disabled
            title="Coming in a later phase"
            className="flex cursor-not-allowed items-center gap-3 px-4 py-2 text-sm text-text-subtle opacity-60"
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto border-t border-border">
        <a href="/settings/members" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[#F4F5F7]">
          <Settings size={16} /> Project settings
        </a>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Implement `components/nav/Breadcrumbs.tsx`**

```tsx
import Link from "next/link";
import { Fragment } from "react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-1 text-sm text-text-subtle">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-brand hover:underline">{item.label}</Link>
          ) : (
            <span>{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: collapsible project sidebar and breadcrumbs"
```

---

### Task 10: Pages — Your work, Projects stub, Settings members

**Files:**
- Create: `app/(app)/your-work/page.tsx`, `app/(app)/projects/page.tsx`, `app/(app)/settings/members/page.tsx`, `app/(app)/settings/members/InviteForm.tsx`, `app/not-found.tsx`

**Interfaces:**
- Consumes: `auth`, `prisma`, `inviteMemberAction`, `Avatar`, `Tag`, `Button`, `Input`, `Breadcrumbs`.
- Produces: routes `/your-work`, `/projects`, `/settings/members`.

- [ ] **Step 1: `app/(app)/your-work/page.tsx`** (empty state like Jira's "Your work")

```tsx
export default function YourWorkPage() {
  return (
    <main className="flex-1 px-10 py-6">
      <h1 className="mb-6 text-2xl font-medium">Your work</h1>
      <div className="flex border-b border-border text-sm font-medium text-text-subtle">
        {["Worked on", "Viewed", "Assigned to me", "Starred"].map((tab, i) => (
          <span key={tab} className={`px-3 pb-2 ${i === 2 ? "border-b-2 border-brand text-brand" : ""}`}>
            {tab}{i === 2 ? " 0" : ""}
          </span>
        ))}
      </div>
      <div className="mt-16 flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium">You currently have no work assigned to you.</p>
        <p className="text-sm text-text-subtle">Issues assigned to you will appear here once projects exist.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `app/(app)/projects/page.tsx`** (empty list, Create disabled until Phase 2)

```tsx
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { Button } from "@/components/ui/Button";

export default function ProjectsPage() {
  return (
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Projects" }]} />
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        <Button appearance="primary" disabled title="Coming in Phase 2">Create project</Button>
      </div>
      <p className="mt-16 text-center text-sm text-text-subtle">No projects yet. Project creation arrives in Phase 2.</p>
    </main>
  );
}
```

- [ ] **Step 3: Settings members page + invite form**

`app/(app)/settings/members/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { InviteForm } from "./InviteForm";

export default async function MembersPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const membership = await prisma.membership.findFirst({ where: { userId }, include: { site: true } });
  if (!membership) redirect("/your-work");
  const members = await prisma.membership.findMany({
    where: { siteId: membership.siteId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Members" }]} />
      <h1 className="mt-2 mb-6 text-2xl font-medium">{membership.site.name} — Members</h1>
      {membership.role === "ADMIN" && <InviteForm />}
      <table className="mt-6 w-full max-w-2xl text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle">
            <th className="py-2">Name</th><th>Email</th><th>Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-border">
              <td className="flex items-center gap-2 py-2">
                <Avatar name={m.user.name} src={m.user.avatarUrl} size={24} /> {m.user.name}
              </td>
              <td className="text-text-subtle">{m.user.email}</td>
              <td><Tag color={m.role === "ADMIN" ? "blue" : "gray"}>{m.role}</Tag></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

`app/(app)/settings/members/InviteForm.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import { inviteMemberAction } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMemberAction, {});
  return (
    <form action={action} className="flex max-w-2xl items-end gap-2">
      <div className="flex-1"><Input name="email" type="email" label="Invite a member" placeholder="teammate@company.com" required /></div>
      <Button appearance="primary" type="submit" disabled={pending}>{pending ? "Inviting…" : "Invite"}</Button>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.link && <p className="text-xs text-success">Invite link: <a className="underline" href={state.link}>{state.link}</a></p>}
    </form>
  );
}
```

- [ ] **Step 4: `app/not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <h1 className="text-2xl font-medium">Page not found</h1>
      <p className="text-sm text-text-subtle">The page you are looking for does not exist.</p>
      <Link href="/your-work" className="text-sm text-brand hover:underline">Go to Trackly</Link>
    </main>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm test` — Expected: clean, PASS. Manual: dev server, log in, see Your work, invite a member from settings, open invite link in private window.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: your-work, projects stub, and members settings pages"
```

---

### Task 11: Playwright e2e smoke

**Files:**
- Create: `playwright.config.ts`, `e2e/auth.spec.ts`
- Modify: `package.json` (add `"e2e": "playwright test"`)

**Interfaces:**
- Consumes: full app, running Postgres.

- [ ] **Step 1: Install**

```bash
npm i -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: { command: "npm run dev", url: "http://localhost:3000/login", reuseExistingServer: true, timeout: 60000 },
});
```

- [ ] **Step 3: `e2e/auth.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

const email = `e2e-${Date.now()}@test.dev`;

test("signup -> your work -> invite -> logout -> login", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("Full name").fill("E2E User");
  await page.getByPlaceholder("Work email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill("password123");
  await page.getByPlaceholder("Site name (e.g. your company)").fill("E2E Site");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/your-work/);
  await expect(page.getByText("Trackly")).toBeVisible();

  await page.goto("/settings/members");
  await page.getByPlaceholder("teammate@company.com").fill("friend@test.dev");
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByText(/Invite link:/)).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill(email);
  await page.getByPlaceholder("Enter password").fill("password123");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/your-work/);
});

test("unauthenticated user is redirected to login", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/your-work");
  await expect(page).toHaveURL(/\/login/);
});

test("bad credentials show generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter your email").fill("nobody@test.dev");
  await page.getByPlaceholder("Enter password").fill("wrongpass");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});
```

- [ ] **Step 4: Run**

Run: `docker compose up -d && npx playwright test`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: Playwright e2e smoke for auth, invite, route protection"
```

---

### Task 12: Visual fidelity pass + README

**Files:**
- Create: `README.md`
- Modify: any shell components needing pixel adjustments

- [ ] **Step 1: Side-by-side comparison** (main session does this — needs browser judgment; use Jira Cloud screenshots or a live Jira instance)

Open Trackly and Jira Cloud side by side in browser. Compare: top nav height/spacing/hover states, dropdown shadows, button metrics, sidebar widths, font sizes. Fix mismatches directly in components. Re-run `npm test` after edits.

- [ ] **Step 2: `README.md`**

```markdown
# Trackly

Jira-style project tracking for teams. Next.js 15 + Postgres + Prisma.

## Dev setup

1. `docker compose up -d` — Postgres 16 on :5432
2. `cp .env.example .env`
3. `npm install && npx prisma migrate dev`
4. `npm run dev` — http://localhost:3000

## Scripts

- `npm test` — Vitest unit tests
- `npm run e2e` — Playwright e2e
- `npx tsc --noEmit` — typecheck

## Roadmap

See `docs/superpowers/specs/` — 8-phase plan. Phase 1 (this): auth + org + shell.
```

- [ ] **Step 3: Final verification**

Run: `npm test && npx playwright test && npx tsc --noEmit`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: README and visual fidelity polish"
```
