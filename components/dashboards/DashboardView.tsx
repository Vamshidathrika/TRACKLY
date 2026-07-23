"use client";

import Link from "next/link";
import {
  FolderKanban,
  Activity,
  ArrowRight,
  TrendingUp,
  CheckSquare,
} from "lucide-react";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { Avatar } from "@/components/ui/Avatar";
import { DashboardCard } from "./DashboardCard";
import {
  MetricsRow,
  StatusDonutWidget,
  PriorityBarWidget,
  TypeDistributionWidget,
  TeamWorkloadWidget,
  EpicProgressWidget,
  PageFeedbackFooter,
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

function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    DONE: "text-success bg-success/10 border-success/20",
    IN_PROGRESS: "text-brand bg-brand/10 border-brand/20 font-semibold",
    IN_REVIEW: "text-purple bg-purple/10 border-purple/20 font-semibold",
    TO_DO: "text-subtle bg-neutral border-border-default",
  };
  return map[status] ?? "text-subtle bg-neutral border-border-default";
}

function formatTime(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
}) {
  const totalIssues = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const doneCount = statusCounts["DONE"] ?? 0;
  const inProgressCount = statusCounts["IN_PROGRESS"] ?? 0;
  const inReviewCount = statusCounts["IN_REVIEW"] ?? 0;
  const todoCount = statusCounts["TO_DO"] ?? 0;

  // Compute 7-day metric indicators
  const metrics = {
    completed7d: doneCount,
    updated7d: recentActivity.length,
    created7d: totalIssues,
    dueSoon7d: priorityCounts["HIGHEST"] || 0,
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* 1. Metric Header Cards (Completed, Updated, Created, Due soon) */}
      <MetricsRow metrics={metrics} />

      {/* 2. Primary 2x2 Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Overview Donut Widget */}
        <StatusDonutWidget statusCounts={statusCounts} />

        {/* Priority Breakdown Bar Widget */}
        <PriorityBarWidget priorityCounts={priorityCounts} />

        {/* Type Distribution Widget (showing 0% types) */}
        <TypeDistributionWidget typeCounts={typeCounts} />

        {/* Team Workload Widget (with Unassigned bucket & Reassign trigger) */}
        <TeamWorkloadWidget
          members={memberWorkloads}
          unassignedCount={unassignedCount}
          projectKey={projectKey}
        />
      </div>

      {/* 3. Epic Progress & Project Health Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Epic Progress Widget (with educational empty state) */}
        <EpicProgressWidget epics={epics} />

        {/* Project Health Radar */}
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

      {/* 4. Assigned Tasks & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Tasks Card */}
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
            <div className="py-6 text-center text-[12px] text-subtlest italic">No issues assigned to you.</div>
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

        {/* Live Activity Telemetry Feed */}
        <DashboardCard
          title="Live Activity Telemetry Stream"
          icon={Activity}
          badge={<span className="text-[11px] font-mono text-success font-bold">LIVE AUDIT</span>}
        >
          {recentActivity.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-subtlest italic">No recent activity detected.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-start justify-between py-2 border-b border-border-default/50 last:border-0 gap-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[12px] font-medium text-default truncate">
                      <strong className="text-brand">{act.author.name}</strong> updated{" "}
                      <Link
                        href={`/projects/${act.issue.project.key}/issues/${act.issue.key}`}
                        className="font-mono text-[11px] font-bold text-subtle hover:underline"
                      >
                        {act.issue.key}
                      </Link>
                    </span>
                    <span className="text-[11px] text-subtlest">
                      <span className="font-semibold text-subtle">{act.field}</span>:{" "}
                      <span className="line-through opacity-60">{act.oldValue || "—"}</span>
                      {" → "}
                      <span className="font-semibold">{act.newValue}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-subtlest shrink-0 font-mono">
                    {formatTime(act.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* 5. Page Feedback Footer Widget */}
      <PageFeedbackFooter />
    </div>
  );
}
