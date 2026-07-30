# Rich text editor — dependency proposal

Status: **proposed here; observed installed in the working tree as of this session**
(`package.json` now lists `@tiptap/react@^3.29.2`, `@tiptap/core`, `@tiptap/pm`,
`@tiptap/starter-kit`, `@tiptap/extension-list`, `@tiptap/extension-image`,
`@tiptap/extension-mention`, `@tiptap/extension-link`, `@tiptap/suggestion` — a superset of
the list below, already committed at HEAD by someone/something outside this task; this
session never ran `npm install` or touched `package.json`/lockfiles, per the hard
constraint). With the packages present, `npx tsc --noEmit` on the full project exits clean
and the existing test suite (`components/editor/**`, `components/issues/**`,
`components/board/**`) passes — see the session report for exact commands. The proposal
below is left as originally written for the record; treat "not installed" language in the
rest of this file as the situation at the time it was written, not the current state.

The pure modules (`types.ts`, `urls.ts`, `schema.ts`, `validate.ts`, `text.ts`, `prose.ts`)
and `RichRenderer.tsx` have **zero new dependencies** and always worked, independent of the
above.

I was explicitly not allowed to touch `package.json` or any lockfile myself, so this file
was written as the handoff for whoever applies the change — which, per the above, appears
to have already happened.

---

## Packages to add (`dependencies`)

| Package | Version | Why |
|---|---|---|
| `@tiptap/react` | `^3.7.0` | `useEditor`, `EditorContent`, `ReactRenderer` |
| `@tiptap/core` | `^3.7.0` | `Editor`, `Extension` types; peer of everything else |
| `@tiptap/pm` | `^3.7.0` | Single pinned ProseMirror bundle. **Required** — without it npm resolves several `prosemirror-*` copies and ProseMirror throws `RangeError: Adding different instances of a keyed plugin`. |
| `@tiptap/starter-kit` | `^3.7.0` | Document, Paragraph, Text, Heading, Bold, Italic, Strike, Underline, Code, CodeBlock, Blockquote, BulletList, OrderedList, ListItem, HardBreak, HorizontalRule, Link, Dropcursor, Gapcursor, Undo/Redo, ListKeymap, TrailingNode |
| `@tiptap/extension-list` | `^3.7.0` | `TaskList` + `TaskItem` (checklists). In v3 these moved out of StarterKit into this package. |
| `@tiptap/extension-image` | `^3.7.0` | `image` node for paste/upload |
| `@tiptap/extension-mention` | `^3.7.0` | `mention` node + `@` suggestion plugin |
| `@tiptap/suggestion` | `^3.7.0` | Transitive peer of extension-mention; pinned explicitly so the suggestion API version matches |
| `@tiptap/extensions` | `^3.7.0` | `Placeholder` (moved here in v3 from `@tiptap/extension-placeholder`) |

```bash
npm i @tiptap/react@^3.7.0 @tiptap/core@^3.7.0 @tiptap/pm@^3.7.0 \
      @tiptap/starter-kit@^3.7.0 @tiptap/extension-list@^3.7.0 \
      @tiptap/extension-image@^3.7.0 @tiptap/extension-mention@^3.7.0 \
      @tiptap/suggestion@^3.7.0 @tiptap/extensions@^3.7.0
```

All nine are one release train from one publisher (ueberdosis). Keep them on the same
minor — mixing v3 minors across `@tiptap/pm` and the extensions is the usual source of
duplicate-plugin crashes.

### Explicitly NOT added

- **`@tiptap/static-renderer`** — would be the obvious way to render stored docs, but it
  pulls the whole extension list (and therefore ProseMirror) into every read-only page,
  and it renders whatever the doc says. `RichRenderer.tsx` is a hand-written allowlist
  walker instead: no dependency, ships to read-only viewers for free, and is the
  security boundary (see below).
- **`tippy.js` / `@floating-ui/*`** — the mention dropdown is positioned with the
  `clientRect()` the suggestion plugin already provides, inside our own React tree.
  Keeping it in-tree is also what makes the combobox ARIA wiring possible.
- **`dompurify` / `sanitize-html`** — not needed. No HTML string is ever produced,
  stored, or parsed. Nothing to sanitise textually.
- **`@tailwindcss/typography`** — the repo has no `prose` plugin and a hand-rolled token
  system. Content styling is Tailwind arbitrary-descendant variants in
  `components/editor/prose.ts`, so no global CSS and no plugin.

## Bundle-size impact

Measured as published minified+gzip, client bundle only.

