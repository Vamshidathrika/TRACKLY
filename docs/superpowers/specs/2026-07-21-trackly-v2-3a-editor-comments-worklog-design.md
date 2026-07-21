# Trackly V2-3a — Rich Editor, Comments v2, Time Tracking

Date: 2026-07-21 · Phase: V2-3a (first half of V2-3, pulled forward per gap analysis)
Basis: `docs/superpowers/specs/2026-07-21-trackly-gap-analysis.md` Tier 1 items #1, #2, #3.

## Goal

Close the two largest daily-driver gaps against Jira Software: **time tracking is 0% present**, and **comments/description are plain strings in a `<textarea>`**. After this phase a user can write formatted descriptions and comments with working @mentions and reactions, log work against an issue with correct estimate arithmetic, and see the time-tracking bar and worklog history Jira users expect.

## Scope

**In**
- TipTap rich text for issue description and comments (shared editor + renderer).
- Comments v2: rich body, stored mention entities, emoji reactions, edit history.
- Time tracking: `Worklog` model, original/remaining estimates, Log Work dialog with all four remaining-estimate modes, duration parser/formatter, time-tracking bar, worklog list in the activity tab, history entries.
- Targeted JQL additions for the new duration and worklog fields.
- Decomposition of `components/issues/IssueDetail.tsx` (304 lines) into focused units.

**Out (with reason)**
- Images, attachments, paste-a-screenshot — needs the `Attachment` model and a storage interface; lands in V2-3b, where the editor gains an image node.
- Comment visibility restriction — depends on project roles, which arrive in V2-9. Adding a `restrictedToRole` column now would encode a role model that does not exist yet.
- Comment threading — Jira Software has flat comments; not a gap.
- Rich text in the worklog description — plain text this phase, upgraded when the editor is already proven.
- Full JQL grammar (parentheses, NOT, functions) — V2-6.

## Locked decisions

1. **TipTap v3** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-mention`, `@tiptap/suggestion`, table, link, placeholder, code-block extensions). ProseMirror-based, matches Jira's own editor family.
2. **Storage is TipTap JSON, with a plaintext mirror.** `Issue.descriptionJson` / `Comment.bodyJson` hold the doc; the existing `description` / `body` string columns are always written alongside, derived server-side. Search, notifications, and JQL `~` keep working with no changes, and no read path breaks while the backfill runs.
3. **Rendering is a custom React walker, never `dangerouslySetInnerHTML`.** Docs arrive through server actions, so a crafted document must not be able to become raw HTML. `RichRenderer` walks an allowlist of node and mark types; unknown nodes render as nothing.
4. **Server validates documents before persist**: allowlisted node/mark types only, max serialized size 100KB, max nesting depth 20.
5. **`Issue.timeSpentSeconds` is denormalized.** The source of truth is `sum(worklogs.timeSpentSeconds)`, but board cards, the issue table, and JQL sorting all need spent time without a per-row aggregate. The rollup is written in the same transaction as every worklog mutation, and `recomputeTimeSpent(issueId)` exists as a reconciler with a test asserting it equals the sum.
6. **`useEditor({ immediatelyRender: false })`** in every editor mount. Next 15 renders on the server by default; without this the editor causes hydration mismatches.
7. **Estimate arithmetic lives in pure functions** (`lib/time/estimates.ts`) with no Prisma import, so the whole matrix is table-testable.

## Data model

```prisma
model Worklog {
  id               String   @id @default(cuid())
  issueId          String
  authorId         String
  timeSpentSeconds Int
  description      String?
  startedAt        DateTime
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  issue            Issue    @relation(fields: [issueId], references: [id], onDelete: Cascade)
  author           User     @relation(fields: [authorId], references: [id])

  @@index([issueId, startedAt])
  @@index([authorId, startedAt])
}

model CommentReaction {
  id        String   @id @default(cuid())
  commentId String
  userId    String
  emoji     String
  createdAt DateTime @default(now())
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([commentId, userId, emoji])
}

model CommentMention {
  id        String  @id @default(cuid())
  commentId String
  userId    String
  comment   Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([commentId, userId])
}

