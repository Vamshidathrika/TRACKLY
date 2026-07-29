// @ts-nocheck
"use client";

/**
 * The editable rich text surface. Used for both issue descriptions and
 * comments (see RichEditorLoader.tsx for the dynamic-import wrapper both
 * call sites actually render).
 *
 * ── WHAT LEAVES THIS COMPONENT ──────────────────────────────────────────
 * `onChange`/`onSubmit` hand back `{ doc, text }` (RichValue). `doc` is
 * TipTap's `editor.getJSON()` output — it has never been through
 * validateRichDoc() at this point, because validation is a write-time
 * concern that belongs to the server action that persists it (see
 * .plan/editor-deps.md, "Server-side wiring still required"). Nothing in
 * this file renders `doc` as HTML; ProseMirror owns the contenteditable DOM,
 * and every render of *stored* content goes through RichRenderer instead.
 *
 * ── IMAGES ──────────────────────────────────────────────────────────────
 * Paste and drop are handled at the ProseMirror `view` level (not through
 * the `editor` object), because `editorProps` is evaluated once during
 * `useEditor()`, before the `editor` value this component holds exists yet.
 * Using `view.state.schema` / `view.dispatch` sidesteps that ordering problem
 * entirely instead of stashing the editor in a ref and hoping paste always
 * happens after mount.
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import { X } from "lucide-react";
import { buildExtensions } from "./extensions";
import { EditorToolbar } from "./EditorToolbar";
import { EDITOR_SURFACE_CLASSES } from "./prose";
import { richDocToPlainText, plainTextToRichDoc } from "./text";
import { isEmptyDoc } from "./types";
import type { MentionMember, RichDoc, RichValue } from "./types";
import { uploadEditorImageAction } from "./upload-image-action";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type RichEditorHandle = {
  clear: () => void;
  focus: () => void;
  isEmpty: () => boolean;
  getValue: () => RichValue;
  /** Inserts plain text at the current cursor position (e.g. a "quick reply" chip). */
  insertText: (text: string) => void;
};

export type RichEditorProps = {
  /** Seed content. If `initialDoc` is present and non-empty it wins; otherwise
   * `initialText` (a legacy plain-text row) is upgraded via plainTextToRichDoc. */
  initialDoc?: RichDoc | null;
  initialText?: string | null;
  placeholder?: string;
  /** Project members offered by the @-mention popup. */
  members?: MentionMember[];
  /** Required for image paste/drop/insert to work — see upload-image-action.ts. */
  issueId?: string;
  ariaLabel: string;
  autoFocus?: boolean;
  minHeightClassName?: string;
  onChange?: (value: RichValue) => void;
  /** Fired on Cmd/Ctrl+Enter — the composer's "submit" shortcut. */
  onSubmit?: (value: RichValue) => void;
  submitHint?: string;
  className?: string;
};

function editorValueFromDoc(doc: unknown): RichValue {
  const richDoc = doc as RichDoc;
  return { doc: richDoc, text: richDocToPlainText(richDoc) };
}

