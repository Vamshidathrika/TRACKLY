/**
 * Write-time validation for rich text documents.
 *
 * Call this in every server action before persisting a document. It fails
 * closed on structural violations (unknown node type, wrong shape, too big,
 * too deep) and strips silently on cosmetic ones (unknown attributes, unknown
 * marks, unsafe URLs).
 *
 * No Prisma, no React, no TipTap imports — safe to call from a server action
 * and cheap to unit test.
 *
 * NOTE: this is defence in depth, not the security boundary. The boundary is
 * RichRenderer, which re-applies the same allowlist at read time. Documents
 * written before this function existed, or by a code path that forgets to call
 * it, are still safe to render.
 */

import {
  MAX_DEPTH,
  MAX_DOC_BYTES,
  isAllowedMark,
  isAllowedNode,
  nodeRequiresAttrs,
  sanitizeMarkAttrs,
  sanitizeNodeAttrs,
  type AllowedNode,
} from "./schema";
import type { RichDoc, RichMark, RichNode } from "./types";

export type ValidationResult =
  | { ok: true; doc: RichDoc }
  | { ok: false; error: string };

const MAX_TEXT_LENGTH = 20_000;

class DocumentRejected extends Error {}

function reject(message: string): never {
  throw new DocumentRejected(message);
}

function cleanMarks(marks: unknown): RichMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;

  const kept: RichMark[] = [];
  for (const mark of marks) {
    if (typeof mark !== "object" || mark === null) continue;
    const type = (mark as { type?: unknown }).type;
    // Unknown marks are dropped rather than rejected: a mark only ever changes
    // how existing text looks, so losing one is a cosmetic downgrade, while
    // rejecting the save would lose the user's whole edit.
    if (!isAllowedMark(type)) continue;

    const attrs = sanitizeMarkAttrs(type, (mark as { attrs?: unknown }).attrs);
    if (type === "link" && !attrs) continue; // unsafe or missing href -> plain text
    kept.push(attrs ? { type, attrs } : { type });
  }

  return kept.length > 0 ? kept : undefined;
}

function cleanNode(input: unknown, depth: number): RichNode | null {
  if (depth > MAX_DEPTH) reject(`Document nesting exceeds ${MAX_DEPTH} levels`);
  if (typeof input !== "object" || input === null) {
    reject("Document contains a non-object node");
  }

  const node = input as Record<string, unknown>;
  const type = node.type;

  if (!isAllowedNode(type)) {
    reject(`Unsupported content type: ${String(type).slice(0, 40)}`);
  }
  const nodeType: AllowedNode = type;

  if (nodeType === "text") {
    if (typeof node.text !== "string") reject("Text node has no text");
    if (node.text.length > MAX_TEXT_LENGTH) reject("Text run is too long");
    const marks = cleanMarks(node.marks);
    return marks ? { type: "text", text: node.text, marks } : { type: "text", text: node.text };
  }

  const attrs = sanitizeNodeAttrs(nodeType, node.attrs);
  if (nodeRequiresAttrs(nodeType) && !attrs) {
    // An image with an unsafe src or a mention with neither id nor label
    // carries no renderable content. Drop the node, keep the document.
    return null;
  }

  const rawContent = node.content;
  let content: RichNode[] | undefined;
  if (Array.isArray(rawContent)) {
    const cleaned: RichNode[] = [];
    for (const child of rawContent) {
      const result = cleanNode(child, depth + 1);
      if (result) cleaned.push(result);
    }
    if (cleaned.length > 0) content = cleaned;
  }

  return {
    type: nodeType,
    ...(attrs ? { attrs } : {}),
    ...(content ? { content } : {}),
  };
}

/**
 * Validate and clean a document received from a client.
 *
 * Returns a brand new document built key by key from allowlisted values — the
 * caller must persist `result.doc`, never the original input.
 */
export function validateRichDoc(input: unknown): ValidationResult {
  if (input === null || input === undefined) {
    return { ok: false, error: "No document provided" };
  }
  if (typeof input !== "object") {
    return { ok: false, error: "Document must be an object" };
  }
  if ((input as { type?: unknown }).type !== "doc") {
    return { ok: false, error: "Document root must be a doc node" };
  }

  // Size is checked on the raw input, before cleaning, so a huge payload is
  // rejected without walking it.
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return { ok: false, error: "Document is not serialisable" };
  }
  if (serialized.length > MAX_DOC_BYTES) {
    return {
      ok: false,
      error: `Content is too large (limit ${Math.round(MAX_DOC_BYTES / 1000)} KB)`,
    };
  }

  try {
    const cleaned = cleanNode(input, 0);
    if (!cleaned) return { ok: false, error: "Document is empty" };
    return {
      ok: true,
      doc: { type: "doc", content: cleaned.content ?? [] },
    };
  } catch (e) {
    if (e instanceof DocumentRejected) return { ok: false, error: e.message };
    throw e;
  }
}
