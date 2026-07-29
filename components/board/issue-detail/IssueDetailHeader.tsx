import { useState } from "react";
import Link from "next/link";
import {
  X,
  Share2,
  Tag,
  ExternalLink,
  Maximize2,
  Minimize2,
  Eye,
  Trash2,
  Copy,
  Sparkles,
  Layers,
} from "lucide-react";
import type { BoardIssue } from "../IssueCard";

interface IssueDetailHeaderProps {
  issue: BoardIssue;
  currentType: { icon: React.ReactNode; color: string; label: string; value: string };
  viewsCount: number;
  isWatching: boolean;
  watchersCount: number;
  isWideMode: boolean;
  onToggleWideMode: () => void;
  onToggleWatch: () => void;
  onAiSummarize: () => void;
  onDelete: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function IssueDetailHeader({
  issue,
  currentType,
  viewsCount,
  isWatching,
  watchersCount,
  isWideMode,
  onToggleWideMode,
  onToggleWatch,
  onAiSummarize,
  onDelete,
  onClose,
  showToast,
}: IssueDetailHeaderProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const issueUrl = typeof window !== "undefined" ? `${window.location.origin}/projects/${issue.projectKey}/issues/${issue.key}` : "";

  const copyToClipboard = (text: string, msg: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      showToast(msg);
      setShowShareMenu(false);
    }
  };

  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-surface shrink-0">
      {/* Breadcrumb, Key & Epic Badge */}
      <div className="flex items-center gap-2 text-xs font-semibold text-text-subtle flex-wrap min-w-0">
        <span className={`p-1 rounded shrink-0 ${currentType.color}`}>{currentType.icon}</span>
        <span className="font-mono text-text font-bold truncate min-w-0">{issue.key}</span>
        <span className="text-text-subtle/40 shrink-0">•</span>
        <span className="text-[11px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full uppercase tracking-wider truncate min-w-0">
          {issue.projectKey}
        </span>
        {/* Epic Context Badge */}
        {issue.parent && (
          <>
            <span className="text-text-subtle/40 shrink-0">•</span>
            <span className="text-[11px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 truncate min-w-0">
              <Layers size={11} className="shrink-0" /> <span className="truncate min-w-0">Epic: {issue.parent.summary || issue.parent.key}</span>
            </span>
          </>
        )}
      </div>

      {/* Quick Action Controls & Team Presence */}
      <div className="flex items-center gap-2">
        {/* Real View Counter Badge */}
        <div
          title={`${viewsCount} total view${viewsCount === 1 ? "" : "s"} on this ticket`}
          className="flex items-center gap-1.5 text-xs font-medium text-text-subtle bg-surface-hover/80 px-2 py-1 rounded-lg border border-border/50"
        >
          <Eye size={14} className="text-text-subtle/70" />
          <span>{viewsCount} {viewsCount === 1 ? "view" : "views"}</span>
        </div>

        {/* AI Executive Summary Button */}
        <button
          onClick={onAiSummarize}
          title="AI Executive Recap"
          className="hidden md:flex p-2.5 sm:p-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors items-center gap-1 text-xs font-bold"
        >
          <Sparkles size={14} />
          <span>AI Recap</span>
        </button>

        {/* Watcher Button */}
        <button
          onClick={onToggleWatch}
          title="Watch task for updates"
          className={`hidden md:flex px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all items-center gap-1.5 border ${
            isWatching
              ? "bg-selected text-selected-text border-selected-text/30"
              : "bg-surface border-border text-text-subtle hover:text-text hover:bg-neutral"
          }`}
        >
          <Eye size={13} />
          <span>{watchersCount}</span>
        </button>

        <div className="hidden md:block h-4 w-px bg-border my-auto mx-0.5" />

        {/* Drawer Width Switcher */}
        <button
          onClick={onToggleWideMode}
          title={isWideMode ? "Switch to standard width" : "Switch to wide width"}
          className="hidden md:flex p-2.5 sm:p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors items-center justify-center"
        >
          {isWideMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Full Page Link */}
        <Link
          href={`/projects/${issue.projectKey}/issues/${issue.key}`}
          target="_blank"
          rel="noreferrer"
          title="Open full page"
          className="hidden md:flex p-2.5 sm:p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors items-center gap-1 text-xs"
        >
          <ExternalLink size={15} />
        </Link>

        {/* Share / Copy Menu */}
        <div className="relative">
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            title="Share or copy links"
            className="p-2.5 sm:p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors"
          >
            <Share2 size={16} />
          </button>

          {showShareMenu && (
            <div className="absolute right-0 mt-2 w-52 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-xs animate-fade-in">
              <button
                onClick={() => copyToClipboard(`[${issue.key}: ${issue.summary}](${issueUrl})`, "Copied Markdown link!")}
                className="w-full text-left px-3 py-2 hover:bg-neutral flex items-center gap-2 text-text font-medium"
              >
                <Copy size={13} className="text-brand shrink-0" />
                <span className="truncate">Copy Markdown Link</span>
              </button>
              <button
                onClick={() => copyToClipboard(issue.key, "Copied task key!")}
                className="w-full text-left px-3 py-2 hover:bg-neutral flex items-center gap-2 text-text font-medium"
              >
                <Tag size={13} className="text-text-subtle shrink-0" />
                <span className="truncate">Copy Task Key</span>
              </button>
              <button
                onClick={() => copyToClipboard(issueUrl, "Copied direct link!")}
                className="w-full text-left px-3 py-2 hover:bg-neutral flex items-center gap-2 text-text font-medium border-t border-border/50"
              >
                <ExternalLink size={13} className="text-text-subtle shrink-0" />
                <span className="truncate">Copy Direct URL</span>
              </button>
            </div>
          )}
        </div>

        {/* Delete Task */}
        <button
          onClick={onDelete}
          title="Delete task"
          className="p-2.5 sm:p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 size={16} />
        </button>

        {/* Close Drawer */}
        <button
          onClick={onClose}
          title="Close (Esc)"
          className="p-2.5 sm:p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
