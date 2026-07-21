# Trackly Phase 4: Realtime + Notifications Implementation Plan

Goal: Build Notifications, Notification Bell Popover, @Mentions in comments, and Issue Watching.

## Proposed Tasks

### Task 1: Prisma Schema Extensions (Notification, Watcher models)
- Files: `prisma/schema.prisma`
- Add Enum: `NotificationType` (`MENTION`, `ASSIGNMENT`, `STATUS_CHANGE`, `COMMENT`)
- Add Models: `Notification`, `Watcher`
- Run migration `phase4_notifications_watchers`

### Task 2: Notification Data Layer & Unit Tests
- Files: `lib/notifications.ts`, `lib/notifications.test.ts`
- Implement `createNotification`, `getNotifications`, `markNotificationsAsRead`, `parseMentions`.

### Task 3: Notification Bell Component & TopNav Integration
- Files: `components/nav/NotificationBell.tsx`, update `components/nav/TopNav.tsx`
- Replace static Bell icon with interactive popover drawer and unread badge counter.

### Task 4: @Mentions & Watcher Trigger Integration
- Files: `app/(app)/projects/[key]/issues/actions.ts`, `components/issues/IssueDetail.tsx`
- Trigger notification creation on comments (with `@name` mentions) and issue updates. Add "Watch issue" button.

### Task 5: Playwright E2E Tests for Phase 4
- Files: `e2e/notifications.spec.ts`
- Test full flow: Post comment with @mention -> Verify Notification Bell -> Mark as read.
