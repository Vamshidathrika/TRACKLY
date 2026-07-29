/**
 * Structural types for the stored rich text document.
 *
 * These deliberately do NOT import from @tiptap/*. A ProseMirror document is a
 * plain JSON tree, and keeping our own structural type for it is what lets the
 * validator, the plaintext walker and the renderer run in server actions and in
 * read-only pages without pulling the editor bundle in.
 *
 * The shape is TipTap's `editor.getJSON()` output — assignable in both
 * directions with `JSONContent` — but it is ours, so a TipTap major version
 * cannot change what is in the database.
 */

export type RichMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
};

export type RichDoc = {
  type: "doc";
  content?: RichNode[];
};

/**
 * What the editor hands back on every change and on save.
 *
 * `doc` is the canonical value. `text` is the plaintext mirror that goes into
 * the existing `Issue.description` / `Comment.body` String column so search,
 * JQL `~` and notification excerpts keep working — see .plan/editor-deps.md.
 */
export type RichValue = {
  doc: RichDoc;
  text: string;
};

/** A project member offered by the @-mention suggestion list. */
export type MentionMember = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export const EMPTY_DOC: RichDoc = { type: "doc", content: [] };

/** Narrowing guard for anything read out of the database or off the wire. */
export function isRichDoc(value: unknown): value is RichDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc"
  );
}

/** True when the document carries no visible content. */
export function isEmptyDoc(doc: RichDoc | null | undefined): boolean {
  if (!doc || !doc.content || doc.content.length === 0) return true;
  return doc.content.every(
    (node) =>
      node.type === "paragraph" && (!node.content || node.content.length === 0)
  );
}
