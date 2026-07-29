// @ts-nocheck
/**
 * TipTap extension set for the editable surface.
 *
 * This is the *third* place the allowlist in `schema.ts` has to be kept in
 * step (write-time validation and the read-time renderer are the other two):
 * every node/mark this file can produce must be in ALLOWED_NODES /
 * ALLOWED_MARKS, or a user could type something that validates away to
 * nothing on save. The reverse direction (something allowed but not
 * produceable here) is safe — it only means legacy or hand-crafted documents
 * render a node type the editor itself never emits.
 *
 * Verified against the TipTap v3 docs (context7 /ueberdosis/tiptap-docs,
 * "StarterKit Updates" / upgrade-tiptap-v2 guide) before writing this file:
 * v3's `@tiptap/starter-kit` already bundles Link and Underline — v2 required
 * separate packages for both. That is why `.plan/editor-deps.md` does not
 * list `@tiptap/extension-link` or `@tiptap/extension-underline` — they
 * would be duplicate installs of what StarterKit already ships, and a
 * duplicate node/mark name is exactly the "different instances of a keyed
 * plugin" crash `@tiptap/pm` is pinned to avoid.
 *
 * No @tiptap/* import here reaches components that ship to read-only pages —
 * this module is only imported by RichEditor.tsx, which is behind
 * RichEditorLoader's next/dynamic(..., { ssr: false }).
 */

import StarterKit from "@tiptap/starter-kit";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { Placeholder } from "@tiptap/extensions";
import type { AnyExtension } from "@tiptap/core";
import { buildMentionSuggestion } from "./mention-suggestion";
import { MENTION_CLASSES } from "./prose";
import { safeHref } from "./urls";
import type { MentionMember } from "./types";

export type BuildExtensionsOptions = {
  placeholder?: string;
  members: MentionMember[];
};

export function buildExtensions({
  placeholder,
  members,
}: BuildExtensionsOptions): AnyExtension[] {
  return [
    StarterKit.configure({
      // Heading levels 4-6 validate and render (schema.ts / RichRenderer),
      // but the toolbar only exposes 1-3 — deeper levels are reachable by
      // pasting or by editing an older document, not by typing in this UI.
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ["http", "https", "mailto"],
        // Belt-and-braces: StarterKit's own protocol allowlist already blocks
        // javascript:, but this reuses the exact same function validate.ts
        // and RichRenderer apply at write/read time, so "safe" has one
        // definition in the whole feature, not three.
        validate: (href: string) => safeHref(href) !== null,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      },
      // codeBlock/blockquote/bulletList/orderedList/listItem/hardBreak/
      // horizontalRule/bold/italic/strike/code/underline all keep their
      // StarterKit defaults — every one of those node/mark names is in
      // ALLOWED_NODES / ALLOWED_MARKS.
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image.configure({
      // Client-side allowlisting only prevents *most* accidental garbage
      // (e.g. an extension misconfiguration); it is not the security
      // boundary. `sanitizeNodeAttrs("image", …)` in schema.ts re-validates
      // src on every write, and RichRenderer re-validates again on every
      // read, so a doc that reached the DB with a bad src still can't render
      // as one.
      HTMLAttributes: { loading: "lazy" },
      allowBase64: true,
    }),
    Mention.configure({
      HTMLAttributes: { class: MENTION_CLASSES },
      suggestion: buildMentionSuggestion(members),
      // Keep renderHTML aligned with RichRenderer's `case "mention"` output
      // (a `@label` span carrying data-mention-id) so what you see while
      // editing matches what a viewer sees afterwards.
      renderHTML({ node }) {
        return [
          "span",
          {
            class: MENTION_CLASSES,
            "data-mention-id": typeof node.attrs.id === "string" ? node.attrs.id : undefined,
          },
          `@${typeof node.attrs.label === "string" ? node.attrs.label : node.attrs.id}`,
        ];
      },
    }),
    Placeholder.configure({
      placeholder: placeholder ?? "Write something…",
      showOnlyWhenEditable: true,
    }),
  ];
}
