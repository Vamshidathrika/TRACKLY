# Custom Field Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Trackly issue actually carry a value for the custom fields its project defines — today `CustomField` only stores field *definitions*; no value has ever been persisted.

**Architecture:** New `CustomFieldValue` Prisma model (EAV-style, one row per issue×field, typed columns per value kind — not JSONB) plugs into the existing read/write/JQL-filter paths. Field *definitions* are unchanged; this plan is purely the missing value layer.

**Tech Stack:** Next.js 15 Server Actions, Prisma, PostgreSQL/CockroachDB, Vitest.

## Global Constraints

- Schema changes are additive only — no renames, no drops, no changed types on existing columns. (Spec: "Schema" section.)
- New Prisma models validate with `npx prisma validate` before push.
- This repo is on CockroachDB. Pushing a brand-new table can trip CockroachDB's `schema_locked` changefeed protection — `prisma db push` fails with `ERROR: this schema change is disallowed because table "X" is locked`. Fix: `ALTER TABLE "X" SET (schema_locked = false);` via `npx prisma db execute --schema prisma/schema.prisma --stdin`, retry the push, then `ALTER TABLE "X" SET (schema_locked = true);` once it succeeds. Applies per-table, one at a time, as each new table gets created by the push.
- Server-side validation is mandatory on every write — reuse the existing `validateCustomFieldValue` (`lib/custom-fields.ts`), never trust client-only validation.
- Access check on every write: `checkProjectAccess(userId, projectId)` from `lib/tenant.ts`, same pattern as every other issue-field write in `app/(app)/projects/[key]/issues/actions.ts`.
- Test convention: pure functions get plain `describe`/`test`/`expect` (see `lib/custom-fields.test.ts`, `lib/jql.test.ts`); anything touching Prisma gets `vi.mock("@/lib/prisma", () => ({ prisma: { ... } }))` (see `lib/api/access.test.ts`).
- Known, deliberately unsolved edge case: if a `CustomField`'s `fieldType` changes after values exist, old rows keep their old typed column populated. Not auto-migrated. Do not build migration logic for this.
- **Out of scope, flagging only — do not fix in this plan**: `components/settings/FieldConfigurationsView.tsx` seeds its field list from a hardcoded demo array and never loads real `CustomField` rows from the DB on page load (new fields get appended to that in-memory array, but a reload loses the merge). This is a pre-existing bug in field *definitions* management, unrelated to value storage. Worth a separate fix, not this plan.
- **Naming collision to be aware of**: `lib/custom-fields.ts` already exports a hand-written TypeScript interface named `CustomFieldValue` (the `{fieldId, issueId, value}` shape). The new Prisma model added in Task 1 is *also* named `CustomFieldValue`, so Prisma will generate a type of the same name under `@prisma/client`. No task in this plan imports both unaliased in the same file, so it doesn't break anything here — but if a future change imports `CustomFieldValue` from both `@prisma/client` and `./custom-fields` in one file, alias one of them (`import type { CustomFieldValue as CustomFieldValueRecord } from "@prisma/client"`) rather than renaming either existing export.

---

### Task 1: Schema — `CustomFieldValue` model

**Files:**
- Modify: `prisma/schema.prisma` (append new model after `model Star` block ends around line 465; add one back-relation line each to `model CustomField` at line 443 and `model Issue` at line 248)

**Interfaces:**
- Produces: Prisma model `CustomFieldValue` with fields `id, fieldId, issueId, valueText, valueNumber, valueDate, valueBoolean, valueTextArray, createdAt, updatedAt`, unique on `[issueId, fieldId]`.

- [ ] **Step 1: Add the model**

Append to `prisma/schema.prisma` (after the `model Star { ... }` block):

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

- [ ] **Step 2: Add back-relations**

In `model CustomField` (around line 443-453), add one line inside the model body:

```prisma
model CustomField {
  id        String   @id @default(cuid())
  projectId String
  name      String
  fieldType String   @default("STRING")
  required  Boolean  @default(false)
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  values    CustomFieldValue[]

  @@index([projectId])
}
```

In `model Issue` (around line 248-302), add one line among the other relation fields (near `linksIn`, before the closing `@@unique`/`@@index` block):

```prisma
  gitBranches      GitBranch[]
  customFieldValues CustomFieldValue[]

  @@unique([projectId, number])
```

- [ ] **Step 3: Validate**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Push to the dev database**

Run: `npm run db:push -- --accept-data-loss`

If it fails with `table "CustomFieldValue" is locked`:

```bash
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
ALTER TABLE "CustomFieldValue" SET (schema_locked = false);
SQL
npm run db:push -- --accept-data-loss
```

Expected eventually: `🚀 Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Re-lock the table**

```bash
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
ALTER TABLE "CustomFieldValue" SET (schema_locked = true);
SQL
```

- [ ] **Step 6: Generate client and verify**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: both exit clean, no output from tsc.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add CustomFieldValue model for custom field storage"
```