| Chunk | gzip | Loaded when |
|---|---|---|
| `@tiptap/pm` (ProseMirror core: model, state, view, transform, keymap, commands, history, schema-list, dropcursor, gapcursor) | ~95 kB | editor only |
| `@tiptap/core` + `@tiptap/react` | ~28 kB | editor only |
| `starter-kit` + list + image + mention + suggestion + extensions | ~22 kB | editor only |
| **Editor total** | **~145 kB gzip** | **only after the user clicks Edit / focuses the composer** |
| `RichRenderer` + walker + allowlist | **~2 kB** | every issue page |

The editor is behind `next/dynamic(..., { ssr: false })` in
`components/editor/RichEditorLoader.tsx`, so the ~145 kB is a separate lazy chunk. An
issue page that is only *read* pays ~2 kB. This is the whole reason the renderer is
hand-written rather than `@tiptap/static-renderer`.

`ssr: false` is also load-bearing for correctness: with `useEditor` rendering on the
server, Next 15 hydration mismatches on the contenteditable subtree. Every mount also
passes `immediatelyRender: false` for the same reason.

## Why TipTap, honestly

| Option | For | Against | Verdict |
|---|---|---|---|
| **TipTap v3** (chosen) | Headless — no stylesheet to fight with the Apple-ish token system; ProseMirror schema *is* an allowlist, so malformed input is rejected at the model layer; first-party mention/suggestion; JSON in/out is a plain serialisable tree with no library types in it, so storage and the renderer stay dependency-free; the repo's own locked spec (`docs/superpowers/specs/2026-07-21-trackly-v2-3a-editor-comments-worklog-design.md`, decision 1) already chose it | Heaviest of the three; v2→v3 moved packages around, so most blog posts are wrong; MIT core but some extensions (collab, AI, comments) are paid — none used here | **Chosen** |
| **Lexical** (Meta) | Lighter (~60 kB gzip); very fast; good a11y story | Document model is Lexical-specific and versioned — serialised state is not a stable public format the way a ProseMirror doc is, which is exactly what we want to put in a DB column; mentions/checklists are hand-rolled; smaller ecosystem; would contradict the repo's existing written decision | Rejected |
| **Plate / BlockNote** (Slate-based) | Batteries included, fast to demo | Slate's normalisation is famously fiddly under React 19 concurrent rendering; ships its own opinionated CSS that would fight `globals.css`; heavier than TipTap once themed | Rejected |
| **Raw ProseMirror** | No abstraction tax; smallest possible | We would write the React glue, schema, commands and input rules that TipTap already tested. Weeks of work for ~30 kB | Rejected |
| **Textarea + Markdown preview** (`marked`/`react-markdown`) | ~15 kB, no editor at all | Not WYSIWYG; no @-mention affordance; image paste impossible; the demo gap stays open | Rejected |

The tie-breaker is not size, it is that a ProseMirror JSON doc is a **plain tree of
`{type, attrs, content, marks, text}`** with no library identity in it. That is what makes
`components/editor/` able to validate, walk, plaintext-ify and render stored content with
zero TipTap imports — and therefore what makes the security story checkable.

## Storage format decision

**TipTap/ProseMirror JSON in a new nullable `Json` column, with the existing `String`
column kept as a server-derived plaintext mirror.** See `.plan/editor-schema.prisma`.

Rejected alternatives:

- **HTML in the existing column.** Requires sanitise-on-write *and* sanitise-on-render,
  a `dompurify` dependency, and a `dangerouslySetInnerHTML` call that a future refactor
  can quietly get wrong. Worse: existing plain-text rows containing `<` would start being
  parsed as markup with no way to tell old rows from new ones. Rejected on the security
  boundary alone.
- **Markdown in the existing column.** Tempting because it needs no schema change at all
  and the existing name-regex mention flow keeps working. But there is no way to know
  whether an existing row is plain text or Markdown, so a legacy description containing
  `*` , `_`, `#` or `1.` silently changes appearance — which fails the "existing
  plain-text content must still render correctly" requirement. Fixing that needs a
  `descriptionFormat` discriminator column; and once a schema change is on the table
  anyway, JSON is strictly better (no parser at render time, no HTML intermediate,
  attribute-level allowlisting instead of textual).
- **JSON stringified into the existing `String` column.** No schema change, but destroys
  the plaintext mirror that JQL `~`, search and notification excerpts read from.

With JSON, **nullness is the discriminator** — no extra column:

```
descriptionJson == null  →  legacy row  →  render `description` as escaped plain text
descriptionJson != null  →  rich row    →  render the doc through the allowlist walker
                                             (`description` is the derived plaintext mirror)
```

