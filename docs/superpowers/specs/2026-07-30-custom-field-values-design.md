# Custom Field Values — Design Spec

**Date**: 2026-07-30
**Status**: Approved, pending implementation plan

## Context

Research into Jira Cloud's real architecture (2026-07-30, see session notes) surfaced that
Jira stores custom field values in dedicated per-field-type tables, not a JSON blob.
Checking Trackly's actual schema against that raised a more basic finding: Trackly's
`CustomField` model only stores field *definitions* (name, type, required, per project).
There is no value storage at all. `lib/custom-fields.ts` has a full `CustomFieldValue`
TypeScript interface, a validator, and a formatter — but no Prisma model backs any of it,
nothing persists a value, nothing reads one. An issue cannot actually carry a custom
field value anywhere in the system today.

This spec covers adding that missing storage layer, end to end: schema, write path,
read path, and JQL filter/sort support (confirmed required, not display-only).

## Decision: EAV table with typed columns (not JSONB)

`lib/jql.ts`'s `parseJQLToPrisma` emits Prisma `where` objects directly against a fixed
set of built-in fields — not raw SQL. Filtering/sorting on custom field values needs to
plug into that same Prisma-relation-filter shape. A single JSONB value column would force
per-type JSON-path queries (clunky, and CockroachDB's Prisma JSONB filter support has real
gaps); a denormalized blob on `Issue` would need per-field expression indexes to be
filterable at all. A relational table with one typed column per value kind — matching
what Jira itself does in production — is indexable per type with plain Prisma `where`
clauses and needs no JSON-path querying anywhere.

Rejected alternatives (and why) are recorded above; not repeating the two rejected
approaches' setup here since the recommendation is unambiguous.

## Schema

Additive only. New model:

```prisma
model CustomFieldValue {
  id             String    @id @default(cuid())
  fieldId        String
  issueId        String
  valueText      String?
  valueNumber    Float?
  valueDate      DateTime?
  valueBoolean   Boolean?
  valueTextArray String[]  @default([])
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  field          CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  issue          Issue       @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@unique([issueId, fieldId])
  @@index([fieldId, valueText])
  @@index([fieldId, valueNumber])
  @@index([fieldId, valueDate])
}
```

One row per issue×field — the unique constraint on `[issueId, fieldId]` gives upsert
semantics for free. `CustomField` and `Issue` both need the back-relation
(`values CustomFieldValue[]` / `customFieldValues CustomFieldValue[]`).

Which column is populated is decided by `CustomFieldType` (already defined in
`lib/custom-fields.ts`):

| CustomFieldType | Column |
|---|---|
| TEXT, TEXTAREA, URL, SELECT, USER, LABEL | `valueText` |
| NUMBER | `valueNumber` |
| DATE | `valueDate` |
| CHECKBOX | `valueBoolean` |
| MULTI_SELECT | `valueTextArray` |

`onDelete: Cascade` on both relations — deleting a `CustomField` or an `Issue` cleans up
its values, no orphans possible.

## Components

- **`lib/custom-fields.ts`** — add `columnForType(type)` and `toPrismaValue(definition, value)`
  as new pure functions, same file as the existing `validateCustomFieldValue`/
  `formatCustomFieldValue`. Unit-tested the same way as the rest of that file.
- **New server action** (new file `lib/custom-field-values.ts` + a thin `"use server"`
  wrapper, following the pattern already established in
  `app/(app)/projects/[key]/issues/actions.ts`) — `setCustomFieldValueAction(issueId,
  fieldId, value)`.
- **UI** — issue detail page and Kanban drawer sidebar render the project's configured
  `CustomField` rows with a type-appropriate input, calling the new action on change.

## Data flow

**Write**: sidebar input → `setCustomFieldValueAction` → `validateCustomFieldValue`
(server-side, not just client) → `checkProjectAccess` (same pattern as every other
issue-field write this session) → upsert `CustomFieldValue` on `[issueId, fieldId]` →
optional `IssueHistory` entry, mirroring how `updateIssue` logs other field edits →
`revalidatePath`.

**Read**: `getIssueDetail` (`lib/dal/issue-detail.ts`) and `getIssueByKey` (`lib/issues.ts`)
currently have no `customFieldValues` in their `include` — both need
`customFieldValues: { include: { field: true } }` added so the issue detail page and
drawer can render saved values.

**Filter (JQL)**: `parseJQLToPrisma` stays pure/sync — no DB access inside it. Its
signature grows an optional lookup:

```ts
parseJQLToPrisma(jql: string, customFields?: Map<string, { id: string; type: CustomFieldType }>)
```

When a clause's field name isn't one of the hardcoded built-ins (`project`, `key`,
`type`, `status`, `priority`, `summary`, `text`), check the map. If found, emit
`customFieldValues: { some: { fieldId, valueText: val } }` (or `valueNumber`/`valueDate`
per the field's type). The caller — the search/filter action — fetches the project's
`CustomField` rows once and builds the map; the parser itself never touches Prisma or
the network, keeping it exactly as testable as it is today.

## Error handling

- `validateCustomFieldValue` (existing) runs server-side inside the action — the
  boundary discipline every other write path in this session already follows
  (description, comments).
- Access check is the same `resolveAccessibleIssue`/`checkProjectAccess` shape used by
  `updateIssueFieldAction` and `postCommentAction`.
- **Known, deliberately unsolved edge case**: if an admin changes a `CustomField`'s
  `fieldType` after values already exist (e.g. TEXT → NUMBER), old rows keep whatever
  typed column they were written to; new writes go to the new column; display code
  shows whichever is non-null. Not auto-migrated — Jira itself treats a field-type
  change as a heavy, mostly-manual operation. YAGNI: not solving this until someone
  actually needs it.
- Deleting a `CustomField` cascades to its values via `onDelete: Cascade` — no orphan
  cleanup code needed.

## Testing

- `columnForType` / `toPrismaValue` — pure unit tests in `lib/custom-fields.test.ts`,
  same file/pattern as the existing validator/formatter tests.
- `setCustomFieldValueAction` — mocked-Prisma test, same `vi.mock("../prisma", ...)`
  convention used throughout this session's work (importer, API, editor tests).
- `parseJQLToPrisma`'s new `customFields` param — a custom-field equals clause resolves
  to the correct typed column in the emitted `where` object.

## Out of scope (this spec)

- Workflow Schemes (separate spec, brainstormed next).
- Backfilling/migrating values when a field's type changes.
- Any UI for bulk-editing custom field values across multiple issues at once.
