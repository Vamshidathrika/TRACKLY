# Jira importer — dependency proposal

## Recommendation: add nothing

The importer ships with **zero new npm dependencies**. Everything is either
already in `package.json` or hand-rolled in ~150 lines.

## What was considered and rejected

| Candidate | Purpose | Verdict |
|---|---|---|
| `papaparse` / `csv-parse` | Parse Jira's CSV export | **Rejected.** Jira CSV is RFC 4180 with one twist — repeated column headers (`Comment`, `Comment`, `Comment`) that a header-keyed parser silently collapses to the last value. Both libraries need custom `transformHeader` work to avoid that data loss, so the library buys tokenizing only. `lib/import/csv-parse.ts` is 70 lines, returns positional rows (which is what the duplicate-header problem actually requires), and is unit-tested against quoted commas, escaped quotes, embedded newlines, and CRLF. |
| `date-fns` / `dayjs` | Parse Jira's `dd/MMM/yy h:mm a` CSV timestamps | **Rejected.** One format, one regex, in `lib/import/dates.ts`. Adding a date library for a single non-ISO format is not proportionate, and neither library parses that format without a plugin (`dayjs/plugin/customParseFormat`) anyway. |
| `adf-to-md` / `@atlaskit/adf-utils` | Convert Atlassian Document Format (Jira Cloud rich text) to Markdown | **Deferred, and the only one with a real case.** Jira Cloud API v3 returns descriptions and comments as ADF JSON, not text. `lib/import/adf.ts` flattens ADF to plain text with paragraph/list/code-block structure preserved — enough to be readable, but it loses tables, panels, media embeds, and inline mentions. `@atlaskit/adf-utils` would do better, but it pulls the Atlaskit dependency tree (30+ transitive packages) into a Next.js server bundle for one conversion. **Cheaper alternative already used:** request `expand=renderedFields` from the Jira API and the importer prefers `renderedFields.description` (HTML) over ADF, converting the HTML subset instead. Documented in the UI. |
| `zod` | Validating import options and the file envelope | **Already a dependency** (`zod@^4.4.3`). Used. |

## If ADF fidelity becomes the blocker

Revisit in this order:
1. Tell users to export with `expand=renderedFields` (docs change, zero code).
2. Extend `lib/import/adf.ts` to cover tables and panels (~80 more lines).
3. Only then add `adf-to-md` (small, no Atlaskit tree) — not `@atlaskit/adf-utils`.
