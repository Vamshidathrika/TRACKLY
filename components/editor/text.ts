/**
 * Plain-text projection of a rich document, and the inverse for legacy rows.
 *
 * `richDocToPlainText` produces the mirror that is written into the existing
 * `Issue.description` / `Comment.body` String columns, so JQL `~`, search,
 * notification excerpts and the Slack/Teams payloads keep working with no
 * changes to lib/.
 *
 * Deliberately hand-written rather than using @tiptap/static-renderer: it has
 * to run inside server actions, it must not depend on the editor's extension
 * list staying in sync, and it is trivial to test.
 */

import type { RichDoc, RichNode } from "./types";

/** Nodes whose children are blocks and should be separated by a newline. */
const BLOCK_CONTAINERS = new Set([
  "bulletList",
  "orderedList",
  "taskList",
  "listItem",
  "taskItem",
  "blockquote",
]);

function nodeToText(input: unknown): string {
  // Content arrays come off an `unknown` JSON column and may hold anything —
  // a stray `null`, a number, a string — not just well-formed RichNodes.
  if (typeof input !== "object" || input === null) return "";
  const node = input as RichNode;
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "hardBreak":
      return "\n";
    case "horizontalRule":
      return "---";
    case "image": {
      const alt = node.attrs?.alt;
      return typeof alt === "string" && alt.trim() !== "" ? `[image: ${alt}]` : "[image]";
    }
    case "mention": {
      // Serialised exactly as a human would have typed it, so the existing
      // name-based /@([\w\.\-]+)/g mention scan in lib/notifications.ts still
      // fires off the mirror. See .plan/editor-deps.md for the ID-based
      // replacement.
      const label = node.attrs?.label ?? node.attrs?.id;
      return typeof label === "string" ? `@${label}` : "";
    }
    default:
      break;
  }

  // Array.isArray, not `?? []`: `content` comes off an `unknown` JSON column,
  // and a malformed but truthy non-array value (e.g. a stray string) must be
  // treated as "no children" rather than crash `.map`.
  const children = (Array.isArray(node.content) ? node.content : []).map(nodeToText);

  if (node.type === "doc") {
    return children.filter((c) => c !== "").join("\n\n");
  }
  if (BLOCK_CONTAINERS.has(node.type)) {
    return children.filter((c) => c !== "").join("\n");
  }
  // paragraph, heading, codeBlock and anything else inline-ish
  return children.join("");
}

/** Flatten a document to plain text. Safe to call with any parsed JSON. */
export function richDocToPlainText(doc: unknown): string {
  if (typeof doc !== "object" || doc === null) return "";
  return nodeToText(doc as RichNode).trim();
}

/**
 * Every distinct mentioned user id, in document order.
 *
 * This is what the notification path should resolve against once `bodyJson`
 * exists — exact ids instead of a name regex, which fixes mentions of users
 * whose name contains a space.
 */
export function extractMentionUserIds(doc: unknown): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown): void => {
    if (typeof node !== "object" || node === null) return;
    const current = node as RichNode;

    if (current.type === "mention") {
      const id = current.attrs?.id;
      if (typeof id === "string" && id !== "" && !seen.has(id)) {
        seen.add(id);
        found.push(id);
      }
    }

    if (Array.isArray(current.content)) {
      for (const child of current.content) walk(child);
    }
  };

  walk(doc);
  return found;
}

/**
 * Seed a document from a legacy plain-text row.
 *
 * Blank lines become paragraph breaks, single newlines become hard breaks —
 * which is how the old `whitespace-pre-wrap` rendering looked, so opening an
 * existing description in the editor shows the same thing the user saw before.
 */
export function plainTextToRichDoc(text: string | null | undefined): RichDoc {
  if (!text || text.trim() === "") return { type: "doc", content: [] };

  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return {
    type: "doc",
    content: paragraphs.map((paragraph) => {
      const lines = paragraph.split("\n");
      const content: RichNode[] = [];

      lines.forEach((line, index) => {
        if (index > 0) content.push({ type: "hardBreak" });
        if (line !== "") content.push({ type: "text", text: line });
      });

      return { type: "paragraph", ...(content.length > 0 ? { content } : {}) };
    }),
  };
}
