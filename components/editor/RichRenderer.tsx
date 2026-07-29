/**
 * Read-only renderer for stored rich text.
 *
 * ── THIS IS THE SECURITY BOUNDARY ──────────────────────────────────────────
 *
 * There is no `dangerouslySetInnerHTML` in this file, and there must never be
 * one anywhere under components/editor/. Stored content is a JSON tree; this
 * walker turns it into React elements one allowlisted node at a time, and React
 * escapes every string it renders. There is no code path from stored content to
 * raw HTML, which is why a crafted document cannot become markup:
 *
 *   1. Node types not in ALLOWED_NODES render as null.
 *   2. Mark types not in ALLOWED_MARKS are ignored; the text still renders.
 *   3. Attributes are copied key by key through sanitizeNodeAttrs /
 *      sanitizeMarkAttrs — never spread. An `onClick`, `style`, `srcSet` or
 *      `dangerouslySetInnerHTML` key in the stored attrs is simply not read.
 *   4. `href` and `src` go through the scheme allowlist in urls.ts, so
 *      `javascript:` and `data:text/html` never reach the DOM.
 *   5. Depth is capped, so a deeply nested document cannot blow the stack.
 *
 * This runs on EVERY read, independently of write-time validation. Documents
 * written before validate.ts existed, written by a server action that forgot to
 * call it, or inserted straight into the database are all still safe to render.
 * Write-time validation is defence in depth; this is the part that cannot be
 * bypassed, because it is the only way content reaches the page.
 *
 * Also note: no @tiptap/* import. This ships to read-only viewers for ~2 kB.
 */

import { Fragment, type ReactNode } from "react";
import {
  MAX_DEPTH,
  isAllowedMark,
  isAllowedNode,
  nodeRequiresAttrs,
  sanitizeMarkAttrs,
  sanitizeNodeAttrs,
  type AllowedNode,
} from "./schema";
import { MENTION_CLASSES, PROSE_CLASSES } from "./prose";
import { isEmptyDoc, isRichDoc, type RichMark, type RichNode } from "./types";

