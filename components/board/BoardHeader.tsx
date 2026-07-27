"use client";

import { memo } from "react";
import { Star, Share2, Download, Maximize2, MoreHorizontal, Sparkles } from "lucide-react";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

type BoardHeaderProps = {
  projectName: string;
  projectKey: string;
  projectId?: string;
  availableUsers?: { id: string; name: string; avatarUrl?: string | null }[];
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
  projectId,
  availableUsers = [],
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
    <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-border">
      {/* View Title & Quick Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-text tracking-tight">{projectName}</h2>
          <span className="text-xs text-text-subtle bg-neutral px-2 py-0.5 rounded-full font-mono">
            {projectKey}
          </span>
        </div>

        {/* Active Participants Profile Circles */}
        {availableUsers.length > 0 && (
          <div className="hidden sm:flex items-center -space-x-2 overflow-hidden ml-2 pl-2 border-l border-border">
            {availableUsers.slice(0, 5).map((user) => (
              <div
                key={user.id}
                title={`${user.name} (Active Board Participant)`}
                className="relative inline-block h-7 w-7 rounded-full ring-2 ring-surface bg-brand/20 text-brand font-bold text-[10px] flex items-center justify-center shrink-0 uppercase shadow-xs transition-transform hover:scale-110 hover:z-10"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span>{user.name.slice(0, 2)}</span>
                )}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-surface" />
              </div>
            ))}
            {availableUsers.length > 5 && (
              <div
                title={`${availableUsers.length - 5} more active participants`}
                className="relative inline-block h-7 w-7 rounded-full ring-2 ring-surface bg-neutral text-text-subtle font-extrabold text-[10px] flex items-center justify-center shrink-0"
              >
                +{availableUsers.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
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
          defaultProjectId={projectId}
          trigger={
            <Button appearance="primary" className="h-9 px-4 rounded-lg bg-brand text-white hover:bg-brand-hovered font-semibold text-xs shadow-xs">
              Create task
            </Button>
          }
        />
      </div>
    </div>
  );
}

export const BoardHeader = memo(BoardHeaderComponent);
