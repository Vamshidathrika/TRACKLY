"use client";

import { useEffect, useState } from "react";
import {
  FolderGit2,
  GitBranch,
  GitPullRequest,
  GitCommit,
  CheckCircle2,
  ExternalLink,
  Zap,
  Copy,
  Check,
  Sparkles,
  Triangle,
  Video,
  LayoutGrid,
  Headphones,
  Flag,
  Activity,
  ShieldAlert,
  FileText,
  AlertCircle,
  Plus,
} from "lucide-react";
import { FigmaEmbedPanel } from "./FigmaEmbedPanel";
import { LoomEmbedder } from "./LoomEmbedder";
import { MiroEmbedPanel } from "./MiroEmbedPanel";
import { ZendeskTicketsWidget } from "./ZendeskTicketsWidget";
import { AutonomousAICodeFixer } from "./AutonomousAICodeFixer";
import { FeatureFlagToggleCard } from "./FeatureFlagToggleCard";
import { PostHogAnalyticsWidget } from "./PostHogAnalyticsWidget";
import { SnykSecurityCard } from "./SnykSecurityCard";
import { SpecDocEditor } from "./SpecDocEditor";
import { IncidentCommandCenter } from "./IncidentCommandCenter";
import { ConnectRepoModal } from "@/components/dev/ConnectRepoModal";
import { fetchDevDashboardDataAction } from "@/app/(app)/projects/[key]/dev/actions";

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

type DevTab = "GIT" | "AI" | "SPEC" | "INCIDENT" | "MEDIA" | "SUPPORT" | "FLAGS";