---

### Task 2: `lib/custom-fields.ts` — column mapping helpers

**Files:**
- Modify: `lib/custom-fields.ts` (add two functions after `buildDefaultFieldValue`, end of file)
- Test: `lib/custom-fields.test.ts` (add a new `describe` block)

**Interfaces:**
- Consumes: `CustomFieldType` (already exported from this file), `CustomFieldDefinition["type"]`
- Produces: `columnForType(type: CustomFieldType): "valueText" | "valueNumber" | "valueDate" | "valueBoolean" | "valueTextArray"` and `toPrismaValue(definition: CustomFieldDefinition, value: CustomFieldValue["value"]): Record<string, unknown>` — the latter is consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Add to `lib/custom-fields.test.ts` (new `describe` block at the end of the file, after the existing ones):

```ts
describe("column mapping", () => {
  test("columnForType maps every field type to exactly one column", () => {
    expect(columnForType("TEXT")).toBe("valueText");
    expect(columnForType("TEXTAREA")).toBe("valueText");
    expect(columnForType("URL")).toBe("valueText");
    expect(columnForType("SELECT")).toBe("valueText");
    expect(columnForType("USER")).toBe("valueText");
    expect(columnForType("LABEL")).toBe("valueText");
    expect(columnForType("NUMBER")).toBe("valueNumber");
    expect(columnForType("DATE")).toBe("valueDate");
    expect(columnForType("CHECKBOX")).toBe("valueBoolean");
    expect(columnForType("MULTI_SELECT")).toBe("valueTextArray");
  });

  test("toPrismaValue writes a NUMBER field to valueNumber only", () => {
    const field = baseField({ type: "NUMBER" });
    const data = toPrismaValue(field, 5);
    expect(data).toEqual({ valueNumber: 5 });
  });

  test("toPrismaValue writes a TEXT field to valueText only", () => {
    const field = baseField({ type: "TEXT" });
    const data = toPrismaValue(field, "hello");
    expect(data).toEqual({ valueText: "hello" });
  });

  test("toPrismaValue writes a DATE field as a Date instance", () => {
    const field = baseField({ type: "DATE" });
    const data = toPrismaValue(field, "2026-08-01");
    expect(data.valueDate).toBeInstanceOf(Date);
  });

  test("toPrismaValue writes a CHECKBOX field to valueBoolean only", () => {
    const field = baseField({ type: "CHECKBOX" });
    const data = toPrismaValue(field, true);
    expect(data).toEqual({ valueBoolean: true });
  });

  test("toPrismaValue writes a MULTI_SELECT field to valueTextArray only", () => {
    const field = baseField({ type: "MULTI_SELECT" });
    const data = toPrismaValue(field, ["Production", "Staging"]);
    expect(data).toEqual({ valueTextArray: ["Production", "Staging"] });
  });

  test("toPrismaValue on a null value clears the mapped column", () => {
    const field = baseField({ type: "TEXT" });
    const data = toPrismaValue(field, null);
    expect(data).toEqual({ valueText: null });
  });
});
```

Update the import at the top of `lib/custom-fields.test.ts` to include the two new functions:

```ts
import {
  validateCustomFieldValue,
  formatCustomFieldValue,
  buildDefaultFieldValue,
  getFieldTypeIcon,
  SYSTEM_FIELD_TEMPLATES,
  CustomFieldDefinition,
  columnForType,
  toPrismaValue,
} from "./custom-fields";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/custom-fields.test.ts`
Expected: FAIL — `columnForType is not a function` / `toPrismaValue is not a function`

- [ ] **Step 3: Implement**

Append to `lib/custom-fields.ts` (after `buildDefaultFieldValue`, end of file):

```ts
// ─── Prisma Column Mapping ─────────────────────────────────────────────────

export type CustomFieldValueColumn =
  | "valueText"
  | "valueNumber"
  | "valueDate"
  | "valueBoolean"
  | "valueTextArray";

/** Which CustomFieldValue column a given field type is stored in. */
export function columnForType(type: CustomFieldType): CustomFieldValueColumn {
  switch (type) {
    case "NUMBER":
      return "valueNumber";
    case "DATE":
      return "valueDate";
    case "CHECKBOX":
      return "valueBoolean";
    case "MULTI_SELECT":
      return "valueTextArray";
    case "TEXT":
    case "TEXTAREA":
    case "URL":
    case "SELECT":
    case "USER":
    case "LABEL":
      return "valueText";
  }
}

/**
 * Builds the Prisma `data` fragment for one field's value — exactly one
 * column populated, matching `columnForType`. `null` clears the mapped
 * column (writes null, doesn't touch the others).
 */
export function toPrismaValue(
  definition: CustomFieldDefinition,
  value: CustomFieldValue["value"]
): Record<string, unknown> {
  const column = columnForType(definition.type);

  if (column === "valueDate") {
    return { valueDate: value === null || value === undefined ? null : new Date(value as string) };
  }
  if (column === "valueTextArray") {
    return { valueTextArray: Array.isArray(value) ? value : [] };
  }
  return { [column]: value ?? null };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/custom-fields.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/custom-fields.ts lib/custom-fields.test.ts
git commit -m "feat(custom-fields): add columnForType/toPrismaValue mapping helpers"
```

