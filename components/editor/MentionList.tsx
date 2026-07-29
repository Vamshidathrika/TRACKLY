"use client";

/**
 * The @-mention suggestion popup.
 *
 * Rendered by TipTap's Suggestion utility via ReactRenderer (see
 * mention-suggestion.ts) — not mounted directly by any page. It gets its
 * position from `props.mount()`, which the Suggestion utility calls with the
 * element this component renders into; no floating-ui/tippy dependency of
 * our own (see .plan/editor-deps.md, "Explicitly NOT added").
 *
 * Keyboard handling is exposed via an imperative `onKeyDown`, which is how
 * TipTap's suggestion plugin forwards ArrowUp/ArrowDown/Enter while focus
 * stays in the contenteditable — this is what makes "@" mention selection
 * work without a mouse.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { MentionMember } from "./types";

export type MentionListHandle = {
  onKeyDown: (opts: { event: KeyboardEvent }) => boolean;
};

export type MentionListProps = {
  items: MentionMember[];
  command: (member: MentionMember) => void;
};

export const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selected, setSelected] = useState(0);

    // The query changes on every keystroke; keep the highlighted row in range
    // and predictable rather than pointing at whatever used to be there.
    useEffect(() => {
      setSelected(0);
    }, [items]);

    const selectIndex = (index: number) => {
      const member = items[index];
      if (member) command(member);
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false;
        if (event.key === "ArrowDown") {
          setSelected((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          selectIndex(selected);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div
          role="listbox"
          aria-label="Mention a project member"
          className="w-56 rounded-lg border border-border bg-surface p-2 text-xs italic text-text-subtle shadow-lg"
        >
          No matching members
        </div>
      );
    }

    return (
      <div
        role="listbox"
        aria-label="Mention a project member"
        className="max-h-56 w-64 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
      >
        {items.map((member, index) => (
          <button
            key={member.id}
            type="button"
            role="option"
            aria-selected={index === selected}
            onMouseEnter={() => setSelected(index)}
            onClick={() => selectIndex(index)}
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
              index === selected ? "bg-brand-subtle text-brand" : "text-text hover:bg-neutral"
            }`}
          >
            <Avatar name={member.name} src={member.avatarUrl} size={20} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{member.name}</span>
              {member.email ? (
                <span className="truncate text-[10px] text-text-subtle">{member.email}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    );
  }
);
