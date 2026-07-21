# Trackly

Jira-style project tracking for teams. Built with Next.js 15, PostgreSQL, Prisma, and NextAuth v5.

## Dev Setup

1. `docker compose up -d` — PostgreSQL 16 on `:5432` (or local PostgreSQL service)
2. `cp .env.example .env`
3. `npm install && npx prisma migrate dev`
4. `npm run dev` — Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm test` — Run Vitest unit & integration tests
- `npm run e2e` — Run Playwright end-to-end smoke tests
- `npx tsc --noEmit` — TypeScript type checking

## Architecture & Roadmap

See `docs/superpowers/specs/` for the multi-phase implementation roadmap.
- **Phase 1 (Completed)**: Authentication, Organization model, and Jira-style UI App Shell with custom design tokens.
