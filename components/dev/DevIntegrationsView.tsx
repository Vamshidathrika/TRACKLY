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
  Activity,
  Triangle,
  AlertOctagon,
  Clock,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectRepoModal } from "./ConnectRepoModal";
import { fetchDevDashboardDataAction, syncGithubRepoAction, disconnectGithubRepoAction } from "@/app/(app)/projects/[key]/dev/actions";
import type { WebhookLogEntry, IntegrationProvider } from "@/lib/integrations/types";

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
  initialTab = "ALL",
}: {
  projectId: string;
  projectKey?: string;
  initialTab?: "ALL" | IntegrationProvider;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasConnectedRepo, setHasConnectedRepo] = useState(false);
  const [reposList, setReposList] = useState<{ id: string; owner: string; repoName: string; createdAt: Date }[]>([]);
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | IntegrationProvider>(initialTab);
  const [stats, setStats] = useState<{
    activeBranches: number;
    openPRs: number;
    mergedPRs: number;
    pipelineStatus: "Passing" | "Failing" | "In Progress" | "Idle";
    commits: DevCommitItem[];
  }>({
    activeBranches: 0,
    openPRs: 0,
    mergedPRs: 0,
    pipelineStatus: "Idle",
    commits: [],
  });
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);

  const loadData = async () => {
    setIsRefreshing(true);
    const res = await fetchDevDashboardDataAction(projectId);
    setIsRefreshing(false);
    if (res) {
      setHasConnectedRepo(res.hasConnectedRepo);
      setReposList(res.repos || []);
      if ((res as any).webhookLogs) {
        setWebhookLogs((res as any).webhookLogs);
      }
      if (res.stats) {
        setStats({
          activeBranches: res.stats.activeBranches,
          openPRs: res.stats.openPRs,
          mergedPRs: res.stats.mergedPRs,
          pipelineStatus: res.stats.pipelineStatus as any,
          commits: res.stats.commits,
        });
      }
    }
  };

  const handleSyncRepo = async (repoId: string) => {
    setSyncingRepoId(repoId);
    await syncGithubRepoAction(repoId);
    setSyncingRepoId(null);
    await loadData();
  };

  const handleDisconnectRepo = async (repoId: string) => {
    if (!confirm("Are you sure you want to disconnect this repository?")) return;
    await disconnectGithubRepoAction(repoId);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const filteredLogs = activeTab === "ALL"
    ? webhookLogs
    : webhookLogs.filter((l) => l.provider === activeTab);

  return (
    <div className="flex flex-1 flex-col p-6 pb-24 max-w-6xl mx-auto w-full gap-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-text flex items-center gap-2">
              <FolderGit2 className="h-6 w-6 text-brand" />
              <span>DevOps & Code Integrations Hub</span>
            </h1>
            {hasConnectedRepo ? (
              <span className="text-[11px] font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> ● Multi-Provider Active
              </span>
            ) : (
              <span className="text-[11px] font-extrabold font-mono px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1.5">
                <AlertCircle size={13} /> No Repository Connected
              </span>
            )}
          </div>
          <p className="text-xs text-text-subtle mt-0.5">
            Monitor real-time Git activity, CI/CD pipelines, Sentry crash logs, and Vercel preview builds for {projectKey}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            appearance="subtle"
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>

          <ConnectRepoModal
            projectId={projectId}
            onSuccess={loadData}
            trigger={
              <Button appearance="primary" className="bg-brand text-white text-xs font-bold flex items-center gap-1.5">
                <Plus size={14} />
                <span>Connect Repository</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* Provider Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs">
        {(["ALL", "GITHUB", "GITLAB", "BITBUCKET", "SENTRY", "VERCEL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-brand text-white shadow-xs"
                : "bg-surface text-text-subtle hover:text-text hover:bg-neutral"
            }`}
          >
            {tab === "ALL" ? "All Activity" : tab}
          </button>
        ))}
      </div>

      {/* Connected Repositories Section */}
      {reposList.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold text-text flex items-center gap-2">
              <FolderGit2 size={15} className="text-brand" /> Connected Repositories ({reposList.length})
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {reposList.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-neutral/30 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold">
                    <FolderGit2 size={16} />
                  </div>
                  <div>
                    <span className="font-bold text-text font-mono text-xs">
                      {repo.owner} / {repo.repoName}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-text-subtle mt-0.5">
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={11} /> Connected & Synced
                      </span>
                      <span>•</span>
                      <a
                        href={`https://github.com/${repo.owner}/${repo.repoName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-brand flex items-center gap-0.5"
                      >
                        github.com <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    appearance="subtle"
                    onClick={() => handleSyncRepo(repo.id)}
                    disabled={syncingRepoId === repo.id}
                    className="h-8 text-xs flex items-center gap-1.5"
                  >
                    <RefreshCw size={12} className={syncingRepoId === repo.id ? "animate-spin" : ""} />
                    <span>{syncingRepoId === repo.id ? "Syncing..." : "Sync Now"}</span>
                  </Button>

                  <Button
                    appearance="subtle"
                    onClick={() => handleDisconnectRepo(repo.id)}
                    className="h-8 text-xs text-red-600 hover:bg-red-500/10"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Banner Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Branches</span>
            <GitBranch size={16} className="text-brand" />
          </div>
          <p className="text-2xl font-extrabold text-text">{stats.activeBranches}</p>
          <span className="text-[11px] text-text-subtle font-mono">Linked to {projectKey} tasks</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Open PRs & MRs</span>
            <GitPullRequest size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600">{stats.openPRs}</p>
          <span className="text-[11px] text-amber-600 font-medium">In Review status</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Merged PRs</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">{stats.mergedPRs}</p>
          <span className="text-[11px] text-emerald-600 font-medium">Transitioned to DONE</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-text-subtle mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">CI/CD Pipeline</span>
            <Zap size={16} className="text-sky-500" />
          </div>
          <p className="text-2xl font-extrabold text-sky-600">{stats.pipelineStatus}</p>
          <span className="text-[11px] text-sky-600 font-medium">Automated build checks</span>
        </div>
      </div>

      {/* Real-time Inbound Webhook Activity Log Table */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-text flex items-center gap-2">
            <Activity className="text-brand" size={16} />
            <span>Live Webhook Event Activity & Payload Auditor</span>
          </h3>
          <span className="text-[11px] font-mono text-text-subtle">{filteredLogs.length} events logged</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-subtle border border-dashed border-border rounded-lg bg-neutral/20 flex flex-col items-center gap-2">
            <Activity size={24} className="text-text-subtle opacity-50" />
            <p className="font-semibold text-text">No live webhook events logged for {projectKey} yet</p>
            <p className="text-[11px] max-w-sm">Connect a Git repository or trigger webhooks to view real-time payload audits here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-border text-text-subtle font-bold text-[11px]">
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3">PROVIDER & EVENT</th>
                  <th className="py-2.5 px-3">TARGET ISSUE</th>
                  <th className="py-2.5 px-3">SUMMARY</th>
                  <th className="py-2.5 px-3">LATENCY</th>
                  <th className="py-2.5 px-3 min-w-[110px]">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {log.statusCode} OK
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-text">
                      <span className="px-2 py-0.5 rounded bg-neutral text-text-subtle border border-border mr-1 text-[10px]">
                        {log.provider}
                      </span>
                      {log.eventType}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-brand">
                      {log.issueKey || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-text-subtle truncate max-w-xs" title={log.summary}>
                      {log.summary}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-text-subtle">{log.latencyMs}ms</td>
                    <td className="py-2.5 px-3 text-text-subtle font-mono text-[11px] whitespace-nowrap">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
