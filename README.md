# Trackly

Jira-style issue tracking for small teams — projects, boards, sprints, backlog,
work logging, and reports.

Built with **Next.js 15** (App Router, Server Actions), **Prisma**,
**PostgreSQL / CockroachDB**, **NextAuth v5**, and **Tailwind v4**.

---

## Quick start

Requires **Node 20+** and **Docker** (or a local PostgreSQL).

```bash
git clone <your-repo-url> trackly
cd trackly

docker compose up -d          # PostgreSQL 16 on :5432
cp .env.example .env          # then fill in AUTH_SECRET (see below)

npm install                   # runs `prisma generate` automatically
npm run db:push               # create the schema
npm run db:seed               # demo user + sample project

npm run dev                   # http://localhost:3000
```

Generate a session secret for `.env`:

```bash
openssl rand -base64 32
```

Sign in with the seeded account, or click **One-Click Demo Login** (development
only — the button and the underlying server action are both disabled in
production):

```
demo@trackly.dev / password123
```

> **Keep the dev server on port 3000.** Google OAuth redirect URIs must match
> exactly, so a drifting port breaks sign-in. If Next picks 3001+, kill the
> stray process first: `pkill -f next-server`.

---

## What's in it

| Area | Status |
|---|---|
| Projects, issues, Kanban board, backlog, sprints | Working |
| Issue detail: comments, history, work logging, subtasks, attachments, links | Working |
| Assignee, priority, status, story points, labels, dates, sprint | Working |
| Search (JQL-style), saved filters, dashboards, reports | Working |
| Auth: email/password + Google OAuth, invite-based team access | Working |
| Automation rules, notifications, watchers | Working |
| Teams, Plans | Placeholder — deliberately disabled in the nav |
| Development panel (branch/PR) | Suggested branch name only; no VCS integration |

Attachments require a Vercel Blob token. Without one, uploads are refused with
a visible message; nothing else is affected. See [DEPLOY.md](DEPLOY.md).

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve a production build |
| `npm test` | Vitest unit and integration tests |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio (browse the database) |

---

## Documentation

- **[DEVELOPING.md](DEVELOPING.md)** — architecture, conventions, how to add a
  feature, testing, troubleshooting
- **[DEPLOY.md](DEPLOY.md)** — deploying to Vercel with CockroachDB and Blob
  storage

---

## Project layout

```
app/
  (auth)/            login, signup, invite acceptance
  (app)/             authenticated app — projects, boards, settings
    */actions.ts     server actions; all writes go through these
components/          UI grouped by domain (board/, issues/, chrome/, ...)
lib/                 business logic and data access; unit-tested
prisma/schema.prisma single source of truth for the data model
```

---

## Licence

Private and unlicensed. All rights reserved.