---

### Task 3: `lib/custom-field-values.ts` — DB read/write functions

**Files:**
- Create: `lib/custom-field-values.ts`
- Test: `lib/custom-field-values.test.ts`

**Interfaces:**
- Consumes: `toPrismaValue` (Task 2), `prisma` client (`@/lib/prisma`)
- Produces: `setCustomFieldValue(input: { issueId: string; field: CustomFieldDefinition; value: CustomFieldValue["value"] }): Promise<void>` — consumed by Task 4's server action. (No separate read function here: Task 5 embeds `customFieldValues` directly into the existing issue-detail queries, so Task 6's UI reads off that, not a standalone fetch. Keeping this file write-only avoids a second, unused read path.)

- [ ] **Step 1: Write the failing tests**

Create `lib/custom-field-values.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customFieldValue: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { setCustomFieldValue } from "./custom-field-values";
import type { CustomFieldDefinition } from "./custom-fields";

const field = (overrides: Partial<CustomFieldDefinition> = {}): CustomFieldDefinition => ({
  id: "field-1",
  projectId: "proj-1",
  name: "Story Points",
  type: "NUMBER",
  required: false,
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setCustomFieldValue", () => {
  it("upserts on [issueId, fieldId] with only the mapped column set", async () => {
    await setCustomFieldValue({ issueId: "issue-1", field: field(), value: 5 });

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
      where: { issueId_fieldId: { issueId: "issue-1", fieldId: "field-1" } },
      create: { issueId: "issue-1", fieldId: "field-1", valueNumber: 5 },
      update: { valueNumber: 5 },
    });
  });

  it("upserts a TEXT field to valueText", async () => {
    await setCustomFieldValue({ issueId: "issue-1", field: field({ id: "field-2", type: "TEXT" }), value: "hello" });

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
      where: { issueId_fieldId: { issueId: "issue-1", fieldId: "field-2" } },
      create: { issueId: "issue-1", fieldId: "field-2", valueText: "hello" },
      update: { valueText: "hello" },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/custom-field-values.test.ts`
Expected: FAIL — module `./custom-field-values` not found.

- [ ] **Step 3: Implement**