export const RichEditor = forwardRef<RichEditorHandle, RichEditorProps>(function RichEditor(
  {
    initialDoc,
    initialText,
    placeholder = "Write something…",
    members = [],
    issueId,
    ariaLabel,
    autoFocus = false,
    minHeightClassName = "min-h-[6rem]",
    onChange,
    onSubmit,
    submitHint,
    className = "",
  },
  ref
) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadSeq = useRef(0);

  // Computed once per mount, not on every keystroke: `content` is only read
  // by useEditor() at creation time, so recomputing this on every render
  // would be dead work (and, worse, a stale closure over changing seed props
  // would be actively wrong — this component isn't supposed to react to the
  // parent re-seeding it after the user starts typing).
  const seedDocRef = useRef<RichDoc>(
    initialDoc && !isEmptyDoc(initialDoc) ? initialDoc : plainTextToRichDoc(initialText ?? "")
  );
  const seedDoc = seedDocRef.current;

  const reportUploadError = useCallback((message: string) => {
    const seq = ++uploadSeq.current;
    setUploadError(message);
    // Self-clearing so a second, successful upload doesn't leave a stale
    // banner behind if the user never dismisses it.
    setTimeout(() => {
      if (uploadSeq.current === seq) setUploadError(null);
    }, 6000);
  }, []);

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!issueId) {
        reportUploadError("Save the issue before adding images.");
        return null;
      }
      if (!file.type.startsWith("image/")) {
        reportUploadError(`${file.name} is not an image`);
        return null;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        reportUploadError(`${file.name} is larger than the 5 MB limit`);
        return null;
      }
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadEditorImageAction(issueId, formData);
      if ("error" in result) {
        reportUploadError(result.error);
        return null;
      }
      return result.url;
    },
    [issueId, reportUploadError]
  );

  // Paste/drop insert directly through the ProseMirror view — see the file
  // banner for why this can't go through the `editor` object.
  const insertImageAtView = useCallback(
    (view: EditorView, file: File, pos: number) => {
      void uploadFile(file).then((url) => {
        if (!url) return;
        const imageType = view.state.schema.nodes.image;
        if (!imageType) return;
        const node = imageType.create({ src: url, alt: file.name });
        view.dispatch(view.state.tr.insert(pos, node));
      });
    },
    [uploadFile]
  );

  const editor = useEditor({
    extensions: buildExtensions({ placeholder, members }),
    content: seedDoc,
    autofocus: autoFocus,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: `${EDITOR_SURFACE_CLASSES} ${minHeightClassName} px-3 py-2`,
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": "true",
      },
      handleKeyDown: (view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          if (onSubmit) {
            event.preventDefault();
            onSubmit(editorValueFromDoc(view.state.doc.toJSON()));
          }
          return true;
        }
        return false;
      },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const pos = view.state.selection.from;
        files.forEach((file) => insertImageAtView(view, file, pos));
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/")
        );
        if (files.length === 0) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        const pos = coords?.pos ?? view.state.selection.from;
        files.forEach((file) => insertImageAtView(view, file, pos));
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange?.(editorValueFromDoc(instance.getJSON()));
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      clear: () => editor?.commands.clearContent(true),
      focus: () => editor?.commands.focus(),
      isEmpty: () => editor?.isEmpty ?? true,
      getValue: () => editorValueFromDoc(editor?.getJSON() ?? { type: "doc", content: [] }),
      insertText: (text: string) => {
        if (!editor) return;
        const prefix = editor.isEmpty ? "" : " ";
        editor.chain().focus("end").insertContent(`${prefix}${text}`).run();
      },
    }),
    [editor]
  );

  const openLinkEditor = useCallback(() => {
    if (!editor) return;
    setLinkValue((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkEditorOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = linkValue.trim();
    if (href === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkEditorOpen(false);
  }, [editor, linkValue]);

  const handleImageInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (!editor || files.length === 0) return;
      files.forEach((file) => {
        void uploadFile(file).then((url) => {
          if (!url) return;
          editor
            .chain()
            .focus()
            .insertContent({ type: "image", attrs: { src: url, alt: file.name } })
            .run();
        });
      });
    },
    [editor, uploadFile]
  );

  return (
    <div className={className}>
      <EditorToolbar
        editor={editor}
        onRequestLink={openLinkEditor}
        onRequestImage={() => imageInputRef.current?.click()}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
        multiple
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleImageInputChange}
      />

      {linkEditorOpen && (
        <div className="flex items-center gap-2 border border-b-0 border-border bg-neutral/20 px-2 py-1.5">
          <label htmlFor="rich-editor-link-input" className="sr-only">
            Link URL
          </label>
          <input
            id="rich-editor-link-input"
            type="url"
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setLinkEditorOpen(false);
              }
            }}
            placeholder="https://example.com"
            className="h-7 flex-1 rounded border border-border bg-surface px-2 text-xs outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={applyLink}
            className="h-7 rounded bg-brand px-2 text-[11px] font-semibold text-white hover:bg-brand-hovered"
          >
            Apply
          </button>
          <button
            type="button"
            aria-label="Cancel link edit"
            onClick={() => setLinkEditorOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded text-text-subtle hover:bg-neutral hover:text-text"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <EditorContent
        editor={editor}
        className={`rounded-b-lg border border-border bg-surface ${linkEditorOpen ? "" : ""}`}
      />

      {uploadError && (
        <p role="alert" className="mt-1 text-[11px] text-danger">
          {uploadError}
        </p>
      )}

      {submitHint && (
        <p className="mt-1 text-[10px] italic text-text-subtle">{submitHint}</p>
      )}
    </div>
  );
});
