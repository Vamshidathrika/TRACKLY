"use client";

import { useState } from "react";
import { ExternalLink, Plus, Trash2, Maximize2, Minimize2, Check, AlertCircle } from "lucide-react";
import { parseFigmaUrl } from "@/lib/integrations/providers";

function FigmaIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
    </svg>
  );
}

export function FigmaEmbedPanel({
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

  const handleAddFigma = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!inputUrl.trim()) return;

    const parsed = parseFigmaUrl(inputUrl);
    if (!parsed) {
      setErrorMsg("Please enter a valid Figma file or prototype URL (e.g. https://figma.com/file/...)");
      return;
    }

    if (urls.includes(parsed.originalUrl)) {
      setErrorMsg("This Figma design frame is already attached.");
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
          <div className="h-7 w-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold">
            <FigmaIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-text text-xs">Figma Design Frames</h4>
            <p className="text-[11px] text-text-subtle">
              Attach wireframes & prototype specs directly to this task.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-pink-500/10 text-pink-600 border border-pink-500/20">
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
      <form onSubmit={handleAddFigma} className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Paste Figma file URL (https://www.figma.com/file/...)"
          className="flex-1 px-3 py-2 h-10 sm:h-auto rounded-lg border border-border bg-surface text-text font-mono text-[11px] focus:outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="h-10 sm:h-auto px-4 py-2 rounded-lg bg-brand text-white font-extrabold hover:bg-brand-hovered transition-all flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus size={14} />
          <span>Attach</span>
        </button>
      </form>

      {/* Frame Selector Pills */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {urls.map((url, idx) => {
            const parsed = parseFigmaUrl(url);
            const isActive = activeEmbedIndex === idx;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-semibold ${
                  isActive
                    ? "bg-brand/10 border-brand/40 text-brand font-bold"
                    : "bg-surface border-border text-text-subtle hover:text-text hover:bg-neutral"
                }`}
              >
                <span onClick={() => setActiveEmbedIndex(idx)} className="cursor-pointer flex items-center gap-1.5">
                  <FigmaIcon className="w-3.5 h-3.5" />
                  <span>Frame #{idx + 1} {parsed?.nodeId ? `(${parsed.nodeId})` : ""}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-text-subtle hover:text-red-500 transition-colors p-2 sm:p-0.5 rounded"
                  title="Remove design link"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Figma Canvas Iframe Embed */}
      {activeEmbedIndex !== null && urls[activeEmbedIndex] && (
        <div
          className={`relative rounded-xl border border-border bg-surface overflow-hidden shadow-md flex flex-col transition-all ${
            isFullscreen ? "fixed inset-4 z-50 shadow-2xl" : "h-[60vh] sm:h-96 w-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-2 bg-neutral/40 border-b border-border text-[11px]">
            <div className="flex items-center gap-2">
              <FigmaIcon className="w-3.5 h-3.5" />
              <span className="font-mono font-bold text-text truncate max-w-xs">
                {urls[activeEmbedIndex]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={urls[activeEmbedIndex]}
                target="_blank"
                rel="noreferrer"
                className="p-2 sm:p-1 rounded text-text-subtle hover:text-text hover:bg-neutral flex items-center gap-1 text-[10px] font-bold"
              >
                <ExternalLink size={12} /> Open Figma
              </a>
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 sm:p-1 rounded text-text-subtle hover:text-text hover:bg-neutral"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          {(() => {
            const parsed = parseFigmaUrl(urls[activeEmbedIndex]);
            if (!parsed) return <div className="p-4 text-text-subtle">Invalid Figma URL</div>;
            return (
              <iframe
                src={parsed.embedUrl}
                allowFullScreen
                className="flex-1 w-full h-full border-0 bg-slate-900"
                title={`Figma Embed ${activeEmbedIndex + 1}`}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