Create `lib/custom-field-values.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { toPrismaValue, type CustomFieldDefinition, type CustomFieldValue } from "./custom-fields";

/**
 * Upserts one issue×field value row. `field` must be the field's current
 * definition — the caller (the server action) is responsible for fetching
 * it and running it through `validateCustomFieldValue` first; this function
 * does not validate, it only maps and persists.
 */
export async function setCustomFieldValue(input: {
  issueId: string;
  field: CustomFieldDefinition;
  value: CustomFieldValue["value"];
}): Promise<void> {
  const data = toPrismaValue(input.field, input.value);

  await prisma.customFieldValue.upsert({
    where: { issueId_fieldId: { issueId: input.issueId, fieldId: input.field.id } },
    create: { issueId: input.issueId, fieldId: input.field.id, ...data },
    update: data,
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/custom-field-values.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (this task requires Task 1's schema to already be pushed and `prisma generate` to have run — the `prisma.customFieldValue` delegate must exist on the real client for this file to typecheck against it, even though the test mocks it).

- [ ] **Step 6: Commit**

```bash
git add lib/custom-field-values.ts lib/custom-field-values.test.ts
git commit -m "feat(custom-fields): add setCustomFieldValue"
```

---

### Task 4: Server action — `setCustomFieldValueAction`

**Files:**
- Modify: `app/(app)/projects/[key]/issues/actions.ts` (add new export near `updateIssueDescriptionAction`)
- Test: `app/(app)/projects/[key]/issues/actions.test.ts` (create if it does not already exist — check first with `ls "app/(app)/projects/[key]/issues/"`)

**Interfaces:**
- Consumes: `setCustomFieldValue` (Task 3), `validateCustomFieldValue` (`lib/custom-fields.ts`, already exists), `checkProjectAccess` (`lib/tenant.ts`), `getAuthUser` (`@/lib/auth`), `prisma` (`@/lib/prisma`)
- Produces: `setCustomFieldValueAction(issueId: string, fieldId: string, value: unknown): Promise<{ success: true } | { error: string }>` — consumed by Task 6 (UI).

- [ ] **Step 1: Write the failing test**

Check whether `app/(app)/projects/[key]/issues/actions.test.ts` already exists:

Run: `ls "app/(app)/projects/[key]/issues/" | grep test`

If it exists, add the block below to it. If not, create it with this content (imports at top match the mocking convention from `lib/api/access.test.ts`):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    issue: { findUnique: vi.fn() },
    customField: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/auth", () => ({ getAuthUser: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ checkProjectAccess: vi.fn() }));
vi.mock("@/lib/custom-field-values", () => ({ setCustomFieldValue: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { checkProjectAccess } from "@/lib/tenant";
import { setCustomFieldValue } from "@/lib/custom-field-values";
import { setCustomFieldValueAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  (getAuthUser as any).mockResolvedValue({ id: "user-1", name: "Test User" });
});

describe("setCustomFieldValueAction", () => {
  it("rejects when the caller has no project access", async () => {
    (prisma.issue.findUnique as any).mockResolvedValue({ projectId: "proj-1" });
    (checkProjectAccess as any).mockResolvedValue(null);

    const result = await setCustomFieldValueAction("issue-1", "field-1", "hello");

    expect(result).toEqual({ error: "You do not have access to this issue" });
    expect(setCustomFieldValue).not.toHaveBeenCalled();
  });

  it("rejects an unknown field id", async () => {
    (prisma.issue.findUnique as any).mockResolvedValue({ projectId: "proj-1" });
    (checkProjectAccess as any).mockResolvedValue({ projectId: "proj-1" });
    (prisma.customField.findUnique as any).mockResolvedValue(null);

    const result = await setCustomFieldValueAction("issue-1", "field-missing", "hello");

    expect(result).toEqual({ error: "Custom field not found" });
    expect(setCustomFieldValue).not.toHaveBeenCalled();
  });

  it("rejects a value that fails validation", async () => {
    (prisma.issue.findUnique as any).mockResolvedValue({ projectId: "proj-1" });
    (checkProjectAccess as any).mockResolvedValue({ projectId: "proj-1" });
    (prisma.customField.findUnique as any).mockResolvedValue({
      id: "field-1", projectId: "proj-1", name: "Story Points", fieldType: "NUMBER", required: false, createdAt: new Date(),
    });

    const result = await setCustomFieldValueAction("issue-1", "field-1", "not-a-number");

    expect(result).toEqual({ error: 'Field "Story Points" must be a valid number.' });
    expect(setCustomFieldValue).not.toHaveBeenCalled();
  });

  it("persists a valid value", async () => {
    (prisma.issue.findUnique as any).mockResolvedValue({ projectId: "proj-1" });
    (checkProjectAccess as any).mockResolvedValue({ projectId: "proj-1" });
    (prisma.customField.findUnique as any).mockResolvedValue({
      id: "field-1", projectId: "proj-1", name: "Story Points", fieldType: "NUMBER", required: false, createdAt: new Date(),
    });

    const result = await setCustomFieldValueAction("issue-1", "field-1", 5);

    expect(result).toEqual({ success: true });
    expect(setCustomFieldValue).toHaveBeenCalledWith({
      issueId: "issue-1",
      field: expect.objectContaining({ id: "field-1", type: "NUMBER" }),
      value: 5,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "app/(app)/projects/[key]/issues/actions.test.ts"`
Expected: FAIL — `setCustomFieldValueAction is not exported`

- [ ] **Step 3: Implement**

