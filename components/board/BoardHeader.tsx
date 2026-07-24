"use client";

import { memo } from "react";
import { Star, Share2, Download, Maximize2, MoreHorizontal, Sparkles } from "lucide-react";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

type BoardHeaderProps = {
  projectName: string;
  projectKey: string;
  isStarred: boolean;
  onToggleStar: () => void;
  onShare: () => void;
  onExport: () => void;
  onFullscreen: () => void;
  onToggleAIDrawer: () => void;
  onOpenSpaceMenu: () => void;
  showSpaceMenu: boolean;
};

function BoardHeaderComponent({
  projectName,
  projectKey,
  isStarred,
  onToggleStar,
  onShare,
  onExport,
  onFullscreen,
  onToggleAIDrawer,
  onOpenSpaceMenu,
  showSpaceMenu,
}: BoardHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border">
      {/* Title & Key */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand font-bold text-sm flex items-center justify-center border border-brand/20 shadow-xs">
          {projectKey.slice(0, 3)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text tracking-tight">{projectName}</h1>
            <button
              onClick={onToggleStar}
              title={isStarred ? "Unstar project" : "Star project"}
              className="p-1 rounded-md hover:bg-neutral transition-colors text-subtle hover:text-amber-500"
            >
              <Star size={16} className={isStarred ? "fill-amber-400 text-amber-400" : ""} />
            </button>
          </div>
          <p className="text-xs text-text-subtle">Key: <span className="font-mono font-semibold">{projectKey}</span></p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAIDrawer}
          className="h-9 px-3.5 rounded-lg border border-brand/40 bg-brand/5 text-brand hover:bg-brand/15 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-xs"
        >
          <Sparkles size={14} /> AI Assistant
        </button>

        <button
          onClick={onShare}
          title="Share board link"
          className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-neutral text-text-subtle hover:text-text transition-all text-xs font-medium flex items-center gap-1.5"
        >
          <Share2 size={14} /> Share
        </button>

        <button
          onClick={onExport}
          title="Export board data as JSON"
          className="h-9 px-3 rounded-lg border border-border bg-surface hover:bg-neutral text-text-subtle hover:text-text transition-all text-xs font-medium flex items-center gap-1.5"
        >
          <Download size={14} /> Export
        </button>

        <button
          onClick={onFullscreen}
          title="Toggle fullscreen mode"
          className="h-9 w-9 rounded-lg border border-border bg-surface hover:bg-neutral text-text-subtle hover:text-text transition-all flex items-center justify-center"
        >
          <Maximize2 size={14} />
        </button>

        <div className="relative">
          <button
            onClick={onOpenSpaceMenu}
            className="h-9 w-9 rounded-lg border border-border bg-surface hover:bg-neutral text-text-subtle hover:text-text transition-all flex items-center justify-center"
          >
            <MoreHorizontal size={16} />
          </button>

          {showSpaceMenu && (
            <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-border bg-surface p-1 shadow-xl text-xs animate-in fade-in duration-150">
              <button
                onClick={onToggleStar}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral font-medium text-text"
              >
                {isStarred ? "Unstar Space" : "Star Space"}
              </button>
              <button
                onClick={onExport}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral font-medium text-text"
              >
                Export Space Data
              </button>
            </div>
          )}
        </div>

        <CreateIssueModal
          trigger={
            <Button appearance="primary" className="h-9 px-4 rounded-lg bg-brand text-white hover:bg-brand-hovered font-semibold text-xs shadow-xs">
              Create issue
            </Button>
          }
        />
      </div>
    </div>
  );
}

export const BoardHeader = memo(BoardHeaderComponent);
