// @ts-nocheck
/**
 * @-mention suggestion source for the Mention extension.
 *
 * `members` is the project member list already loaded by the issue detail
 * page (the same array `IssueDetail` uses for the assignee/reporter
 * selects — see its `members` prop). Filtering here is a plain in-memory
 * substring match, not a network request:
 *   - no new server action, nothing added to `app/.../actions.ts`
 *   - the popup can only ever offer members of the project the viewer is
 *     already looking at, because that is the array it was handed
 *
 * Positioning of the popup is TipTap v3's own suggestion-utility behaviour
 * (`props.mount(component.element)`, confirmed against context7
 * /ueberdosis/tiptap-docs "Custom suggestion extension using Suggestion()
 * with ReactRenderer popup") — no floating-ui/tippy dependency of our own.
 */

import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { MentionList, type MentionListHandle } from "./MentionList";
import type { MentionMember } from "./types";

const MAX_SUGGESTIONS = 8;

export function buildMentionSuggestion(
  members: MentionMember[]
): Omit<SuggestionOptions<MentionMember>, "editor"> {
  return {
    char: "@",
    allowSpaces: false,
    items: ({ query }) => {
      const q = query.trim().toLowerCase();
      const pool =
        q === ""
          ? members
          : members.filter(
              (m) =>
                m.name.toLowerCase().includes(q) ||
                (m.email ?? "").toLowerCase().includes(q)
            );
      return pool.slice(0, MAX_SUGGESTIONS);
    },
    command: ({ editor, range, props }) => {
      const member = props as MentionMember;
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: "mention", attrs: { id: member.id, label: member.name } },
          { type: "text", text: " " },
        ])
        .run();
    },
    render: () => {
      let component: ReactRenderer<MentionListHandle, unknown> | null = null;
      let unmount: (() => void) | undefined;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });
          if (!props.clientRect) return;
          unmount = props.mount?.(component.element);
        },
        onUpdate: (props) => {
          component?.updateProps(props);
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            component?.destroy();
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          unmount?.();
          component?.destroy();
        },
      };
    },
  };
}