Add to `app/(app)/projects/[key]/issues/actions.ts`, after `updateIssueDescriptionAction` (which ends around line 175 as of this session's earlier work).

Add these two imports near the top of the file alongside the other `@/lib/*` imports (check first — do not duplicate if a similarly-named import already exists):

```ts
import { validateCustomFieldValue, type CustomFieldDefinition } from "@/lib/custom-fields";
import { setCustomFieldValue } from "@/lib/custom-field-values";
```

Then add the action itself:

```ts
export async function setCustomFieldValueAction(issueId: string, fieldId: string, value: unknown) {
  const user = await getAuthUser();

  try {
    const target = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });
    if (!target) return { error: "Issue not found" };

    const access = await checkProjectAccess(user.id, target.projectId);
    if (!access) return { error: "You do not have access to this issue" };

    const field = await prisma.customField.findUnique({ where: { id: fieldId } });
    if (!field || field.projectId !== target.projectId) return { error: "Custom field not found" };

    const definition = {
      id: field.id,
      projectId: field.projectId,
      name: field.name,
      type: field.fieldType as CustomFieldDefinition["type"],
      required: field.required,
      createdAt: field.createdAt,
    };

    const validation = validateCustomFieldValue(definition, value as any);
    if (!validation.valid) return { error: validation.errors[0] };

    await setCustomFieldValue({ issueId, field: definition, value: value as any });

    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
```

Note the `field.projectId !== target.projectId` check — this is the tenant-scoping guard: without it, a caller could pass a `fieldId` belonging to a *different* project (or a different site entirely) and have its value silently attached to this issue. Every write path this session enforces this shape of check; do not skip it here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "app/(app)/projects/[key]/issues/actions.test.ts"`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/projects/[key]/issues/actions.ts" "app/(app)/projects/[key]/issues/actions.test.ts"
git commit -m "feat(issues): add setCustomFieldValueAction"
```

---

### Task 5: Read path — include `customFieldValues`

**Files:**
- Modify: `lib/dal/issue-detail.ts` (drawer's data source)
- Modify: `lib/issues.ts` (full page's data source, `getIssueByKey`)

**Interfaces:**
- Consumes: Task 1's schema (the `customFieldValues` relation must exist).
- Produces: both `getIssueDetail(...)` and `getIssueByKey(...)` return objects gain a `customFieldValues: Array<{ id, fieldId, valueText, valueNumber, valueDate, valueBoolean, valueTextArray, field: { id, name, fieldType } }>` field — consumed by Task 6 (UI).

- [ ] **Step 1: Update `getIssueByKey`'s include block**

In `lib/issues.ts`, inside `getIssueByKey`'s `prisma.issue.findFirst({ ..., include: { ... } })` (the include block that already has `linksOut`), add:

```ts
      linksOut: {
        include: {
          targetIssue: { select: { id: true, key: true, summary: true, status: true, type: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      customFieldValues: {
        include: { field: { select: { id: true, name: true, fieldType: true } } },
      },
    },
  });
```

`getIssueByKey` returns the raw Prisma object (not a hand-shaped literal), so this is the only change needed here — `customFieldValues` will flow through automatically.

- [ ] **Step 2: Update `getIssueDetail`'s include AND return shape**

`lib/dal/issue-detail.ts` is different: it hand-copies fields into an explicit return object (this is the same pattern that dropped `descriptionJson` earlier this session — don't repeat that mistake here). Two edits needed.

First, add to the `include` block (near `linksIn`, the last relation before the closing brace at line 62):

```ts
      linksIn: {
        include: {
          sourceIssue: { select: { id: true, key: true, summary: true, status: true, type: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      customFieldValues: {
        include: { field: { select: { id: true, name: true, fieldType: true } } },
      },
    },
  });
```

Second, add to the explicit return object (near `watchers`, the last field before the closing brace around line 131-133):

```ts
    watchers: issue.watchers,
    isWatching: issue.watchers.some((w) => w.userId === userId),
    customFieldValues: issue.customFieldValues,
  };
});
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: all existing tests still pass (no test currently asserts on the shape of these two functions' return objects, so this step is a regression check, not a new-test step).

- [ ] **Step 5: Commit**

```bash
git add lib/dal/issue-detail.ts lib/issues.ts
git commit -m "feat(issues): include customFieldValues in issue detail reads"
```

---

### Task 6: UI — shared `CustomFieldsSection` component

**Files:**
- Create: `components/issues/CustomFieldsSection.tsx`
- Modify: `components/issues/IssueDetail.tsx` (full issue page — wire in)
- Modify: `components/board/issue-detail/IssueSidebar.tsx` (drawer — wire in)
- Modify: `app/(app)/projects/[key]/issues/[issueKey]/page.tsx` (fetch `customFields` for the project, pass down)
- Modify: `app/(app)/projects/[key]/board/page.tsx` (fetch `customFields` for the project, pass down)
- Modify: `components/board/KanbanBoard.tsx` (thread `customFields` prop through to `IssueDetailDrawer`)
- Modify: `components/board/IssueDetailDrawer.tsx` (thread `customFields` prop through to `IssueSidebar`)

This task has no isolated unit test of its own — `CustomFieldsSection` is a thin rendering + call-the-action component, and its logic (validation, persistence) is already covered by Tasks 2-4's tests. Verification for this task is `tsc --noEmit` + `vitest run` (regression) + a manual smoke check, called out in Step 6 below.

**Interfaces:**
- Consumes: `setCustomFieldValueAction` (Task 4), the `customFieldValues` shape from Task 5's reads, `formatCustomFieldValue`/`CustomFieldType` (`lib/custom-fields.ts`, already exist).
- Produces: `<CustomFieldsSection issueId={string} fields={CustomFieldDefinition[]} values={{fieldId, valueText, valueNumber, valueDate, valueBoolean, valueTextArray}[]} />`, a self-contained rendering unit — its parent doesn't need to know the value-shape details, just pass fields + values through.

- [ ] **Step 1: Create the component**

Create `components/issues/CustomFieldsSection.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { setCustomFieldValueAction } from "@/app/(app)/projects/[key]/issues/actions";
import type { CustomFieldType } from "@/lib/custom-fields";

export type CustomFieldDef = {
  id: string;
  name: string;
  fieldType: string;
  required: boolean;
};

export type CustomFieldValueRow = {
  fieldId: string;
  valueText: string | null;
  valueNumber: number | null;
  valueDate: Date | string | null;
  valueBoolean: boolean | null;
  valueTextArray: string[];
};

function valueForField(fieldId: string, values: CustomFieldValueRow[]): unknown {
  const row = values.find((v) => v.fieldId === fieldId);
  if (!row) return null;
  return (
    row.valueText ??
    row.valueNumber ??
    (row.valueDate ? new Date(row.valueDate).toISOString().split("T")[0] : null) ??
    row.valueBoolean ??
    (row.valueTextArray.length ? row.valueTextArray : null)
  );
}

export function CustomFieldsSection({
  issueId,
  fields,
  values,
}: {
  issueId: string;
  fields: CustomFieldDef[];
  values: CustomFieldValueRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localValues, setLocalValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f.id] = valueForField(f.id, values);
    return initial;
  });

  if (fields.length === 0) return null;

  const handleChange = (fieldId: string, value: unknown) => {
    setLocalValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => ({ ...prev, [fieldId]: "" }));
    startTransition(async () => {
      const result = await setCustomFieldValueAction(issueId, fieldId, value);
      if ("error" in result) {
        setErrors((prev) => ({ ...prev, [fieldId]: result.error }));
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wide">Custom Fields</h3>
      {fields.map((field) => {
        const type = field.fieldType as CustomFieldType;
        const value = localValues[field.id];
        const error = errors[field.id];

        return (
          <div key={field.id} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-subtle" htmlFor={`cf-${field.id}`}>
              {field.name}
              {field.required && <span className="text-danger ml-0.5">*</span>}
            </label>

            {type === "CHECKBOX" ? (
              <input
                id={`cf-${field.id}`}
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleChange(field.id, e.target.checked)}
                disabled={isPending}
                className="h-4 w-4"
              />
            ) : type === "DATE" ? (
              <input
                id={`cf-${field.id}`}
                type="date"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={isPending}
                className="text-sm rounded-lg border border-border-default px-2 py-1.5 bg-surface"
              />
            ) : type === "NUMBER" ? (
              <input
                id={`cf-${field.id}`}
                type="number"
                value={typeof value === "number" ? value : ""}
                onChange={(e) => handleChange(field.id, e.target.value === "" ? null : Number(e.target.value))}
                disabled={isPending}
                className="text-sm rounded-lg border border-border-default px-2 py-1.5 bg-surface"
              />
            ) : (
              <input
                id={`cf-${field.id}`}
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={isPending}
                className="text-sm rounded-lg border border-border-default px-2 py-1.5 bg-surface"
              />
            )}

            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        );
      })}
    </div>
  );
}
```

Note: SELECT / MULTI_SELECT / URL / USER / LABEL all render through the plain-text-input fallback branch in this first pass — they persist correctly (all map to `valueText`/`valueTextArray` and validate the same as TEXT), they just don't get their own specialized picker UI yet. Flagging this explicitly rather than silently under-building: a dropdown-for-SELECT / multi-chip-for-MULTI_SELECT upgrade is a reasonable follow-up, not required for the value-storage layer to work end-to-end.

- [ ] **Step 2: Wire into the full issue page route**

In `app/(app)/projects/[key]/issues/[issueKey]/page.tsx`, add a `customFields` fetch to the existing `Promise.all`:

```ts
  const [members, sprints, automationRules, customFields] = await Promise.all([
    getUsersForSite(siteId),
    prisma.sprint.findMany({
      where: { projectId: issue.projectId },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.automationRule.findMany({
      where: { projectId: issue.projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.customField.findMany({
      where: { projectId: issue.projectId },
      orderBy: { createdAt: "asc" },
    }),
  ]);
```

And pass it through to `IssueDetail`:

```tsx
      <IssueDetail
        issue={issue}
        currentUserId={userId}
        isAdmin={isAdmin}
        members={members.map((m) => ({ ...m, name: m.name ?? "Teammate" }))}
        sprints={sprints}
        automationRules={automationRules}
        customFields={customFields}
      />
```

- [ ] **Step 3: Wire into `IssueDetail.tsx`**

In `components/issues/IssueDetail.tsx`, add the import and the prop:

```tsx
import { CustomFieldsSection } from "@/components/issues/CustomFieldsSection";
```

Add `customFields = []` to the destructured props and `customFields?: { id: string; name: string; fieldType: string; required: boolean }[];` to the type block (both at the `export function IssueDetail({ ... }: { ... })` signature, currently at line 98-112).

Render it in the sidebar area — find where other sidebar-style fields render (e.g. near where `sprints`/`automationRules` get rendered in the JSX body) and add:

```tsx
<CustomFieldsSection issueId={issue.id} fields={customFields} values={issue.customFieldValues ?? []} />
```

- [ ] **Step 4: Wire into the board route → KanbanBoard → drawer chain**

In `app/(app)/projects/[key]/board/page.tsx`, add `customFields` to the existing `Promise.all`:

```ts
  const [issues, sprints, projectMembers, siteUsers, star, customFields] = await Promise.all([
    getBoardIssues(project.id),
    getSprintsByProject(project.id),
    import("@/lib/projects").then((m) => m.getProjectMembers(project.id)),
    getUsersForSite(project.siteId),
    prisma.star.findUnique({
      where: { userId_projectId: { userId, projectId: project.id } },
    }),
    prisma.customField.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);
```

Pass `customFields={customFields}` to `<KanbanBoard ... />`.

In `components/board/KanbanBoard.tsx`, add `customFields` to the props (mirror the existing `availableUsers?: {...}[]` prop pattern at line 39/49), and pass it through to `<IssueDetailDrawer ... customFields={customFields} />` at its render site (around line 565).

In `components/board/IssueDetailDrawer.tsx`, accept `customFields` as a prop and pass it through to `<IssueSidebar ... customFields={customFields} />`.

- [ ] **Step 5: Wire into `IssueSidebar.tsx`**

In `components/board/issue-detail/IssueSidebar.tsx`, add the import and prop (same shape as Step 3), and render:

```tsx
<CustomFieldsSection issueId={issue.id} fields={customFields} values={issue.customFieldValues ?? []} />
```

Note: the drawer's `issue` prop is the lightweight `BoardIssue` shape, which does not carry `customFieldValues` on first render (same limitation `descriptionJson` had before this session's earlier fix). For this task, render with `issue.customFieldValues ?? []` — it will show empty until the drawer's own detail-fetch effect (`useIssueDetailDrawer.ts`) is *also* extended to sync `customFieldValues`, the same way it now syncs `descriptionJson`. That extension is not included in this task — call it out as a known follow-up in the task's completion note, matching the `descriptionJson` precedent from earlier this session (which needed a dedicated fix pass after the initial read-path task).

- [ ] **Step 6: Typecheck, test, manual smoke**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx vitest run`
Expected: all tests pass (no new tests in this task — smoke-test manually instead, since this is pure UI wiring).

Manual smoke (requires a running dev server and a logged-in session — do this via the project's own dev workflow, not by starting a server blind):
1. Open an issue's full detail page for a project that has at least one `CustomField` defined.
2. Confirm the "Custom Fields" section renders with an input per field.
3. Change a value, confirm no error appears and the value persists across a page reload.
4. Open the same issue via the Kanban board drawer, confirm the section renders (values may be empty per the Step 5 note above — that's expected, not a bug in this task).

- [ ] **Step 7: Commit**

```bash
git add components/issues/CustomFieldsSection.tsx components/issues/IssueDetail.tsx \
  components/board/issue-detail/IssueSidebar.tsx \
  "app/(app)/projects/[key]/issues/[issueKey]/page.tsx" \
  "app/(app)/projects/[key]/board/page.tsx" \
  components/board/KanbanBoard.tsx components/board/IssueDetailDrawer.tsx
git commit -m "feat(issues): render and edit custom field values in issue detail and drawer"
```

---

### Task 7: JQL extension — filter by custom field value

**Files:**
- Modify: `lib/jql.ts`
- Modify: `lib/jql.test.ts`

This task is independent of Tasks 1-6 — `parseJQLToPrisma`'s `where` return type is loosely typed (`Record<string, any>`), so no Prisma schema dependency exists for this file to compile or its tests to pass. Can be done in parallel with any other task.

**Interfaces:**
- Produces: `parseJQLToPrisma(jql: string, customFields?: Map<string, { id: string; type: string }>): Record<string, any>` — signature grows one new optional parameter; existing callers (none pass a second argument today) are unaffected.

- [ ] **Step 1: Write the failing tests**

Add to `lib/jql.test.ts`, inside the existing `describe("jql engine", ...)` block:

```ts
  it("resolves a custom field equals-clause via the customFields map", () => {
    const customFields = new Map([["story points", { id: "field-1", type: "NUMBER" }]]);
    const where = parseJQLToPrisma('"Story Points" = 5', customFields);
    expect(where).toEqual({
      customFieldValues: { some: { fieldId: "field-1", valueNumber: 5 } },
    });
  });

  it("resolves a TEXT custom field equals-clause to valueText", () => {
    const customFields = new Map([["environment", { id: "field-2", type: "SELECT" }]]);
    const where = parseJQLToPrisma("Environment = Production", customFields);
    expect(where).toEqual({
      customFieldValues: { some: { fieldId: "field-2", valueText: "Production" } },
    });
  });

  it("ignores an unrecognized field when no customFields map is passed", () => {
    const where = parseJQLToPrisma('"Story Points" = 5');
    expect(where).toEqual({});
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/jql.test.ts`
Expected: FAIL — the new assertions don't match (the field is silently dropped today since it doesn't match any hardcoded `f === "..."` branch).

- [ ] **Step 3: Implement**

In `lib/jql.ts`, update the function signature and the equals-match branch (the file's `containsMatch`/`notEqualsMatch`/`equalsMatch` structure stays the same, but `parseJQLToPrisma` needs the new parameter threaded through its recursive calls):

```ts
export function parseJQLToPrisma(
  jql: string,
  customFields?: Map<string, { id: string; type: string }>
): Record<string, any> {
  const query = jql.trim();
  if (!query) return {};

  // Parse OR conditions
  if (/\s+OR\s+/i.test(query)) {
    const parts = query.split(/\s+OR\s+/i);
    const orConditions = parts
      .map((part) => parseJQLToPrisma(part, customFields))
      .filter((cond) => Object.keys(cond).length > 0);
    if (orConditions.length > 0) {
      return { OR: orConditions };
    }
    return {};
  }

  const clauses = query.split(/\s+AND\s+/i);
  const where: Record<string, any> = {};

  for (const clause of clauses) {
    // Check CONTAINS operator (~ or CONTAINS)
    const containsMatch = clause.match(/^(\w+)\s+(?:~|CONTAINS)\s+["']?([^"']+)["']?$/i);
    if (containsMatch) {
      const [, field, val] = containsMatch;
      const f = field.toLowerCase();
      if (f === "summary" || f === "description" || f === "text") {
        where[f === "text" ? "summary" : f] = { contains: val, mode: "insensitive" };
      }
      continue;
    }

    // Check NOT EQUALS operator (!=)
    const notEqualsMatch = clause.match(/^(\w+)\s*!=\s*["']?([^"']+)["']?$/i);
    if (notEqualsMatch) {
      const [, field, val] = notEqualsMatch;
      const f = field.toLowerCase();
      const norm = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
      const plain = val.trim().toUpperCase();
      if (f === "status") where.status = { not: norm as IssueStatus };
      if (f === "type") where.type = { not: norm as IssueType };
      if (f === "priority") where.priority = { not: norm as IssuePriority };
      if (f === "project") where.project = { key: { not: plain } };
      continue;
    }

    // Check EQUALS operator (=), quoted field name or bare word
    const equalsMatch = clause.match(/^"?([^"=]+?)"?\s*=\s*["']?([^"']+)["']?$/i);
    if (equalsMatch) {
      const [, field, val] = equalsMatch;
      const f = field.trim().toLowerCase();
      const norm = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
      const plain = val.trim().toUpperCase();
      if (f === "status") { where.status = norm as IssueStatus; continue; }
      if (f === "type") { where.type = norm as IssueType; continue; }
      if (f === "priority") { where.priority = norm as IssuePriority; continue; }
      if (f === "project") { where.project = { key: plain }; continue; }
      if (f === "key") { where.key = plain; continue; }

      const customField = customFields?.get(f);
      if (customField) {
        const raw = val.trim();
        const column =
          customField.type === "NUMBER" ? "valueNumber" :
          customField.type === "DATE" ? "valueDate" :
          customField.type === "CHECKBOX" ? "valueBoolean" :
          "valueText";
        const value =
          column === "valueNumber" ? Number(raw) :
          column === "valueDate" ? new Date(raw) :
          column === "valueBoolean" ? raw.toLowerCase() === "true" :
          raw;
        where.customFieldValues = { some: { fieldId: customField.id, [column]: value } };
      }
      continue;
    }
  }

  return where;
}
```

Note the `equalsMatch` regex changed from `/^(\w+)\s*=\s*.../` to `/^"?([^"=]+?)"?\s*=\s*.../` — the original only matched a single bare word (`\w+`) as the field name, which can't match a quoted multi-word custom field name like `"Story Points"`. This is a necessary, minimal widening of the existing regex, not a rewrite — verify the existing built-in-field tests in `lib/jql.test.ts` (status/type/priority/project/key) still pass after this change, since they exercise the same regex.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/jql.test.ts`
Expected: PASS, all tests green, including every pre-existing test in the file (regex change must not break built-in field matching).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/jql.ts lib/jql.test.ts
git commit -m "feat(jql): support filtering by custom field value"
```

---

## Task Dependency Order

- **Task 1 must land first** — every other task either directly needs the `CustomFieldValue` Prisma delegate to exist (Tasks 3, 4, 5, 6) or needs `prisma generate` to have run for `tsc --noEmit` to pass.
- **Task 2** has no dependency on Task 1 (pure TypeScript, no Prisma import) — can be done in parallel with Task 1 if dispatching to parallel subagents, but must land before Task 3 (which imports `toPrismaValue`).
- **Task 7 (JQL)** has no dependency on any other task — fully parallelizable.
- Sequential chain: **1 → 3 → 4 → 6**, with **2** feeding into **3**, and **5** landing any time after **1** (needed before **6**'s manual smoke test shows real values, but doesn't block **6**'s code from being written).
- Suggested parallel dispatch after Task 1 lands: {Task 2 → 3 → 4} as one chain, Task 5 as an independent single task, Task 7 as an independent single task — then Task 6 last, once 4 and 5 are both done.
