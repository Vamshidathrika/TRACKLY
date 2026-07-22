# Developing Trackly

Everything a new contributor needs beyond the [README](README.md) quick start.

---

## Architecture

Next.js **App Router**. Nearly everything is a Server Component; client
components are opt-in with `"use client"` and used only where interactivity
demands it.

**Data flows one way:**

```
Server Component (page.tsx)
  → lib/*.ts          reads from the database
  → renders UI

Client Component
  → server action (actions.ts)
     → lib/*.ts       writes to the database
     → revalidatePath()
  → router.refresh()  re-renders with fresh server data
```

### The rule that matters most

**Server actions own all writes. Client components never hold server state.**

A client component may keep an optimistic copy for responsiveness, but the
database is the source of truth and `router.refresh()` reconciles it. Deriving
displayed values from local `useState` that was seeded once is how this codebase
previously ended up with panels that looked functional but persisted nothing.

Correct:

```tsx
// Derived from server data — survives refresh, correct after revalidation.
const workLogs = issue.workLogs ?? [];
const loggedHours = workLogs.reduce((sum, w) => sum + Number(w.hours), 0);
```

Wrong:

```tsx
// Drifts from the database the moment anything changes.
const [loggedHours, setLoggedHours] = useState(4.5);
```

### Layers

| Path | Responsibility |
|---|---|
| `app/**/page.tsx` | Server Components. Fetch data, pass it down. No business logic. |
| `app/**/actions.ts` | Server actions. Auth check, validate, write, revalidate. |
| `lib/*.ts` | Business logic and Prisma queries. Pure and unit-tested. |
| `components/**` | Presentation. Receives data as props. |
| `prisma/schema.prisma` | The data model. Changing it is a deliberate act. |

---

## Conventions

### Server actions

Every action follows the same shape:

```ts
export async function doThingAction(id: string, value: string) {
  const user = await getAuthUser();          // 1. authenticate
  if (!value.trim()) return { error: "..." }; // 2. validate

  try {
    const row = await prisma.thing.findUnique({ where: { id } });
    if (!row) return { error: "..." };        // 3. guard missing rows

    await prisma.thing.update({ /* ... */ });  // 4. write

    revalidatePath(`/projects/${row.project.key}`); // 5. revalidate
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;                                   // NEXT_REDIRECT must propagate
  }
}
```

**Return errors, don't throw them.** The caller surfaces `res.error` in the UI.
Throwing hits the error boundary and loses the user's context.

**Never rely on hiding a button for authorisation.** Server actions are POST-able
directly. If something must not happen in production, guard it inside the action
(see `demoLoginAction`).

**Ownership checks belong in the action**, not the component — for example, only
a work log's author may delete it.

### Client components

- `useTransition` for action calls, so the UI can show pending state
- Surface `res.error` inline; don't swallow it
- `router.refresh()` after a successful write

### Naming

- Server actions end in `Action` — `logWorkAction`, `deleteAttachmentAction`
- `lib/` functions are plain verbs — `createInvite`, `getIssueByKey`

---

## Adding a feature

Worked example: adding a field to an issue.

1. **Schema** — add the column to `prisma/schema.prisma`
2. **Push** — `npm run db:push` (see the migrations warning below)
3. **Query** — include it in `getIssueByKey` in `lib/issues.ts`
4. **Action** — extend `updateIssueFieldAction`'s union type and its handling
5. **UI** — render it, call the action, `router.refresh()`
6. **Verify** — change it in the browser, then confirm in the database:

```bash
npm run db:studio
```

Step 6 is not optional. "It renders" and "it persists" are different claims, and
only the second one matters.

---

## Database

### Use `db push`, not `migrate dev`

```bash
npm run db:push     # correct
npx prisma migrate dev   # DO NOT RUN
```

`prisma/migrations/` has drifted from the live schema. `migrate dev` detects the
drift and demands a full reset, which **drops all data**. Use `db push` until
someone squashes a fresh migration baseline.

### Schema portability

The schema targets both PostgreSQL and CockroachDB. Keep it that way:

- Use `cuid()` for IDs, never `autoincrement()`
- Avoid `@db.*` native type annotations
- Ticket numbers are derived from `max(number) + 1`, which can collide under
  concurrency — the create is wrapped in a retry on `P2002`. Any new code doing
  the same needs the same guard.

---

## Testing

```bash
npm test          # Vitest — lib/ logic, components
npm run e2e       # Playwright — browser flows
npm run typecheck
npm run lint
```

`lib/` is where logic lives, so that's where unit tests earn their keep. Tests
mock Prisma; they don't need a database.

Before opening a PR, all four commands should pass. Lint currently reports
warnings (unused imports, `any` on Prisma payloads) but **zero errors** — keep it
that way.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `PageNotFoundError` during `npm run build` | A dev server is running and contending over `.next`. `pkill -f next-server`, `rm -rf .next`, rebuild. |
| Dev server starts on 3001, 3002… | Stray Next processes. `pkill -f next-server`. Matters because OAuth redirect URIs are port-exact. |
| `ENOENT .next/routes-manifest.json`, 500s everywhere | Corrupted build output. `rm -rf .next` and restart. |
| Google sign-in returns `redirect_uri_mismatch` | The exact callback URL isn't registered in Google Cloud Console. See [DEPLOY.md](DEPLOY.md). |
| "Continue with Google" missing | `AUTH_GOOGLE_ID` is unset. The button hides itself rather than 500. |
| Uploads say storage isn't configured | `BLOB_READ_WRITE_TOKEN` is unset. Expected without a Blob store. |
| A change renders but doesn't survive refresh | The component is holding server state locally. See the rule above. |

---

## Before you commit

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Commit messages: `type(scope): summary` — `feat`, `fix`, `chore`, `docs`, `test`.
Explain *why* in the body, not just what; the diff already says what.
