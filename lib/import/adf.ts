/**
 * Atlassian Document Format -> plain text.
 *
 * Jira Cloud REST v3 returns `description` and comment bodies as ADF (a
 * ProseMirror-ish node tree), not a string. Trackly stores plain
 * text/Markdown, so something has to flatten it.
 *
 * This covers the node types that make up the overwhelming majority of real
 * issue bodies: paragraphs, headings, lists, code blocks, quotes, rules,
 * links, mentions, emoji, and tables (as pipe rows). Panels, media embeds, and
 * extensions degrade to their text content. Anything unrecognised recurses
 * into `content` rather than being dropped — an unknown wrapper should never
 * cost you the text inside it.
 *
 * See .plan/import-deps.md for why this is hand-rolled instead of pulling in
 * @atlaskit/adf-utils, and for the `expand=renderedFields` escape hatch.
 */

type AdfNode = {
  type?: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
};

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "rule",
  "panel",
  "listItem",
  "tableRow",
  "mediaSingle",
  "mediaGroup",
]);

/**
 * Accepts an ADF document, a plain string, or null. Strings pass through
 * untouched so the same call site can handle Jira Server (v2, plain text) and
 * Jira Cloud (v3, ADF).
 */
export function adfToText(input: unknown): string | null {
  if (input == null) return null;
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed || null;
  }
  if (typeof input !== "object") return null;

  const text = renderNode(input as AdfNode, 0).replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

function renderNode(node: AdfNode, depth: number): string {
  if (!node || typeof node !== "object") return "";

  switch (node.type) {
    case "text":
      return applyMarks(node);
    case "hardBreak":
      return "\n";
    case "rule":
      return "\n---\n";
    case "mention":
      return `@${String(node.attrs?.text ?? node.attrs?.displayName ?? "unknown").replace(/^@/, "")}`;
    case "emoji":
      return String(node.attrs?.text ?? node.attrs?.shortName ?? "");
    case "date":
      return String(node.attrs?.timestamp ?? "");
    case "inlineCard":
    case "blockCard":
      return String(node.attrs?.url ?? "");
    case "media":
      return `[attachment: ${String(node.attrs?.alt ?? node.attrs?.id ?? "file")}]`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      return `\n${"#".repeat(Math.min(Math.max(level, 1), 6))} ${renderChildren(node, depth)}\n`;
    }
    case "codeBlock": {
      const language = String(node.attrs?.language ?? "");
      return `\n\`\`\`${language}\n${renderChildren(node, depth)}\n\`\`\`\n`;
    }
    case "blockquote":
      return `\n${prefixLines(renderChildren(node, depth), "> ")}\n`;
    case "bulletList":
    case "orderedList":
      return `\n${renderList(node, depth)}\n`;
    case "tableRow":
      return `| ${(node.content ?? []).map((c) => renderChildren(c, depth).trim()).join(" | ")} |\n`;
    case "paragraph":
      return `\n${renderChildren(node, depth)}\n`;
    default:
      return renderChildren(node, depth);
  }
}

function renderList(node: AdfNode, depth: number): string {
  const ordered = node.type === "orderedList";
  const indent = "  ".repeat(depth);
  return (node.content ?? [])
    .map((item, i) => {
      const bullet = ordered ? `${i + 1}. ` : "- ";
      const body = renderChildren(item, depth + 1).trim();
      return `${indent}${bullet}${body}`;
    })
    .join("\n");
}

function renderChildren(node: AdfNode, depth: number): string {
  const parts = (node.content ?? []).map((child) => renderNode(child, depth));
  return parts
    .map((part, i) => {
      const child = node.content?.[i];
      // Block children already carry their own newlines; inline children are
      // concatenated so "foo **bar** baz" doesn't gain spaces it never had.
      return child && BLOCK_TYPES.has(child.type ?? "") ? part : part;
    })
    .join("");
}

function applyMarks(node: AdfNode): string {
  let text = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "strong":
        text = `**${text}**`;
        break;
      case "em":
        text = `*${text}*`;
        break;
      case "code":
        text = `\`${text}\``;
        break;
      case "strike":
        text = `~~${text}~~`;
        break;
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        if (href) text = `[${text}](${href})`;
        break;
      }
      default:
        break;
    }
  }
  return text;
}

function prefixLines(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() ? `${prefix}${line}` : line))
    .join("\n");
}

const BLOCK_TAGS = /<\/?(p|div|br|li|h[1-6]|tr|blockquote|pre)[^>]*>/gi;

/**
 * Minimal HTML -> text, for `renderedFields` payloads. Deliberately narrow:
 * it strips tags and decodes the five XML entities. It is not a sanitiser and
 * its output is never rendered as HTML — it lands in Issue.description, which
 * Trackly renders as text.
 */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(BLOCK_TAGS, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}
