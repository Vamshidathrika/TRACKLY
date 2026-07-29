/**
 * Shared Tailwind classes for rendered rich text.
 *
 * The repo has no @tailwindcss/typography plugin and app/globals.css is a
 * hand-rolled token system, so content styling is done with arbitrary
 * descendant variants on a wrapper element. That keeps every rule inside
 * components/editor/ — no global CSS to add, nothing for another agent's
 * change to collide with.
 *
 * Only tokens from globals.css are used (text, text-subtle, border, brand,
 * neutral, surface, danger). No raw hex, per the V2-1 sweep.
 *
 * Base font size is deliberately NOT set: call sites already choose text-xs
 * (comment feed) or text-sm (description), and inheriting keeps the editor
 * visually identical to the textarea it replaces.
 */

/**
 * Structure and spacing for rendered document content. Applied to both the
 * read-only renderer and the editable ProseMirror surface so what you type is
 * what you later read.
 */
export const PROSE_CLASSES = [
  "leading-relaxed text-text",
  // Blocks
  "[&>*+*]:mt-3",
  "[&_p]:leading-relaxed",
  // Headings — step down from the page h1, matching the issue detail scale
  "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-text [&_h1]:mt-4",
  "[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-text [&_h2]:mt-4",
  "[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-text [&_h3]:mt-3",
  "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-text",
  "[&_h5]:text-xs [&_h5]:font-semibold [&_h5]:text-text",
  "[&_h6]:text-xs [&_h6]:font-semibold [&_h6]:text-text-subtle [&_h6]:uppercase [&_h6]:tracking-wider",
  // Lists
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
  "[&_li]:pl-0.5",
  "[&_li>ul]:mt-1 [&_li>ol]:mt-1",
  // Checklists — the ul is reset to no bullet by the taskList class below
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2",
  // Inline code
  "[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:bg-neutral [&_code]:text-text",
  "[&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:border [&_code]:border-border",
  // Code blocks — reset the inline-code chrome inside them
  "[&_pre]:bg-neutral [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg",
  "[&_pre]:p-3 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-[12px] [&_pre]:leading-relaxed",
  "[&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0 [&_pre_code]:text-[inherit]",
  // Quotes
  "[&_blockquote]:border-l-2 [&_blockquote]:border-brand/40 [&_blockquote]:pl-3",
  "[&_blockquote]:text-text-subtle [&_blockquote]:italic",
  // Rules
  "[&_hr]:border-0 [&_hr]:border-t [&_hr]:border-border [&_hr]:my-4",
  // Links
  "[&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-brand/40",
  "hover:[&_a]:decoration-brand",
  // Images
  "[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-border",
  // Long words and pasted URLs must not blow out the column
  "break-words",
].join(" ");

/** Pill styling for an @-mention chip, used by renderer and editor alike. */
export const MENTION_CLASSES =
  "inline-flex items-center rounded-full bg-brand-subtle px-1.5 py-px font-semibold text-brand";

/** The contenteditable surface itself. */
export const EDITOR_SURFACE_CLASSES = [
  PROSE_CLASSES,
  "outline-none",
  // ProseMirror's own placeholder decoration, fed by the Placeholder extension
  "[&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
  "[&_.is-editor-empty:first-child::before]:text-text-subtle",
  "[&_.is-editor-empty:first-child::before]:float-left",
  "[&_.is-editor-empty:first-child::before]:pointer-events-none",
  "[&_.is-editor-empty:first-child::before]:h-0",
  // Selected node outline (an image clicked in the editor)
  "[&_.ProseMirror-selectednode]:outline [&_.ProseMirror-selectednode]:outline-2",
  "[&_.ProseMirror-selectednode]:outline-brand",
].join(" ");
