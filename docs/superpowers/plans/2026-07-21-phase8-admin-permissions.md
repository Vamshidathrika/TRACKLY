# Trackly Phase 8: Admin + Permissions Implementation Plan

Goal: Build Project Settings, Custom Fields, Role-based Access Control, and Member Administration.

## Proposed Tasks

### Task 1: Prisma Schema Extensions (CustomField model)
- Files: `prisma/schema.prisma`
- Add Model: `CustomField`
- Run migration `phase8_custom_fields`

### Task 2: Admin Data Layer & Unit Tests
- Files: `lib/admin.ts`, `lib/admin.test.ts`
- Implement `updateProjectSettings`, `createCustomField`, `getCustomFields`, `updateMemberRole`.

### Task 3: Project Settings Workspace & Custom Fields UI
- Files: `components/projects/ProjectSettingsView.tsx`, `app/(app)/projects/[key]/settings/page.tsx`, `app/(app)/projects/[key]/settings/actions.ts`
- Build Project Settings tabbed view (General Settings, Custom Fields). Enable Project Settings link in Sidebar.

### Task 4: Member Administration & Role Controls
- Files: update `app/(app)/settings/members/page.tsx`, `components/settings/MembersList.tsx`
- Build role badge editor and invite revocation controls.

### Task 5: Playwright E2E Tests for Phase 8
- Files: `e2e/admin-permissions.spec.ts`
- Test full flow: Visit project settings -> Update project details -> Add custom field -> Verify updates.
