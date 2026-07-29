// @ts-nocheck
"use client";

/**
 * Formatting toolbar for RichEditor.
 *
 * Accessibility: the button group implements the WAI-ARIA "toolbar" roving
 * tabindex pattern — one button is Tab-reachable at a time, ArrowLeft/
 * ArrowRight/Home/End move focus within the group, and every button carries
 * an `aria-label` plus `aria-pressed` for its toggle state. The heading
 * picker is a native `<select>` (keyboard-operable for free; no custom
 * listbox needed for something this simple). Nothing in this file requires a
 * mouse.
 */

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Code2,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

type ToolbarButtonConfig = {
  key: string;
  label: string;
  icon: ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  onRun: () => void;
};

const HEADING_LEVELS = [1, 2, 3] as const;

function currentHeadingValue(editor: Editor): string {
  for (const level of HEADING_LEVELS) {
    if (editor.isActive("heading", { level })) return String(level);
  }
  return "paragraph";
}

function applyHeading(editor: Editor, value: string) {
  if (value === "paragraph") {
    editor.chain().focus().setParagraph().run();
    return;
  }
  editor
    .chain()
    .focus()
    .toggleHeading({ level: Number(value) as (typeof HEADING_LEVELS)[number] })
    .run();
}

export type EditorToolbarProps = {
  editor: Editor | null;
  onRequestLink: () => void;
  onRequestImage: () => void;
};

export function EditorToolbar({ editor, onRequestLink, onRequestImage }: EditorToolbarProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(0);

  if (!editor) return null;

  const buttons: ToolbarButtonConfig[] = [
    {
      key: "bold",
      label: "Bold",
      icon: <Bold size={14} />,
      isActive: editor.isActive("bold"),
      onRun: () => editor.chain().focus().toggleBold().run(),
    },
    {
      key: "italic",
      label: "Italic",
      icon: <Italic size={14} />,
      isActive: editor.isActive("italic"),
      onRun: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      key: "strike",
      label: "Strikethrough",
      icon: <Strikethrough size={14} />,
      isActive: editor.isActive("strike"),
      onRun: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      key: "code",
      label: "Inline code",
      icon: <Code size={14} />,
      isActive: editor.isActive("code"),
      onRun: () => editor.chain().focus().toggleCode().run(),
    },
    {
      key: "bulletList",
      label: "Bullet list",
      icon: <List size={14} />,
      isActive: editor.isActive("bulletList"),
      onRun: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      key: "orderedList",
      label: "Numbered list",
      icon: <ListOrdered size={14} />,
      isActive: editor.isActive("orderedList"),
      onRun: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      key: "taskList",
      label: "Checklist",
      icon: <ListChecks size={14} />,
      isActive: editor.isActive("taskList"),
      onRun: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      key: "blockquote",
      label: "Quote",
      icon: <Quote size={14} />,
      isActive: editor.isActive("blockquote"),
      onRun: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      key: "codeBlock",
      label: "Code block",
      icon: <Code2 size={14} />,
      isActive: editor.isActive("codeBlock"),
      onRun: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      key: "hr",
      label: "Horizontal rule",
      icon: <Minus size={14} />,
      onRun: () => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      key: "link",
      label: "Link",
      icon: <LinkIcon size={14} />,
      isActive: editor.isActive("link"),
      onRun: onRequestLink,
    },
    {
      key: "image",
      label: "Insert image",
      icon: <ImageIcon size={14} />,
      onRun: onRequestImage,
    },
    {
      key: "undo",
      label: "Undo",
      icon: <Undo2 size={14} />,
      isDisabled: !editor.can().undo(),
      onRun: () => editor.chain().focus().undo().run(),
    },
    {
      key: "redo",
      label: "Redo",
      icon: <Redo2 size={14} />,
      isDisabled: !editor.can().redo(),
      onRun: () => editor.chain().focus().redo().run(),
    },
  ];

  const focusButtonAt = (index: number) => {
    setFocusIndex(index);
    const el = groupRef.current?.querySelectorAll<HTMLButtonElement>("[data-toolbar-btn]")[index];
    el?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusButtonAt((index + 1) % buttons.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusButtonAt((index - 1 + buttons.length) % buttons.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusButtonAt(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusButtonAt(buttons.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-border bg-neutral/40 p-1.5">
      <select
        aria-label="Text style"
        value={currentHeadingValue(editor)}
        onChange={(e) => applyHeading(editor, e.target.value)}
        className="h-7 shrink-0 rounded border border-border bg-surface px-1.5 text-[11px] font-medium text-text outline-none focus:border-brand"
      >
        <option value="paragraph">Paragraph</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden="true" />

      <div
        role="toolbar"
        aria-label="Text formatting"
        ref={groupRef}
        className="flex flex-wrap items-center gap-0.5"
      >
        {buttons.map((btn, index) => (
          <Tooltip key={btn.key} content={btn.label}>
            <button
              type="button"
              data-toolbar-btn
              aria-label={btn.label}
              aria-pressed={btn.isActive ?? false}
              disabled={btn.isDisabled}
              tabIndex={index === focusIndex ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setFocusIndex(index)}
              onClick={btn.onRun}
              className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                btn.isActive
                  ? "bg-brand-subtle text-brand"
                  : "text-text-subtle hover:bg-neutral hover:text-text"
              }`}
            >
              {btn.icon}
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