function renderMarkedText(text: string, marks: RichMark[] | undefined): ReactNode {
  if (!marks || marks.length === 0) return text;

  // Wrap innermost-first so nesting order is stable regardless of mark order.
  return marks.reduce<ReactNode>((acc, mark) => {
    if (!isAllowedMark(mark.type)) return acc;
    const attrs = sanitizeMarkAttrs(mark.type, mark.attrs);

    switch (mark.type) {
      case "bold":
        return <strong>{acc}</strong>;
      case "italic":
        return <em>{acc}</em>;
      case "strike":
        return <s>{acc}</s>;
      case "underline":
        return <u>{acc}</u>;
      case "code":
        return <code>{acc}</code>;
      case "link": {
        const href = attrs?.href;
        // No safe href -> render the text without a link rather than dropping it.
        if (typeof href !== "string") return acc;
        return (
          <a href={href} target="_blank" rel="noopener noreferrer nofollow">
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderChildren(nodes: RichNode[] | undefined, depth: number): ReactNode {
  if (!nodes || nodes.length === 0) return null;
  return nodes.map((child, index) => (
    <Fragment key={index}>{renderNode(child, depth + 1)}</Fragment>
  ));
}

function renderNode(node: unknown, depth: number): ReactNode {
  if (depth > MAX_DEPTH) return null;
  if (typeof node !== "object" || node === null) return null;

  const candidate = node as RichNode;
  if (!isAllowedNode(candidate.type)) return null;
  const type: AllowedNode = candidate.type;

  if (type === "text") {
    if (typeof candidate.text !== "string") return null;
    return renderMarkedText(candidate.text, candidate.marks);
  }

  const attrs = sanitizeNodeAttrs(type, candidate.attrs);
  if (nodeRequiresAttrs(type) && !attrs) return null;

  switch (type) {
    case "doc":
      return <>{renderChildren(candidate.content, depth)}</>;

    case "paragraph": {
      // An empty paragraph is a deliberate blank line; keep it visible.
      if (!candidate.content || candidate.content.length === 0) {
        return <p>&nbsp;</p>;
      }
      return <p>{renderChildren(candidate.content, depth)}</p>;
    }

    case "heading": {
      const level = typeof attrs?.level === "number" ? attrs.level : 1;
      const children = renderChildren(candidate.content, depth);
      switch (level) {
        case 1: return <h1>{children}</h1>;
        case 2: return <h2>{children}</h2>;
        case 3: return <h3>{children}</h3>;
        case 4: return <h4>{children}</h4>;
        case 5: return <h5>{children}</h5>;
        default: return <h6>{children}</h6>;
      }
    }

    case "bulletList":
      return <ul>{renderChildren(candidate.content, depth)}</ul>;

    case "orderedList": {
      const start = typeof attrs?.start === "number" ? attrs.start : undefined;
      return <ol start={start}>{renderChildren(candidate.content, depth)}</ol>;
    }

    case "listItem":
      return <li>{renderChildren(candidate.content, depth)}</li>;

    case "taskList":
      return <ul data-type="taskList">{renderChildren(candidate.content, depth)}</ul>;

    case "taskItem": {
      const checked = attrs?.checked === true;
      return (
        <li data-type="taskItem" data-checked={checked ? "true" : "false"}>
          {/* Read-only: disabled, but still exposed to assistive tech with its
              state, and aria-hidden would hide meaningful information. */}
          <input
            type="checkbox"
            checked={checked}
            disabled
            readOnly
            className="mt-1 h-3.5 w-3.5 shrink-0 accent-brand"
          />
          <span className={checked ? "line-through text-text-subtle" : undefined}>
            {renderChildren(candidate.content, depth)}
          </span>
        </li>
      );
    }

    case "blockquote":
      return <blockquote>{renderChildren(candidate.content, depth)}</blockquote>;

    case "codeBlock": {
      const language = typeof attrs?.language === "string" ? attrs.language : undefined;
      return (
        <pre>
          <code data-language={language}>{renderChildren(candidate.content, depth)}</code>
        </pre>
      );
    }

    case "horizontalRule":
      return <hr />;

    case "hardBreak":
      return <br />;

    case "image": {
      const src = attrs?.src;
      if (typeof src !== "string") return null;
      const alt = typeof attrs?.alt === "string" ? attrs.alt : "";
      const title = typeof attrs?.title === "string" ? attrs.title : undefined;
      // Plain <img>, not next/image: sources are arbitrary blob URLs and
      // next.config.ts has no remotePatterns entry for them.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={alt} title={title} loading="lazy" />;
    }

    case "mention": {
      const label = typeof attrs?.label === "string" ? attrs.label : attrs?.id;
      if (typeof label !== "string") return null;
      const id = typeof attrs?.id === "string" ? attrs.id : undefined;
      return (
        <span className={MENTION_CLASSES} data-mention-id={id}>
          @{label}
        </span>
      );
    }

    default:
      return null;
  }
}

/**
 * Renders legacy plain-text content with paragraph and line breaks preserved.
 *
 * Used when a row predates the rich text column. Still React-escaped — plain
 * text is never treated as markup, which is exactly why we did not pick HTML
 * or Markdown storage without a discriminator.
 */
function PlainText({ text }: { text: string }) {
  const paragraphs = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <>
      {paragraphs.map((paragraph, pIndex) => (
        <p key={pIndex}>
          {paragraph.split("\n").map((line, lIndex) => (
            <Fragment key={lIndex}>
              {lIndex > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

export type RichRendererProps = {
  /**
   * The stored document (`Issue.descriptionJson` / `Comment.bodyJson`).
   * Typed `unknown` on purpose: it arrives from a Prisma `Json` column and must
   * be treated as untrusted regardless of what the type system claims.
   */
  doc?: unknown;
  /** The plain-text column. Used when `doc` is null — i.e. every legacy row. */
  fallbackText?: string | null;
  /** Shown when there is neither a document nor text. */
  emptyLabel?: string;
  className?: string;
};

export function RichRenderer({
  doc,
  fallbackText,
  emptyLabel,
  className = "",
}: RichRendererProps) {
  // A doc that exists but holds nothing visible must fall through to the empty
  // state, not render a blank box — saving an emptied description leaves
  // `{type:"doc",content:[]}` behind, and that should read as "no description".
  const hasDoc = isRichDoc(doc) && !isEmptyDoc(doc);

  const content = hasDoc
    ? renderNode(doc, 0)
    : fallbackText && fallbackText.trim() !== ""
      ? <PlainText text={fallbackText} />
      : null;

  if (content === null || content === undefined) {
    if (!emptyLabel) return null;
    return <p className="text-xs italic text-text-subtle">{emptyLabel}</p>;
  }

  return <div className={`${PROSE_CLASSES} ${className}`}>{content}</div>;
}
