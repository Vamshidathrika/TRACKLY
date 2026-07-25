"use client";

import { useState } from "react";
import { LayoutGrid, ExternalLink, Plus, Trash2, Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { parseMiroUrl } from "@/lib/integrations/providers";

export function MiroEmbedPanel({
  initialUrls = [],
  onUrlsChange,
}: {
  initialUrls?: string[];
  onUrlsChange?: (urls: string[]) => void;
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [inputUrl, setInputUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeEmbedIndex, setActiveEmbedIndex] = useState<number | null>(
    initialUrls.length > 0 ? 0 : null
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleAddMiro = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!inputUrl.trim()) return;

    const parsed = parseMiroUrl(inputUrl);
    if (!parsed) {
      setErrorMsg("Please enter a valid Miro board URL (e.g. https://miro.com/app/board/...)");
      return;
    }

    if (urls.includes(parsed.originalUrl)) {
      setErrorMsg("This Miro board is already attached.");
      return;
    }

    const updated = [...urls, parsed.originalUrl];
    setUrls(updated);
    setInputUrl("");
    setActiveEmbedIndex(updated.length - 1);
    onUrlsChange?.(updated);
  };

  const handleRemove = (index: number) => {
    const updated = urls.filter((_, i) => i !== index);
    setUrls(updated);
    if (activeEmbedIndex === index) {
      setActiveEmbedIndex(updated.length > 0 ? 0 : null);
    } else if (activeEmbedIndex !== null && activeEmbedIndex > index) {
      setActiveEmbedIndex(activeEmbedIndex - 1);
    }
    onUrlsChange?.(updated);
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border bg-neutral/20 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <LayoutGrid size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs">Miro Interactive Whiteboard Canvas</h4>
            <p className="text-[11px] text-text-subtle">
              Embed live agile retrospectives and architecture whiteboard diagrams.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
          {urls.length} Attached
        </span>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] font-semibold text-red-600 flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* URL Attachment Input */}
      <form onSubmit={handleAddMiro} className="flex gap-2">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Paste Miro board link (https://miro.com/app/board/...)"
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-text font-mono text-[11px] focus:outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-extrabold hover:bg-amber-400 transition-all flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Attach Board</span>
        </button>
      </form>

      {/* Board Selector Pills */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {urls.map((url, idx) => {
            const parsed = parseMiroUrl(url);
            const isActive = activeEmbedIndex === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-semibold ${
                  isActive
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 font-bold"
                    : "bg-surface border-border text-text-subtle hover:text-text hover:bg-neutral"
                }`}
              >
                <span onClick={() => setActiveEmbedIndex(idx)} className="cursor-pointer flex items-center gap-1.5">
                  <LayoutGrid size={13} className="text-amber-500" />
                  <span>Board #{idx + 1} ({parsed?.boardId.slice(0, 6)}...)</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-text-subtle hover:text-red-500 transition-colors p-0.5 rounded"
                  title="Remove Miro board"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Miro Canvas Embed */}
      {activeEmbedIndex !== null && urls[activeEmbedIndex] && (
        <div
          className={`relative rounded-xl border border-border bg-surface overflow-hidden shadow-md flex flex-col transition-all ${
            isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "h-96 w-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-neutral/40 border-b border-border text-[11px]">
            <div className="flex items-center gap-2">
              <LayoutGrid size={14} className="text-amber-500" />
              <span className="font-mono font-bold text-text truncate max-w-xs">
                {urls[activeEmbedIndex]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={urls[activeEmbedIndex]}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-text-subtle hover:text-text hover:bg-neutral flex items-center gap-1 text-[10px] font-bold"
              >
                <ExternalLink size={12} /> Open Miro
              </a>
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1 rounded text-text-subtle hover:text-text hover:bg-neutral"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {(() => {
            const parsed = parseMiroUrl(urls[activeEmbedIndex]);
            if (!parsed) return <div className="p-4 text-text-subtle">Invalid Miro URL</div>;
            return (
              <iframe
                src={parsed.embedUrl}
                allowFullScreen
                className="flex-1 w-full h-full border-0 bg-slate-900"
                title={`Miro Canvas ${activeEmbedIndex + 1}`}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
