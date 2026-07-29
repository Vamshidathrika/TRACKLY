"use client";

/**
 * Dynamic-import wrapper for RichEditor.
 *
 * `ssr: false` is load-bearing, not a performance nicety: TipTap's
 * `useEditor` builds a ProseMirror view against `document`, and mounting
 * that during SSR produces a Next 15 hydration mismatch on the
 * contenteditable subtree. Combined with `immediatelyRender: false` inside
 * RichEditor itself, the editor only ever renders client-side.
 *
 * This is also the file that keeps the ~145 kB TipTap/ProseMirror bundle
 * (see .plan/editor-deps.md, "Bundle-size impact") out of every issue page
 * that only *reads* content — RichRenderer has no @tiptap/* import and does
 * not go through this loader, so a read-only view pays ~2 kB, and the editor
 * chunk only loads once a user actually focuses a composer or clicks Edit.
 */

import dynamic from "next/dynamic";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { RichEditorHandle, RichEditorProps } from "./RichEditor";

function EditorSkeleton({
  minHeightClassName = "min-h-[6rem]",
}: {
  minHeightClassName?: string;
}) {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="h-9 rounded-t-lg border border-b-0 border-border bg-neutral/40" />
      <div className={`rounded-b-lg border border-border bg-surface ${minHeightClassName}`} />
    </div>
  );
}

export const RichEditorLoader = dynamic(
  () => import("./RichEditor").then((mod) => mod.RichEditor),
  {
    ssr: false,
    loading: () => <EditorSkeleton />,
  }
) as ForwardRefExoticComponent<RichEditorProps & RefAttributes<RichEditorHandle>>;
