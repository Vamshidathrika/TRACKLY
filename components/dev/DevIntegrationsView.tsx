"use client";

import { useState, useEffect } from "react";
import {
  FolderGit2,
  GitBranch,
  GitPullRequest,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Plus,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectRepoModal } from "./ConnectRepoModal";
import { fetchDevDashboardDataAction } from "@/app/(app)/projects/[key]/dev/actions";

export type DevCommitItem = {
  hash: string;
  message: string;
  author: string;
  avatarUrl?: string;
  committedAt: string;
  url: string;
  taskKey?: string;
};

export function DevIntegrationsView({
  projectId,
  projectKey = "VAM",
}: {
  projectId: string;
  projectKey?: string;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasConnectedRepo, setHasConnectedRepo] = useState(false);
  const [stats, setStats] = useState<{
    activeBranches: number;
    openPRs: number;
    mergedPRs: number;
    pipelineStatus: "Passing" | "Failing" | "In Progress" | "Idle";
    commits: DevCommitItem[];
  }>({
    activeBranches: 14,
    openPRs: 2,
    mergedPRs: 5,
    pipelineStatus: "Passing",
    commits: [
      {
        hash: "8f3a12b",
        message: "feat: add super navigation tabs for space views",
        author: "Antigravity",
        committedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        url: "https://github.com/Vamshidathrika/TRACKLY/commit/8f3a12b",
        taskKey: `${projectKey}-1`,
      },
      {
        hash: "7c41d9e",
        message: "fix: update kanban board drag status handlers",
        author: "Dev Team",
        committedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        url: "https://github.com/Vamshidathrika/TRACKLY/commit/7c41d9e",
        taskKey: `${projectKey}-2`,
      },
      {
        hash: "2b99a0f",
        message: "chore: update dependencies and Prisma schemas",
        author: "Dev Team",
        committedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        url: "https://github.com/Vamshidathrika/TRACKLY/commit/2b99a0f",
      },
    ],
  });

  const loadData = async () => {
    setIsRefreshing(true);
    const res = await fetchDevDashboardDataAction(projectId);
    setIsRefreshing(false);
    if (res) {
      setHasConnectedRepo(res.hasConnectedRepo);
      if (res.stats) {
        setStats({
          activeBranches: res.stats.activeBranches,
          openPRs: res.stats.openPRs,
          mergedPRs: res.stats.mergedPRs,
          pipelineStatus: res.stats.pipelineStatus as any,
          commits: res.stats.commits as any,
        });
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  return (
    <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-200">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <FolderGit2 size={18} className="text-brand" />
          <h3 className="text-sm font-extrabold text-text tracking-tight">Development & Git Integrations</h3>
          {hasConnectedRepo ? (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono">
              Live GitHub Connected
            </span>
          ) : (
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 font-mono">
              GitHub Sync Ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-bold text-text hover:bg-neutral transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-brand" : "text-text-subtle"} />
            <span>{isRefreshing ? "Syncing..." : "Sync Now"}</span>
          </button>

          <ConnectRepoModal
            projectId={projectId}
            onSuccess={loadData}
            trigger={
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand text-white text-xs font-bold hover:bg-brand-hovered transition-all shadow-xs cursor-pointer">
                <Plus size={14} />
                <span>+ Connect Repository</span>
              </button>
            }
          />
        </div>
      </div>

      {/* Summary Widgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex items-center justify-between hover:border-purple-500/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 shrink-0">
              <GitBranch size={18} />
            </div>
            <div>
              <span className="text-[10px] text-text-subtle uppercase font-extrabold tracking-wider">Active Branches</span>
              <p className="text-xl font-mono font-extrabold text-text mt-0.5">{stats.activeBranches} Branches</p>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex items-center justify-between hover:border-emerald-500/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
              <GitPullRequest size={18} />
            </div>
            <div>
              <span className="text-[10px] text-text-subtle uppercase font-extrabold tracking-wider">Open Pull Requests</span>
              <p className="text-xl font-mono font-extrabold text-text mt-0.5">
                {stats.mergedPRs} Merged / {stats.openPRs} Pending
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex items-center justify-between hover:border-sky-500/40 transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 shrink-0">
              <GitCommit size={18} />
            </div>
            <div>
              <span className="text-[10px] text-text-subtle uppercase font-extrabold tracking-wider">CI/CD Pipeline Status</span>
              <p className="text-sm font-extrabold text-emerald-600 flex items-center gap-1 mt-0.5 font-mono">
                <CheckCircle2 size={15} /> {stats.pipelineStatus} (main)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Git Commits Stream */}
      <div className="rounded-[16px] border border-border bg-surface p-5 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h4 className="text-xs font-extrabold text-text uppercase tracking-wider flex items-center gap-2">
            <span>Recent Git Commits</span>
            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-neutral text-text-subtle">
              {stats.commits.length} commits
            </span>
          </h4>
          <span className="text-[11px] text-text-subtle font-medium flex items-center gap-1">
            <Zap size={12} className="text-amber-500" /> Auto-linked by task keys
          </span>
        </div>

        <div className="divide-y divide-border/60">
          {stats.commits.map((c) => (
            <div key={c.hash} className="py-3 flex items-center justify-between gap-4 text-xs hover:bg-neutral/30 px-2 rounded-lg transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-brand hover:underline flex items-center gap-0.5 shrink-0"
                >
                  <span>{c.hash}</span>
                  <ExternalLink size={10} />
                </a>

                {c.taskKey && (
                  <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand shrink-0">
                    {c.taskKey}
                  </span>
                )}

                <span className="font-semibold text-text truncate">{c.message}</span>
              </div>

              <div className="flex items-center gap-3 text-text-subtle shrink-0">
                <span className="font-medium text-xs text-text">{c.author}</span>
                <span className="font-mono text-[11px]">{new Date(c.committedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
