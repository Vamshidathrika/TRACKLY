"use client";

import { useState } from "react";
import { Video, ExternalLink, Plus, Trash2, Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { parseLoomUrl } from "@/lib/integrations/providers";

export function LoomEmbedder({
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

  const handleAddLoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!inputUrl.trim()) return;

    const parsed = parseLoomUrl(inputUrl);
    if (!parsed) {
      setErrorMsg("Please enter a valid Loom video URL (e.g. https://www.loom.com/share/...)");
      return;
    }

    if (urls.includes(parsed.originalUrl)) {
      setErrorMsg("This Loom recording is already attached.");
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
          <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
            <Video size={16} />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs">Loom Bug Video Screen Recordings</h4>
            <p className="text-[11px] text-text-subtle">
              Attach video recordings for bug reproduction steps or QA walkthroughs.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
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
      <form onSubmit={handleAddLoom} className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Paste Loom share link (https://www.loom.com/share/...)"
          className="flex-1 px-3 py-2 h-10 sm:h-auto rounded-lg border border-border bg-surface text-text font-mono text-[11px] focus:outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="h-10 sm:h-auto px-4 py-2 rounded-lg bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition-all flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Attach Video</span>
        </button>
      </form>

      {/* Video Selector Pills */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {urls.map((url, idx) => {
            const parsed = parseLoomUrl(url);
            const isActive = activeEmbedIndex === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-semibold ${
                  isActive
                    ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-600 font-bold"
                    : "bg-surface border-border text-text-subtle hover:text-text hover:bg-neutral"
                }`}
              >
                <span onClick={() => setActiveEmbedIndex(idx)} className="cursor-pointer flex items-center gap-1.5">
                  <Video size={13} className="text-indigo-500" />
                  <span>Recording #{idx + 1} ({parsed?.videoId.slice(0, 6)}...)</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-text-subtle hover:text-red-500 transition-colors p-2 sm:p-0.5 rounded"
                  title="Remove video link"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Loom Player */}
      {activeEmbedIndex !== null && urls[activeEmbedIndex] && (
        <div className="relative rounded-xl border border-border bg-surface overflow-hidden shadow-md flex flex-col aspect-video w-full">
          <div className="flex items-center justify-between px-4 py-2 bg-neutral/40 border-b border-border text-[11px]">
            <div className="flex items-center gap-2">
              <Video size={14} className="text-indigo-500" />
              <span className="font-mono font-bold text-text truncate max-w-xs">
                {urls[activeEmbedIndex]}
              </span>
            </div>
            <a
              href={urls[activeEmbedIndex]}
              target="_blank"
              rel="noreferrer"
              className="p-2 sm:p-1 rounded text-text-subtle hover:text-text hover:bg-neutral flex items-center gap-1 text-[10px] font-bold"
            >
              <ExternalLink size={12} /> Open Loom
            </a>
          </div>

          {(() => {
            const parsed = parseLoomUrl(urls[activeEmbedIndex]);
            if (!parsed) return <div className="p-4 text-text-subtle">Invalid Loom URL</div>;
            return (
              <iframe
                src={parsed.embedUrl}
                allowFullScreen
                className="flex-1 w-full h-full border-0 bg-slate-900"
                title={`Loom Embed ${activeEmbedIndex + 1}`}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