export function DevelopmentPanel({
  projectId,
  issueKey,
  branches = [],
  pullRequests = [],
  commits = [],
  pipelineStatus = "Passing",
}: {
  projectId?: string;
  issueKey: string;
  branches?: LinkedBranch[];
  pullRequests?: LinkedPullRequest[];
  commits?: LinkedCommit[];
  pipelineStatus?: string;
}) {
  const [activeTab, setActiveTab] = useState<DevTab>("GIT");
  const [copiedBranch, setCopiedBranch] = useState(false);
  const [copiedCommit, setCopiedCommit] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const [connectedRepo, setConnectedRepo] = useState<{ owner: string; repoName: string } | null>(null);
  const [liveCommits, setLiveCommits] = useState<LinkedCommit[]>(commits);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);

  const loadRepoData = async () => {
    if (!projectId) return;
    setIsLoadingRepo(true);
    const res = await fetchDevDashboardDataAction(projectId);
    setIsLoadingRepo(false);
    if (res?.hasConnectedRepo && res.repos && res.repos.length > 0) {
      setConnectedRepo(res.repos[0]);
      if (res.stats?.commits && res.stats.commits.length > 0) {
        setLiveCommits(
          res.stats.commits.map((c: any, idx: number) => ({
            id: `lc-${idx}`,
            hash: c.hash,
            message: c.message,
            authorName: c.author,
            committedAt: c.committedAt,
            url: c.url,
          }))
        );
      }
    } else {
      setConnectedRepo(null);
    }
  };

  useEffect(() => {
    loadRepoData();
  }, [projectId]);

  const handleCopyBranchCommand = () => {
    const cmd = `git checkout -b feature/${issueKey.toLowerCase()}-task-branch`;
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(cmd);
      setCopiedBranch(true);
      setTimeout(() => setCopiedBranch(false), 2500);
    }
  };

  const handleCopyCommitCommand = () => {
    const cmd = `git commit -m "fix(${issueKey}): resolve task changes"`;
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(cmd);
      setCopiedCommit(true);
      setTimeout(() => setCopiedCommit(false), 2500);
    }
  };

  const handleGenerateAiReleaseNote = () => {
    const commitsCount = (liveCommits.length > 0 ? liveCommits : defaultCommits).length;
    const note = `🚀 Release Note (${issueKey}): Delivered ${commitsCount} verified git commits including automated pipeline updates.`;
    setAiNote(note);
  };

  const defaultBranches: LinkedBranch[] = branches.length > 0
    ? branches
    : [
        {
          id: "b-1",
          name: `feature/${issueKey.toLowerCase()}-auth`,
          lastCommitHash: "8f3a12b",
        },
      ];

  const defaultPullRequests: LinkedPullRequest[] = pullRequests.length > 0
    ? pullRequests
    : [
        {
          id: "pr-1",
          prNumber: 42,
          title: `fix(${issueKey}): resolve production issue`,
          status: "MERGED",
          authorName: "Sarah C.",
          url: "https://github.com/Vamshidathrika/TRACKLY/pull/42",
        },
      ];

  const defaultCommits: LinkedCommit[] = liveCommits.length > 0
    ? liveCommits
    : commits.length > 0
    ? commits
    : [
        {
          id: "c-1",
          hash: "8f3a12b",
          message: `fix(${issueKey}): resolve production issue`,
          authorName: "Alex V.",
          committedAt: "2 hours ago",
          url: "https://github.com/Vamshidathrika/TRACKLY/commit/8f3a12b",
        },
      ];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-neutral/20 p-3 text-xs w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FolderGit2 size={16} className="text-brand shrink-0" />
          <span className="font-extrabold text-text text-xs truncate">Development Activity</span>
        </div>

        <div className="flex items-center gap-2">
          {connectedRepo ? (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 size={11} /> {connectedRepo.owner}/{connectedRepo.repoName}
            </span>
          ) : projectId ? (
            <ConnectRepoModal
              projectId={projectId}
              onSuccess={loadRepoData}
              trigger={
                <button type="button" className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand/10 text-brand hover:bg-brand/20 transition-all flex items-center gap-1">
                  <Plus size={10} /> Connect Repo
                </button>
              }
            />
          ) : (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand/10 text-brand shrink-0">
              {issueKey}
            </span>
          )}
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border text-[11px]">
        {[
          { id: "GIT", label: "Git & CI", icon: GitBranch },
          { id: "AI", label: "🤖 AI Fix", icon: Sparkles },
          { id: "SPEC", label: "📄 Spec & PRD", icon: FileText },
          { id: "INCIDENT", label: "🚨 Incident", icon: ShieldAlert },
          { id: "MEDIA", label: "🎨 Canvas", icon: LayoutGrid },
          { id: "SUPPORT", label: "🎧 Support", icon: Headphones },
          { id: "FLAGS", label: "🚩 Telemetry", icon: Flag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as DevTab)}
              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0 ${
                isActive
                  ? "bg-brand text-white shadow-2xs"
                  : "bg-surface text-text-subtle hover:text-text hover:bg-neutral border border-border"
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Git & CI/CD */}
      {activeTab === "GIT" && (
        <div className="flex flex-col gap-3 pt-1">
          {/* Pull Requests */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-text-subtle uppercase tracking-wider flex items-center gap-1">
              <GitPullRequest size={12} className="text-purple-600" /> Pull Requests
            </span>
            {defaultPullRequests.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-xs gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono shrink-0 ${
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
                    className="font-bold text-text hover:text-brand truncate text-[11px]"
                  >
                    {pr.title}
                  </a>
                </div>
                <span className="text-[10px] text-text-subtle shrink-0">{pr.authorName}</span>
              </div>
            ))}
          </div>

          {/* Active Branches */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-text-subtle uppercase tracking-wider flex items-center gap-1">
                <GitBranch size={12} className="text-purple-600" /> Branches
              </span>
              <button
                type="button"
                onClick={handleCopyBranchCommand}
                className="text-[10px] font-bold text-brand hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                {copiedBranch ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                <span>{copiedBranch ? "Copied!" : "Copy Branch Cmd"}</span>
              </button>
            </div>
            {defaultBranches.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-[11px] font-mono min-w-0">
                <span className="font-bold text-brand truncate">{b.name}</span>
                {b.lastCommitHash && <span className="text-[10px] text-text-subtle shrink-0">{b.lastCommitHash}</span>}
              </div>
            ))}
          </div>

          {/* Commits Stream */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-text-subtle uppercase tracking-wider flex items-center gap-1">
                <GitCommit size={12} className="text-sky-600" /> Commits
              </span>
              <button
                type="button"
                onClick={handleGenerateAiReleaseNote}
                className="text-[10px] font-bold text-purple-600 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Sparkles size={10} className="text-amber-500" />
                <span>AI Note</span>
              </button>
            </div>

            {aiNote && (
              <div className="p-2 rounded-lg border border-purple-500/30 bg-purple-500/10 text-[11px] text-text flex flex-col gap-1">
                <span className="font-bold text-purple-600 text-[9px] uppercase tracking-wider">
                  AI Release Note
                </span>
                <p className="text-[11px] text-text leading-tight">{aiNote}</p>
              </div>
            )}

            {defaultCommits.slice(0, 2).map((c) => (
              <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface text-[11px] gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <a
                    href={c.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono font-bold text-brand hover:underline shrink-0 text-[10px]"
                  >
                    {c.hash}
                  </a>
                  <span className="font-semibold text-text truncate">{c.message}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Deployment Badge */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px]">
            <span className="text-text-subtle font-medium">Deployments</span>
            <span className="font-extrabold text-sky-600 flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
              <Triangle size={10} /> Vercel: Ready
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Autonomous AI Code Fixer */}
      {activeTab === "AI" && (
        <div className="pt-1">
          <AutonomousAICodeFixer issueKey={issueKey} />
        </div>
      )}

      {/* Tab 3: Confluence Spec Docs & PRD Canvas */}
      {activeTab === "SPEC" && (
        <div className="pt-1">
          <SpecDocEditor issueKey={issueKey} />
        </div>
      )}

      {/* Tab 4: Opsgenie Incident Command Center */}
      {activeTab === "INCIDENT" && (
        <div className="pt-1">
          <IncidentCommandCenter issueKey={issueKey} />
        </div>
      )}

      {/* Tab 5: Designs & Media Embeds */}
      {activeTab === "MEDIA" && (
        <div className="flex flex-col gap-3 pt-1">
          <FigmaEmbedPanel initialUrls={[]} />
          <LoomEmbedder initialUrls={[]} />
          <MiroEmbedPanel initialUrls={[]} />
        </div>
      )}

      {/* Tab 6: Customer Support & Incident Tickets */}
      {activeTab === "SUPPORT" && (
        <div className="flex flex-col gap-3 pt-1">
          <ZendeskTicketsWidget />
          <SnykSecurityCard />
        </div>
      )}

      {/* Tab 7: Feature Flags & Telemetry */}
      {activeTab === "FLAGS" && (
        <div className="flex flex-col gap-3 pt-1">
          <FeatureFlagToggleCard />
          <PostHogAnalyticsWidget />
        </div>
      )}
    </div>
  );
}
