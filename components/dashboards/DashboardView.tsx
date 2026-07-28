"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Activity,
  ArrowRight,
  TrendingUp,
  CheckSquare,
  Plus,
  LayoutGrid,
  RefreshCw,
  Share2,
  X,
  PieChart,
  Sparkles,
  ShieldAlert,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DashboardCard } from "./DashboardCard";
import { PieChartGadget, type DistributionSlice } from "./PieChartGadget";
import { CreatedVsResolvedGadget, type CreatedVsResolvedPoint } from "./CreatedVsResolvedGadget";
import { SprintHealthGadget, type SprintHealthData } from "./SprintHealthGadget";
import { AIRiskDetectorGadget, type RiskItem } from "./AIRiskDetectorGadget";
import { JQLFilterResultsGadget } from "./JQLFilterResultsGadget";

import {
  MetricsRow,
  StatusDonutWidget,
  PriorityBarWidget,
  TypeDistributionWidget,
  TeamWorkloadWidget,
  EpicProgressWidget,
  PageFeedbackFooter,
  AuditTelemetryFeedWidget,
} from "./SummaryWidgets";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type AssignedIssue = {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  project: { key: string };
};

export type ActivityItem = {
  id: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: Date;
  author: { name: string };
  issue: { key: string; project: { key: string } };
};

export type MemberWorkload = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  count: number;
  points?: number;
};

export type ProjectHealth = {
  id: string;
  name: string;
  key: string;
  totalIssues: number;
  doneIssues: number;
  activeSprint: string;
};

export type EpicProgressItem = {
  id: string;
  key: string;
  summary: string;
  totalChildIssues: number;
  doneChildIssues: number;
};

type LayoutFormat = "FULL" | "HALF" | "SPLIT" | "TRIPLE";

function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DONE: "text-success bg-success/10 border-success/20",
    IN_PROGRESS: "text-brand bg-brand/10 border-brand/20 font-semibold",
    IN_REVIEW: "text-purple bg-purple/10 border-purple/20 font-semibold",
    TO_DO: "text-subtle bg-neutral border-border-default",
  };
  return map[status] ?? "text-subtle bg-neutral border-border-default";
}

