# Trackly — Phase 8: Admin + Permissions — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Phase 8 completes the full Jira-clone roadmap by introducing **Project Settings & Administration**, **Custom Fields**, and **Role-based Permission Controls (RBAC)** in Trackly. Site Admins and Project Leads can edit project details, change project keys, manage project roles (`ADMIN` / `MEMBER`), and define project-level custom fields.

---

## Technical & Domain Scope

### 1. Prisma Data Model Extensions
- **CustomField**:
  - `id`: CUID
  - `projectId`: Foreign key to `Project`
  - `name`: string (e.g., "Customer Tier", "Target Build")
  - `fieldType`: string (`STRING` | `NUMBER` | `DATE`)
  - `required`: Boolean (`@default(false)`)
  - `createdAt`: DateTime (`@default(now())`)

---

### 2. User Experience & Components

#### **A. Project Settings Page** (`app/(app)/projects/[key]/settings/page.tsx`)
- Sidebar link to **Project settings** enabled.
- **General Settings Tab**: Edit Project Name, Project Key, and Project Lead.
- **Custom Fields Tab**: Add and manage custom fields per project.

#### **B. Member Management & Role Controls** (`app/(app)/settings/members/page.tsx`)
- Role badge (`ADMIN` / `MEMBER`) for workspace members.
- Role update dropdown for workspace admins.
- Revoke pending invite action.

---

## Verification Plan

1. **Database**: Migration for `CustomField` model.
2. **Unit Tests**:
   - `lib/admin.test.ts` testing project settings update, role permission check, and custom field creation.
3. **Playwright E2E Tests**:
   - Visit `/projects/DEMO/settings` -> Edit Project Name -> Add Custom Field -> Verify settings update.
