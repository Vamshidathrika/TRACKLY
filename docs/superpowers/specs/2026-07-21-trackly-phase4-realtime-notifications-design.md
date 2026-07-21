# Trackly — Phase 4: Realtime + Notifications — Design Spec

Date: 2026-07-21  
Status: Approved  
Author: Antigravity Superpowers  

## Product Goal

Phase 4 introduces in-app **Notifications**, **@Mentions**, **Issue Watching**, and **Live Realtime Events** in Trackly. Users receive notifications when assigned to an issue, mentioned in a comment with `@name`, or when an issue they watch is updated. The top navigation Notification Bell displays unread counts with an interactive notification drawer.

---

## Technical & Domain Scope

### 1. Prisma Data Model Extensions
- **Notification**:
  - `id`: CUID
  - `userId`: Foreign key to `User` (recipient)
  - `actorId`: Foreign key to `User` (who triggered the notification)
  - `type`: Enum `NotificationType` (`MENTION` | `ASSIGNMENT` | `STATUS_CHANGE` | `COMMENT`)
  - `title`: string
  - `message`: string
  - `link`: string (e.g., `/projects/DEMO/issues/DEMO-3`)
  - `read`: Boolean (`@default(false)`)
  - `createdAt`: DateTime (`@default(now())`)
- **Watcher**:
  - `id`: CUID
  - `issueId`: Foreign key to `Issue`
  - `userId`: Foreign key to `User`
  - `createdAt`: DateTime (`@default(now())`)
  - `@@unique([issueId, userId])`

---

### 2. User Experience & Components

#### **A. Notification Bell & Popover Drawer** (`components/nav/NotificationBell.tsx`)
- Displays unread badge count on the top navigation Bell icon.
- Clicking Bell opens interactive popover listing recent notifications with relative time, actor avatar, message, and "Mark all as read" button.
- Clicking a notification marks it as read and navigates to the linked issue.

#### **B. @Mentions & Comment Parsing** (`lib/notifications.ts`, `components/issues/IssueDetail.tsx`)
- When a comment is posted containing `@name` or `@user`, automatically creates a `MENTION` notification for the mentioned user.
- Creates `ASSIGNMENT` notification when an issue assignee is changed.
- Creates `COMMENT` / `STATUS_CHANGE` notifications for issue Watchers.

#### **C. Issue Watching** (`components/issues/IssueDetail.tsx`)
- "Watch" button on Issue Detail view allowing users to toggle watching/unwatching an issue.
- Displays watcher count.

---

## Verification Plan

1. **Database**: Migration for `Notification` and `Watcher` models.
2. **Unit Tests**:
   - Mention parsing logic (`extractMentions("@Vamshi check this")`).
   - Notification creation and mark-as-read logic in `lib/notifications.test.ts`.
3. **Playwright E2E Tests**:
   - Post comment with @mention -> Check Notification Bell badge -> Mark as read.