model CommentEdit {
  id           String   @id @default(cuid())
  commentId    String
  editorId     String
  prevBody     String
  prevBodyJson Json?
  createdAt    DateTime @default(now())
  comment      Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  editor       User     @relation(fields: [editorId], references: [id])

  @@index([commentId, createdAt])
}
```

Additions to existing models:

| Model | Field | Notes |
|---|---|---|
| `Issue` | `descriptionJson Json?` | TipTap doc; `description` stays as plaintext mirror |
| `Issue` | `originalEstimateSeconds Int?` | |
| `Issue` | `remainingEstimateSeconds Int?` | seeded from original when original is first set and remaining is null |
| `Issue` | `timeSpentSeconds Int @default(0)` | denormalized rollup |
| `Issue` | `worklogs Worklog[]` | |
| `Comment` | `bodyJson Json?` | `body` stays as plaintext mirror |
| `Comment` | `editedAt DateTime?` | |
| `Comment` | `reactions`, `mentions`, `edits` | back-relations |
| `Site` | `hoursPerDay Int @default(8)` | duration parser input |
| `Site` | `daysPerWeek Int @default(5)` | duration parser input |
| `Site` | `timezone String @default("Asia/Kolkata")` | worklog date display |

Migration is additive only: new tables, new nullable columns, one column with a default. No data loss, no destructive change, safe to apply before the backfill runs.

## Module map

Server-safe and client modules are kept apart so server actions never pull React or the editor bundle.

| Path | Responsibility | Depends on |
|---|---|---|
| `lib/time/duration.ts` | `parseDuration(input, {hoursPerDay, daysPerWeek}) → seconds`, `formatDuration(seconds, opts) → string` | nothing |
| `lib/time/estimates.ts` | pure estimate transitions for log/edit/delete × 4 modes | nothing |
| `lib/worklogs.ts` | worklog CRUD, rollup maintenance, permission checks, history writes | prisma, the two above |
| `lib/editor/text.ts` | `docToPlainText(doc)`, `extractMentionIds(doc)` — recursive walkers over the JSON shape, no TipTap import | nothing |
| `lib/editor/validate.ts` | node/mark allowlist, size and depth caps | nothing |
| `lib/editor/schema.ts` | the extension list shared by editor and any future server render | tiptap |
| `components/editor/RichEditor.tsx` | client editor: toolbar, slash menu, mention suggestion | tiptap/react |
| `components/editor/RichRenderer.tsx` | JSON → React elements via allowlist walker | none (plain React) |
| `components/editor/MentionList.tsx` | suggestion dropdown, filters project members | — |
| `components/issues/detail/*` | header, description section, activity tabs, comment list/item/composer, time-tracking panel, log-work dialog, estimate fields | above |
| `app/(app)/projects/[key]/issues/worklog-actions.ts` | server actions for worklog CRUD | `lib/worklogs.ts` |

`lib/editor/text.ts` deliberately re-implements the walk instead of using `@tiptap/static-renderer`: it needs to run in server actions, must never depend on the extension list staying in sync, and is trivial to test.

## Rich text behavior

Editor features: paragraphs, headings 1–6, bold/italic/strike/code, bullet/ordered/task lists, blockquote, code block with language selection, horizontal rule, tables, links, info/warning/success/error panels, emoji, @mentions, slash command menu. No images this phase.

- Editor is dynamically imported (`next/dynamic`, `ssr: false`) so the TipTap bundle stays off first paint for read-only viewers. `RichRenderer` has no TipTap dependency and ships everywhere.
- Description edits save on explicit Save (Jira behavior), with `Cmd+Enter` to save and `Esc` to cancel with a confirm when dirty.
- Comment composer saves on Save button or `Cmd+Enter`.
- Mention suggestions query project members through a server action, debounced, limited to 10.

## Comments v2 behavior

- **Reactions:** fixed set — 👍 👎 😄 🎉 😕 ❤️ 🚀 👀. Clicking toggles the current user's row. Aggregated counts with a tooltip listing reactor names.
- **Edit:** author only. On save, write a `CommentEdit` snapshot of the previous body, set `editedAt`. UI shows "Edited" with the edit list on hover.
- **Delete:** author or project admin. Cascades reactions, mentions, edits.
- **Mentions:** taken from the Mention node's `userId` attribute in the JSON — the `/@([\w\.\-]+)/g` regex in `lib/notifications.ts` is removed once both call sites (comment, description) use `extractMentionIds`. On edit, notify only the difference between the new mention set and the existing `CommentMention` rows, so re-editing a comment never re-pings people.

## Time tracking behavior

**Duration parser.** Units `w`, `d`, `h`, `m`, case-insensitive, optional spaces: `2w`, `2w 3d`, `4h30m`, `90m`. A bare number means minutes, matching Jira. `w = daysPerWeek × hoursPerDay × 3600`, `d = hoursPerDay × 3600`. Rejects: empty, zero, negative, unknown units, duplicate units, non-numeric. Formatter is the inverse — greedy w/d/h/m, zero units omitted, `0m` for zero.

**Log Work dialog.** Fields: time spent (required, parsed with live preview of the parsed value), date started (defaults to now, cannot be in the future), description (plain text), remaining-estimate mode.

Estimate transitions, where `rem` is the current remaining estimate:

| Operation | AUTO | LEAVE | SET_TO x | REDUCE_BY x |
|---|---|---|---|---|
| Log work `T` | `max(0, rem − T)` | unchanged | `x` | `max(0, rem − x)` |
| Edit `T0 → T1` | `max(0, rem + T0 − T1)` | unchanged | `x` | n/a |
| Delete `T0` | `rem + T0` | unchanged | `x` | n/a |

`timeSpentSeconds` moves by `+T`, `+(T1 − T0)`, `−T0` respectively, always inside the same transaction as the worklog row.

**Permissions.** Author edits or deletes own worklogs; project admin may edit or delete any. Enforced in `lib/worklogs.ts`, not in the component.

**Time-tracking bar.** Three segments — logged, remaining, and an overage segment when logged exceeds original estimate. Labels read `4h logged`, `2d remaining`, `3d estimated`. Empty state offers "No time logged" plus the Log Work action.

**Activity tab.** Filter chips All / Comments / History / Worklog, plus a newest-first / oldest-first toggle. Worklog entries show author avatar, formatted duration, started date in the site timezone, and description.

**History.** `IssueHistory` rows written for `originalEstimate`, `remainingEstimate`, and `timeSpent` changes, following the existing history pattern, so the audit trail matches Jira's.

**Timezone.** `startedAt` is stored UTC. Display and date-picker boundaries use `Site.timezone`.

## JQL additions

`lib/jql.ts` gains numeric comparison operators (`>`, `>=`, `<`, `<=`) applied **only** to duration fields, so the existing string-field behavior is untouched:

- `timespent`, `originalestimate`, `remainingestimate` — right-hand side parsed with `parseDuration`, e.g. `timespent > 4h`.
- `worklogauthor = <user>` → `worklogs: { some: { author: … } }`.
- `worklogdate >= <date>` → `worklogs: { some: { startedAt: … } }`.
- All six added to the autocomplete `FIELDS` list.

The parser stays regex-based this phase. The rewrite to a real grammar remains V2-6; these additions are shaped so that rewrite can replace them wholesale.

## Migration and backfill

1. Prisma migration adds the tables and columns above.
2. `prisma/backfill-rich-text.ts` converts every non-null `description` and `body` into a TipTap doc: blank lines become paragraphs, single newlines become hard breaks. Idempotent — rows whose JSON column is already set are skipped. Runnable repeatedly and reused by the seed.
3. Read paths use `bodyJson ?? body` from day one, so the application is correct whether or not the backfill has run.
4. `prisma/seed.ts` gains rich-text sample content, a few worklogs, and estimates so the UI has realistic data.

## Testing

**Unit (vitest)**
- `duration.test.ts` — table of ~25 cases including every unit, combinations, bare numbers, and every rejection path.
- `estimates.test.ts` — the full matrix above: 3 operations × 4 modes, plus null-remaining and clamp-at-zero edges.
- `editor/text.test.ts` — plaintext extraction across nesting, code blocks, tables, hard breaks; mention extraction including duplicates and nested nodes.
- `editor/validate.test.ts` — rejects unknown node types, oversized docs, over-deep nesting.
- `worklogs.test.ts` — mocked Prisma (existing `lib/invites.test.ts` pattern): rollup correctness, `recomputeTimeSpent` equals sum, permission denial for a non-author non-admin, history rows written.
- `jql.test.ts` — new fields and operators; existing cases still pass.

**Component**
- `RichEditor` mounts and mention suggestion filters members.
- `LogWorkDialog` validates bad durations, switches modes, and submits parsed seconds.
- `TimeTrackingBar` segment widths for under, exact, and over cases.
- `CommentItem` reaction toggle and "Edited" affordance.

**E2E (Playwright)**
- Log work → bar updates → entry visible in the Worklog tab.
- Edit that worklog → spent and remaining both recalculate.
- Comment containing a mention → recipient's notification appears.
- Reaction persists across reload.
- Rich description with a list and a code block persists across reload.

## Quality bar

`npm test` green, `npx tsc --noEmit` clean, `npx playwright test` green including pre-existing suites, no raw hex colors (design tokens only, per the V2-1 sweep), every new surface correct in both light and dark themes, and a fidelity pass against real Jira for the Log Work dialog, the time-tracking panel, and the comment block.

## Risks

| Risk | Mitigation |
|---|---|
| TipTap bundle weight on the issue page | Editor dynamically imported, `ssr: false`; renderer is dependency-free |
| Denormalized `timeSpentSeconds` drifts | Same-transaction updates plus `recomputeTimeSpent` reconciler and its test |
| `IssueDetail` split breaks board/table imports | Grep all importers before the split; the existing e2e suite must stay green |
| Crafted document JSON reaching the DOM | Allowlist walker for rendering, allowlist validation on write, no `dangerouslySetInnerHTML` anywhere |
| Worklog dates off by a day for users outside the site timezone | Store UTC, convert only at display and picker boundaries; explicit test |

## Follow-ups this phase deliberately leaves open

**Immediately before or alongside V2-3a**
- V2-1 Task 8 (`e2e/chrome.spec.ts`) is written but untracked and never run; Task 9 (fidelity pass against real Jira) never happened. V2-1 is not actually closed.
- No CI: there is no `.github/workflows`, so tests and typecheck run only when someone remembers locally.
- No progress ledger, although plans instruct "update ledger". A `docs/WORKLOG.md` tracking phase and task state would fix the recurring "where did we stop" problem.

**Product gaps not yet owned by any phase**
- Email transport for notifications (in-app only today) — nominally V2-9, unspecified.
- Global timezone and locale handling beyond the worklog case.
- Soft delete, trash, and restore for issues and projects.
- Audit log for administrative actions.
- Rate limiting on server actions, and upload size limits once attachments land.
- Accessibility pass: dialog focus management, keyboard reachability of the activity tabs, an accessible text alternative for the time-tracking bar.
- CSV export and import, and a backup and restore story.
- Mobile and narrow-viewport behavior for the new chrome and the issue view.
