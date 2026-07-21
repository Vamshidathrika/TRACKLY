# Trackly — Phase 5: Search + JQL Engine — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Phase 5 introduces **Global Quick Search**, a **JQL (Jira Query Language) Search Engine**, **Saved Filters**, and an **Issue Navigator** in Trackly. Users can perform instant autocomplete searches from the TopNav search bar, execute structured JQL queries (e.g., `status = IN_PROGRESS AND priority = HIGH`), and save custom filter queries for future reuse.

---

## Technical & Domain Scope

### 1. Prisma Data Model Extensions
- **SavedFilter**:
  - `id`: CUID
  - `userId`: Foreign key to `User`
  - `name`: string (e.g., "High Priority Bugs")
  - `jql`: string (e.g., `type = BUG AND priority = HIGH`)
  - `createdAt`: DateTime (`@default(now())`)
  - `updatedAt`: DateTime (`@updatedAt`)

---

### 2. JQL Parser Engine Specification (`lib/jql.ts`)
- **Supported Fields**: `project`, `key`, `type`, `status`, `priority`, `assignee`, `reporter`, `summary`, `text`.
- **Supported Operators**: `=`, `!=`, `CONTAINS` (`~`).
- **Supported Connectors**: `AND`, `OR`.
- **Parsing Logic**: Converts JQL query string into Prisma `where` criteria safely without SQL injection risks.
- **Example Queries**:
  - `project = DEMO AND status = IN_PROGRESS`
  - `type = BUG AND priority = HIGH`
  - `summary ~ "layout"`

---

### 3. User Experience & Components

#### **A. Global Quick Search** (`components/search/QuickSearch.tsx`)
- TopNav search bar with live dropdown results as the user types.
- Groups results by **Issues** (Key, Summary, TypeIcon, Status) and **Projects** (Name, Key).
- Keyboard navigation (Arrow keys, Enter to open).

#### **B. JQL Issue Navigator & Saved Filters** (`app/(app)/filters/search/page.tsx`)
- Search bar with live JQL syntax hints and autocomplete suggestions.
- **Save Filter Modal**: Allows naming and saving current JQL query.
- Configurable issue list table.

---

## Verification Plan

1. **Database**: Migration for `SavedFilter` model.
2. **Unit Tests**:
   - JQL parser AST and Prisma query builder tests in `lib/jql.test.ts`.
3. **Playwright E2E Tests**:
   - Quick search input -> Type query -> Click search result -> Open JQL Issue Navigator -> Save filter.