## Back-compat / migration plan

1. **No backfill is required and none should be run first.** Read paths use
   `descriptionJson ?? description` / `bodyJson ?? body` from the first deploy.
   `RichRenderer` takes both and picks: doc if present, else escaped plaintext with
   newlines preserved. Legacy rows render exactly as they do today.
2. **Every write keeps the plaintext mirror current.** The editor emits
   `{ doc, text }`; `text` comes from `richDocToPlainText()` and goes into the existing
   `description` / `body` column. JQL `~`, search, notification excerpts and
   `extractMentions()` therefore keep working with **no changes to `lib/`**.
3. **Opening a legacy row in the editor** seeds it via `plainTextToRichDoc()` (blank
   lines → paragraphs, single newlines → hard breaks). Saving upgrades that one row.
   No global migration event.
4. An optional idempotent `prisma/backfill-rich-text.ts` can convert rows in bulk later
   for consistency. It is not needed for correctness and is deliberately not written here.

## Server-side wiring still required (NOT done — outside my file area)

`app/(app)/projects/[key]/issues/actions.ts` is owned by another agent right now, so the
JSON write path is specified, not applied. Until these land, the editor round-trips
formatting **in the session** and persists only the plaintext mirror.

**1. `updateIssueFieldAction` — accept the doc**

```ts
// import at top
import { validateRichDoc } from "@/components/editor/validate";

// add "descriptionJson" to the `field` union, then:
if (field === "descriptionJson") {
  const result = validateRichDoc(value);          // value: unknown
  if (!result.ok) return { error: result.error }; // fail closed
  data.descriptionJson = result.doc;              // cleaned copy, never the raw input
}
```

Or, preferred, a dedicated action so description text + doc are written in one row update:

```ts
export async function updateIssueDescriptionAction(
  issueId: string, text: string, doc: unknown
) {
  const user = await getAuthUser();
  const target = await prisma.issue.findUnique({
    where: { id: issueId }, select: { projectId: true },
  });
  if (!target) return { error: "Issue not found" };
  if (!(await checkProjectAccess(user.id, target.projectId)))
    return { error: "You do not have access to this issue" };

  const result = validateRichDoc(doc);
  if (!result.ok) return { error: result.error };

  await prisma.issue.update({
    where: { id: issueId },
    // text is the *derived* mirror — recompute it server-side rather than
    // trusting the client's copy, so search can never disagree with the doc.
    data: { description: richDocToPlainText(result.doc), descriptionJson: result.doc },
  });
  revalidatePath("/projects");
  return { success: true };
}
```

**2. `postCommentAction(issueId, body)` → `postCommentAction(issueId, body, doc?)`**
— same `validateRichDoc` gate, writes `bodyJson`.

**3. Mentions become ID-based.** Once comments carry a doc, replace the name-regex block
inside `postCommentAction`'s `sideEffects` with:

```ts
import { extractMentionUserIds } from "@/components/editor/text";

const mentionedIds = extractMentionUserIds(doc);              // exact user ids
const mentioned = await prisma.user.findMany({
  where: {
    id: { in: mentionedIds },
    memberships: { some: { siteId: issue.project.siteId } },  // keep the tenant scope
  },
  select: { id: true },
});
```

This fixes the pre-existing bug where `/@([\w\.\-]+)/g` cannot match a user whose name
contains a space. Until it lands, mentions still notify: the plaintext mirror serialises
a mention node as `@Name`, which the current regex picks up exactly as if it had been
typed by hand — so the existing Notification/Watcher flow fires unchanged, with the
existing single-token limitation and no regression.

## Testing

Passing on the current tree (no new deps):

- `components/editor/urls.test.ts` — scheme allowlist, `javascript:`, `data:`,
  protocol-relative, whitespace/control-char smuggling
- `components/editor/validate.test.ts` — unknown node/mark rejection, size cap, depth cap,
  attribute stripping, unsafe-URL stripping
- `components/editor/text.test.ts` — plaintext extraction, mention id extraction,
  plaintext → doc round trip
- `components/editor/RichRenderer.test.tsx` — allowlist rendering, XSS attempts,
  legacy plaintext fallback

Blocked until the deps land (**not written**, so `npm test` stays green for everyone else):

- `RichEditor.test.tsx` — mounts, toolbar toggles marks, mention filter, Cmd+Enter submit
- `EditorToolbar` roving-tabindex keyboard test
- e2e: rich description with a list + code block survives reload; pasted image uploads and
  renders; `@`-mention produces a notification
