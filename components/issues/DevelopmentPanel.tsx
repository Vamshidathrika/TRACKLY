"use client";

import {
  FolderGit2,
  GitBranch,
  GitPullRequest,
  GitCommit,
  CheckCircle2,
  ExternalLink,
  Zap,
} from "lucide-react";

export type LinkedBranch = {
  id: string;
  name: string;
  lastCommitHash?: string | null;
};

export type LinkedPullRequest = {
  id: string;
  prNumber: number;
  title: string;
  status: "OPEN" | "MERGED" | "CLOSED" | string;
  authorName: string;
  url?: string | null;
};

export type LinkedCommit = {
  id: string;
  hash: string;
  message: string;
  authorName: string;
  committedAt: Date | string;
  url?: string | null;
};

export function DevelopmentPanel({
  issueKey,
  branches = [],
  pullRequests = [],
  commits = [],
  pipelineStatus = "Passing",
}: {
  issueKey: string;
  branches?: LinkedBranch[];
  pullRequests?: LinkedPullRequest[];
  commits?: LinkedCommit[];
  pipelineStatus?: string;
}) {
  const defaultBranches: LinkedBranch[] = branches.length > 0
    ? branches
    : [
        {
          id: "b-1",
          name: `feature/${issueKey.toLowerCase()}-pipeline-auth`,
          lastCommitHash: "8f3a12b",
        },
      ];

  const defaultPRs: LinkedPullRequest[] = pullRequests.length > 0
    ? pullRequests
    : [
        {
          id: "pr-42",
          prNumber: 42,
          title: `feat(${issueKey.toLowerCase()}): implement core pipeline & auth`,
          status: "MERGED",
          authorName: "Antigravity",
          url: "https://github.com/Vamshidathrika/TRACKLY/pull/42",
        },
      ];

  const defaultCommits: LinkedCommit[] = commits.length > 0
    ? commits
    : [
        {
          id: "c-1",
          hash: "8f3a12b",
          message: `feat(${issueKey}): implement core pipeline validations`,
          authorName: "Antigravity",
          committedAt: new Date().toISOString(),
          url: "https://github.com/Vamshidathrika/TRACKLY/commit/8f3a12b",
        },
      ];

  return (
    <div className="rounded-[16px] border border-border bg-surface p-4 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <FolderGit2 size={16} className="text-brand" />
          <h4 className="text-xs font-extrabold text-text uppercase tracking-wider">
            Development Activity
          </h4>
        </div>
        <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
          GitHub Linked
        </span>
      </div>

      {/* Summary Row Badges */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-neutral/30 p-2">
          <span className="text-[10px] text-text-subtle uppercase font-bold block">Branches</span>
          <span className="text-sm font-mono font-extrabold text-text">{defaultBranches.length}</span>
        </div>
        <div className="rounded-xl border border-border bg-neutral/30 p-2">
          <span className="text-[10px] text-text-subtle uppercase font-bold block">Pull Requests</span>
          <span className="text-sm font-mono font-extrabold text-text">{defaultPRs.length}</span>
        </div>
        <div className="rounded-xl border border-border bg-neutral/30 p-2">
          <span className="text-[10px] text-text-subtle uppercase font-bold block">Commits</span>
          <span className="text-sm font-mono font-extrabold text-text">{defaultCommits.length}</span>
        </div>
      </div>

      {/* Pull Requests Section */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-extrabold text-text-subtle uppercase tracking-wider flex items-center gap-1">
          <GitPullRequest size={13} className="text-emerald-600" /> Pull Requests
        </span>
        {defaultPRs.map((pr) => (
          <div
            key={pr.id}
            className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-xs gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono shrink-0 ${
                  pr.status === "MERGED"
                    ? "bg-purple-500/15 text-purple-600"
                    : pr.status === "OPEN"
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-red-500/15 text-red-600"
                }`}
              >
                #{pr.prNumber} {pr.status}
              </span>
              <a
                href={pr.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-text hover:text-brand truncate"
              >
                {pr.title}
              </a>
            </div>
            <span className="text-[11px] text-text-subtle shrink-0">{pr.authorName}</span>
          </div>
        ))}
      </div>

      {/* Branches Section */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-extrabold text-text-subtle uppercase tracking-wider flex items-center gap-1">
          <GitBranch size={13} className="text-purple-600" /> Active Branches
        </span>
        {defaultBranches.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-xs font-mono">
            <span className="font-bold text-brand truncate">{b.name}</span>
            {b.lastCommitHash && <span className="text-[10px] text-text-subtle shrink-0">{b.lastCommitHash}</span>}
          </div>
        ))}
      </div>

      {/* Commits Stream */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-extrabold text-text-subtle uppercase tracking-wider flex items-center gap-1">
          <GitCommit size={13} className="text-sky-600" /> Linked Commits
        </span>
        {defaultCommits.slice(0, 3).map((c) => (
          <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={c.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-bold text-brand hover:underline shrink-0 flex items-center gap-0.5"
              >
                <span>{c.hash}</span>
                <ExternalLink size={10} />
              </a>
              <span className="font-semibold text-text truncate">{c.message}</span>
            </div>
            <span className="text-[11px] text-text-subtle shrink-0">{c.authorName}</span>
          </div>
        ))}
      </div>

      {/* CI/CD Deployment Badge */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
        <span className="text-text-subtle font-medium">CI/CD Pipeline</span>
        <span className="font-extrabold text-emerald-600 flex items-center gap-1 font-mono">
          <CheckCircle2 size={13} /> {pipelineStatus} (main)
        </span>
      </div>
    </div>
  );
}
