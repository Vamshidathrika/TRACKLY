# Trackly Phase 5: Search + JQL Engine Implementation Plan

Goal: Build Global Quick Search, JQL query parsing engine, Saved Filters, and the Issue Navigator page.

## Proposed Tasks

### Task 1: Prisma Schema Extensions (SavedFilter model)
- Files: `prisma/schema.prisma`
- Add Model: `SavedFilter`
- Run migration `phase5_saved_filters`

### Task 2: JQL Query Parser Engine & Unit Tests
- Files: `lib/jql.ts`, `lib/jql.test.ts`
- Implement `parseJQLToPrisma` (AST tokenization & Prisma where clause builder) and `getJQLSuggestions`.

### Task 3: Global Quick Search Component & TopNav Integration
- Files: `components/search/QuickSearch.tsx`, update `components/nav/TopNav.tsx`
- Build live autocomplete search bar returning matching issues and projects.

### Task 4: JQL Issue Navigator & Saved Filters Page
- Files: `app/(app)/filters/search/page.tsx`, `components/search/JQLNavigator.tsx`, `app/(app)/filters/actions.ts`
- Build full JQL search workspace with query autocomplete, results table, and saved filter actions.

### Task 5: Playwright E2E Tests for Phase 5
- Files: `e2e/search-jql.spec.ts`
- Test full flow: Quick search -> JQL Query -> Filter saving -> Execution.