export function DashboardView({
  statusCounts,
  priorityCounts,
  typeCounts,
  assignedIssues = [],
  recentActivity = [],
  memberWorkloads = [],
  projects = [],
  epics = [],
  unassignedCount = 0,
  projectKey,
  sprintHealth,
  createdVsResolved,
  risks,
}: {
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  assignedIssues?: AssignedIssue[];
  recentActivity?: ActivityItem[];
  memberWorkloads?: MemberWorkload[];
  projects?: ProjectHealth[];
  epics?: EpicProgressItem[];
  unassignedCount?: number;
  projectKey?: string;
  sprintHealth: SprintHealthData;
  createdVsResolved: CreatedVsResolvedPoint[];
  risks: RiskItem[];
}) {
  const [layout, setLayout] = useState<LayoutFormat>("HALF");
  const [autoRefresh, setAutoRefresh] = useState<number>(0);
  const [showGadgetDrawer, setShowGadgetDrawer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Active Enabled Gadgets
  const [enabledGadgets, setEnabledGadgets] = useState<Record<string, boolean>>({
    pie_chart: true,
    created_vs_resolved: true,
    sprint_health: true,
    ai_risks: true,
    jql_filter: true,
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const priorityColors: Record<string, string> = {
    HIGHEST: "bg-rose-500",
    HIGH: "bg-amber-500",
    MEDIUM: "bg-blue-500",
    LOW: "bg-emerald-500",
    LOWEST: "bg-neutral-500",
  };
  const statusColors: Record<string, string> = {
    TO_DO: "bg-neutral-500",
    IN_PROGRESS: "bg-blue-500",
    IN_REVIEW: "bg-purple-500",
    DONE: "bg-emerald-500",
  };
  const assigneeColors = ["bg-brand", "bg-purple-500", "bg-sky-500", "bg-amber-500", "bg-rose-500", "bg-emerald-500"];

  const distributionData: Record<"PRIORITY" | "STATUS" | "ASSIGNEE", DistributionSlice[]> = {
    PRIORITY: Object.entries(priorityCounts).map(([label, count]) => ({
      label,
      count,
      color: priorityColors[label] ?? "bg-neutral-500",
    })),
    STATUS: Object.entries(statusCounts).map(([label, count]) => ({
      label,
      count,
      color: statusColors[label] ?? "bg-neutral-500",
    })),
    ASSIGNEE: [
      ...memberWorkloads.map((m, idx) => ({
        label: m.name,
        count: m.count,
        color: assigneeColors[idx % assigneeColors.length],
      })),
      ...(unassignedCount > 0 ? [{ label: "Unassigned", count: unassignedCount, color: "bg-neutral-400" }] : []),
    ],
  };

  // Auto-refresh timer simulation
  useEffect(() => {
    if (autoRefresh === 0) return;
    const interval = setInterval(() => {
      showToast("Dashboard data auto-refreshed!");
    }, autoRefresh * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const totalIssues = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const doneCount = statusCounts["DONE"] ?? 0;

  const metrics = {
    completed7d: doneCount,
    updated7d: recentActivity.length,
    created7d: totalIssues,
    dueSoon7d: priorityCounts["HIGHEST"] || 0,
  };

  const getGridClass = () => {
    if (layout === "FULL") return "grid grid-cols-1 gap-6";
    if (layout === "SPLIT") return "grid grid-cols-1 lg:grid-cols-3 gap-6"; // 1st col span-2
    if (layout === "TRIPLE") return "grid grid-cols-1 md:grid-cols-3 gap-6";
    return "grid grid-cols-1 lg:grid-cols-2 gap-6"; // HALF (50/50)
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-lg animate-fade-in-up flex items-center gap-2">
          <RefreshCw size={14} className="animate-spin" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Workspace Dashboard Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border-default bg-surface shadow-2xs">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-default">Main Engineering Dashboard</h2>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
            Default View
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {/* Add Gadget Button */}
          <Button
            appearance="primary"
            onClick={() => setShowGadgetDrawer(true)}
            className="flex items-center gap-1.5 text-xs h-8"
          >
            <Plus size={14} />
            Add Gadget
          </Button>

          {/* Layout Selector */}
          <div className="flex items-center gap-1 bg-neutral p-1 rounded-lg border border-border-default">
            {[
              { id: "FULL", label: "1 Col" },
              { id: "HALF", label: "2 Col 50/50" },
              { id: "SPLIT", label: "2 Col 70/30" },
              { id: "TRIPLE", label: "3 Col 33/33/33" },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => setLayout(l.id as LayoutFormat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  layout === l.id ? "bg-surface text-brand shadow-2xs" : "text-subtle hover:text-default"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Auto Refresh Interval */}
          <select
            value={autoRefresh}
            onChange={(e) => setAutoRefresh(Number(e.target.value))}
            className="h-8 rounded-lg border border-border-default bg-surface px-2.5 text-xs font-bold text-default outline-none focus:border-brand cursor-pointer"
          >
            <option value={0}>Auto Refresh: Off</option>
            <option value={60}>Refresh Every 1 Min</option>
            <option value={300}>Refresh Every 5 Mins</option>
            <option value={900}>Refresh Every 15 Mins</option>
          </select>

          {/* Share Button */}
          <Button
            appearance="subtle"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 text-xs h-8 hover:bg-neutral"
          >
            <Share2 size={14} className="text-subtle" />
            Share
          </Button>
        </div>
      </div>

      {/* 1. Metric Header Cards */}
      <MetricsRow metrics={metrics} />

      {/* 2. Superpowers Jira Gadgets Row */}
      <div className={getGridClass()}>
        {enabledGadgets.pie_chart && <PieChartGadget data={distributionData} />}
        {enabledGadgets.created_vs_resolved && <CreatedVsResolvedGadget points={createdVsResolved} />}
        {enabledGadgets.sprint_health && <SprintHealthGadget data={sprintHealth} />}
        {enabledGadgets.ai_risks && <AIRiskDetectorGadget risks={risks} />}
        {enabledGadgets.jql_filter && <JQLFilterResultsGadget />}
      </div>

      {/* 3. Primary 2x2 Analytics Grid */}
      <div className={getGridClass()}>
        <StatusDonutWidget statusCounts={statusCounts} />
        <PriorityBarWidget priorityCounts={priorityCounts} />
        <TypeDistributionWidget typeCounts={typeCounts} />
        <TeamWorkloadWidget
          members={memberWorkloads}
          unassignedCount={unassignedCount}
          projectKey={projectKey}
        />
      </div>

      {/* 4. Epic Progress & Project Health Section */}
      <div className={getGridClass()}>
        <EpicProgressWidget epics={epics} />

        <DashboardCard
          title="Project Health Radar"
          icon={FolderKanban}
          badge={<span className="text-[11px] font-mono text-brand font-bold">{projects.length} Projects</span>}
        >
          {projects.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-subtlest italic">
              No projects found.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border-default">
              {projects.map((p) => {
                const pct = p.totalIssues > 0 ? Math.round((p.doneIssues / p.totalIssues) * 100) : 0;
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-brand/10 text-brand font-bold text-[12px]">
                        {p.key.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/projects/${p.key}/summary`}
                          className="font-bold text-[13px] text-default hover:text-brand transition-colors truncate block"
                        >
                          {p.name}
                        </Link>
                        <span className="text-[11px] text-subtle">{p.activeSprint}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono text-[12px]">
                      <span className="text-subtle">{p.doneIssues}/{p.totalIssues} done</span>
                      <span className="font-bold text-success w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* 5. Assigned Tasks & Activity Stream */}
      <div className={getGridClass()}>
        <DashboardCard
          title={`Assigned Tasks (${assignedIssues.length})`}
          icon={CheckSquare}
          badge={
            <Link href="/your-work" className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          }
        >
          {assignedIssues.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-subtlest italic">No tasks assigned to you.</div>
          ) : (
            <div className="flex flex-col divide-y divide-border-default">
              {assignedIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <TypeIcon type={issue.type} size={14} />
                    <Link
                      href={`/projects/${issue.project.key}/issues/${issue.key}`}
                      className="font-mono text-[11px] font-bold text-subtlest hover:text-brand shrink-0"
                    >
                      {issue.key}
                    </Link>
                    <Link
                      href={`/projects/${issue.project.key}/issues/${issue.key}`}
                      className="text-[13px] font-medium text-default hover:text-brand truncate"
                    >
                      {issue.summary}
                    </Link>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(issue.status)}`}>
                    {issue.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>

        <AuditTelemetryFeedWidget
          items={recentActivity.map((act) => {
            let type: "CREATED" | "UPDATED" | "DELETED" = "UPDATED";
            if (act.field === "created") type = "CREATED";
            if (act.field === "deleted") type = "DELETED";
            return {
              id: act.id,
              authorName: act.author?.name || "User",
              type,
              ticketKey: act.issue?.key,
              summary: type === "CREATED" ? act.newValue || "" : type === "DELETED" ? act.oldValue || "" : undefined,
              field: type === "UPDATED" ? act.field : undefined,
              oldValue: act.oldValue || undefined,
              newValue: act.newValue || undefined,
              timestamp: act.createdAt,
            };
          })}
        />
      </div>

      {/* Gadget Library Drawer Modal */}
      {showGadgetDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border-default bg-surface p-6 shadow-xl flex flex-col gap-4 animate-fade-in-down">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-base font-bold text-default flex items-center gap-2">
                <LayoutGrid className="text-brand" size={18} />
                Add Gadgets to Dashboard
              </h3>
              <button
                onClick={() => setShowGadgetDrawer(false)}
                className="p-1 rounded-lg text-subtlest hover:bg-neutral"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { id: "pie_chart", title: "Pie Chart Distribution", desc: "Breakdown of tasks by priority, status, or assignee", icon: PieChart },
                { id: "created_vs_resolved", title: "Created vs Resolved Velocity", desc: "Dual bar comparison graph over 7d, 30d, 90d", icon: TrendingUp },
                { id: "sprint_health", title: "Active Sprint Health & Velocity", desc: "Real-time scope progress bar and story point tally", icon: Sparkles },
                { id: "ai_risks", title: "AI Risk & SLA Bottleneck Detector", desc: "AI audit flagging blocked tickets and SLA breaches", icon: ShieldAlert },
                { id: "jql_filter", title: "Saved JQL Filter Query Results", desc: "Embedded live table of custom JQL searches", icon: Filter },
              ].map((g) => {
                const isEnabled = enabledGadgets[g.id];
                const Icon = g.icon;

                return (
                  <div
                    key={g.id}
                    className="p-3.5 rounded-xl border border-border-default bg-neutral/30 flex items-center justify-between gap-3 hover:bg-neutral/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-bold">
                        <Icon size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-default">{g.title}</h4>
                        <p className="text-[11px] text-subtle">{g.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEnabledGadgets((prev) => ({ ...prev, [g.id]: !prev[g.id] }));
                        showToast(`Gadget "${g.title}" ${isEnabled ? "removed" : "added"}!`);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isEnabled
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20"
                          : "bg-brand text-white shadow-2xs hover:bg-brand-hovered"
                      }`}
                    >
                      {isEnabled ? "Remove" : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Share Dashboard Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="text-sm font-bold text-default">Share Engineering Dashboard</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 text-subtlest hover:bg-neutral">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <p className="text-subtle">Choose dashboard access permissions across your team or generate a public link.</p>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border-default bg-neutral/30 cursor-pointer font-bold">
                  <input type="radio" name="perm" defaultChecked className="accent-brand" />
                  Shared with Workspace Team Members
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border-default bg-neutral/30 cursor-pointer font-bold">
                  <input type="radio" name="perm" className="accent-brand" />
                  Private (Only Me)
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <Button appearance="primary" onClick={() => { setShowShareModal(false); showToast("Dashboard permissions updated!"); }}>
                  Save Share Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Page Feedback Footer Widget */}
      <PageFeedbackFooter />
    </div>
  );
}
