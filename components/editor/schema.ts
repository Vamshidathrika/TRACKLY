/**
 * The allowlist. Single source of truth for what a stored rich text document
 * is permitted to contain.
 *
 * Consumed by:
 *   - validate.ts   (write time — reject/strip before persisting)
 *   - RichRenderer  (read time  — drop anything not listed, before React sees it)
 *   - tiptap-extensions.ts (editor — the extension set that can produce these)
 *
 * Adding a node type here without adding a case to RichRenderer means the node
 * validates but renders as nothing. Adding a renderer case without listing it
 * here means it renders for legacy rows but is rejected on the next save. Keep
 * the three in step.
 */

import { safeHref, safeImageSrc } from "./urls";

/** Node types permitted anywhere in the document. */
export const ALLOWED_NODES = [
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "image",
  "mention",
] as const;

/** Mark types permitted on text nodes. */
export const ALLOWED_MARKS = [
  "bold",
  "italic",
  "strike",
  "code",
  "underline",
  "link",
] as const;

export type AllowedNode = (typeof ALLOWED_NODES)[number];
export type AllowedMark = (typeof ALLOWED_MARKS)[number];

const NODE_SET: ReadonlySet<string> = new Set(ALLOWED_NODES);
const MARK_SET: ReadonlySet<string> = new Set(ALLOWED_MARKS);

export function isAllowedNode(type: unknown): type is AllowedNode {
  return typeof type === "string" && NODE_SET.has(type);
}

export function isAllowedMark(type: unknown): type is AllowedMark {
  return typeof type === "string" && MARK_SET.has(type);
}

/** Hard caps. Enforced at write time; the renderer also stops at MAX_DEPTH. */
export const MAX_DOC_BYTES = 100_000;
export const MAX_DEPTH = 20;

const MAX_ATTR_TEXT = 512;
const LANGUAGE_PATTERN = /^[a-z0-9#+._-]{0,32}$/i;

function cleanString(value: unknown, max = MAX_ATTR_TEXT): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  return trimmed.slice(0, max);
}

function cleanInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

/**
 * Per-node attribute allowlist.
 *
 * Returns a NEW attrs object containing only known keys with validated values,
 * or null when the node carries no attributes worth keeping. Input is never
 * mutated and is never spread — an attacker-supplied `onclick`, `style`,
 * `dangerouslySetInnerHTML` or `srcSet` key cannot survive this function,
 * because unknown keys are not copied rather than being blocklisted.
 */
export function sanitizeNodeAttrs(
  type: AllowedNode,
  attrs: unknown
): Record<string, unknown> | null {
  if (typeof attrs !== "object" || attrs === null) return null;
  const input = attrs as Record<string, unknown>;

  switch (type) {
    case "heading": {
      const level = cleanInt(input.level, 1, 6);
      return { level: level ?? 1 };
    }
    case "orderedList": {
      const start = cleanInt(input.start, 1, 100_000);
      return start === null ? null : { start };
    }
    case "taskItem": {
      return { checked: input.checked === true };
    }
    case "codeBlock": {
      const language = cleanString(input.language, 32);
      return language && LANGUAGE_PATTERN.test(language) ? { language } : null;
    }
    case "image": {
      const src = safeImageSrc(input.src);
      if (!src) return null; // caller drops the node
      const alt = cleanString(input.alt);
      const title = cleanString(input.title);
      return {
        src,
        ...(alt ? { alt } : {}),
        ...(title ? { title } : {}),
      };
    }
    case "mention": {
      // `id` is the real User.id. `label` is display only and is rendered as
      // React text, never as an attribute that could become markup.
      const id = cleanString(input.id, 64);
      const label = cleanString(input.label, 128);
      if (!id && !label) return null; // caller drops the node
      return {
        ...(id ? { id } : {}),
        ...(label ? { label } : {}),
      };
    }
    default:
      return null;
  }
}

/** Per-mark attribute allowlist. Same no-spread rule as above. */
export function sanitizeMarkAttrs(
  type: AllowedMark,
  attrs: unknown
): Record<string, unknown> | null {
  if (type !== "link") return null;
  if (typeof attrs !== "object" || attrs === null) return null;

  const href = safeHref((attrs as Record<string, unknown>).href);
  if (!href) return null; // caller drops the mark, keeps the text
  return { href };
}

/** Nodes that must carry a usable attribute set or be dropped entirely. */
export function nodeRequiresAttrs(type: AllowedNode): boolean {
  return type === "image" || type === "mention";
}
