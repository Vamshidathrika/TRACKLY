"use client";

import Link from "next/link";
import {
  FolderKanban,
  CheckCircle2,
  User,
  Activity,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Flame,
  Zap,
  Layers,
  Users,
  Target,
  BarChart3,
  Cpu,
  Clock,
  CheckSquare,
} from "lucide-react";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
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
  points: number;
};

export type ProjectHealth = {
  id: string;
  name: string;
  key: string;
  totalIssues: number;
  doneIssues: number;
  activeSprint: string;
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

function CommandModule({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-border-default bg-surface shadow-xs flex flex-col overflow-hidden transition-all hover:border-border-strong">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default bg-surface-sunken/40">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-brand" />
          <h3 className="text-[13px] font-bold text-default tracking-tight uppercase font-mono">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="p-5 flex-1">{children}</div>
    </div>
  );
}

export function DashboardView({
  statusCounts,
  priorityCounts,
  typeCounts,
  assignedIssues,
  recentActivity,
  memberWorkloads,
  projects,
}: {
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  assignedIssues: AssignedIssue[];
  recentActivity: ActivityItem[];
  memberWorkloads: MemberWorkload[];
  projects: ProjectHealth[];
}) {
  const totalIssues = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const doneCount = statusCounts["DONE"] ?? 0;
  const inProgressCount = statusCounts["IN_PROGRESS"] ?? 0;
  const inReviewCount = statusCounts["IN_REVIEW"] ?? 0;
  const todoCount = statusCounts["TO_DO"] ?? 0;

  const completionPct = totalIssues > 0 ? Math.round((doneCount / totalIssues) * 100) : 0;
  const inProgressPct = totalIssues > 0 ? Math.round((inProgressCount / totalIssues) * 100) : 0;

  // Critical threat count
  const criticalThreatCount = (priorityCounts["HIGHEST"] ?? 0) + (priorityCounts["HIGH"] ?? 0);
  const bugCount = typeCounts["BUG"] ?? 0;
  const bugRatioPct = totalIssues > 0 ? Math.round((bugCount / totalIssues) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* 1. Tactical HUD Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-[12px] border border-border-default bg-surface p-3.5 flex flex-col gap-1 shadow-xs">
          <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest font-mono">Total Issues</span>
          <span className="text-2xl font-bold text-default font-mono tracking-tight">{totalIssues}</span>
          <span className="text-[11px] text-subtle font-medium">{doneCount} Completed</span>
        </div>

        <div className="rounded-[12px] border border-border-default bg-surface p-3.5 flex flex-col gap-1 shadow-xs">
          <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest font-mono">Completion Rate</span>
          <span className="text-2xl font-bold text-success font-mono tracking-tight">{completionPct}%</span>
          <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden mt-1">
            <div style={{ width: `${completionPct}%` }} className="h-full bg-success" />
          </div>
        </div>

        <div className="rounded-[12px] border border-border-default bg-surface p-3.5 flex flex-col gap-1 shadow-xs">
          <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest font-mono">In-Flight Work</span>
          <span className="text-2xl font-bold text-brand font-mono tracking-tight">{inProgressCount + inReviewCount}</span>
          <span className="text-[11px] text-brand font-semibold">{inProgressPct}% of capacity</span>
        </div>

        <div className="rounded-[12px] border border-border-default bg-surface p-3.5 flex flex-col gap-1 shadow-xs">
          <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest font-mono">Threat Index</span>
          <span className="text-2xl font-bold text-danger font-mono tracking-tight">{criticalThreatCount}</span>
          <span className="text-[11px] text-danger font-semibold">High / Highest priority</span>
        </div>

        <div className="rounded-[12px] border border-border-default bg-surface p-3.5 flex flex-col gap-1 shadow-xs">
          <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest font-mono">Defect Density</span>
          <span className="text-2xl font-bold text-purple font-mono tracking-tight">{bugCount}</span>
          <span className="text-[11px] text-purple font-semibold">{bugRatioPct}% bug ratio</span>
        </div>

        <div className="rounded-[12px] border border-border-default bg-surface p-3.5 flex flex-col gap-1 shadow-xs">
          <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest font-mono">Active Forces</span>
          <span className="text-2xl font-bold text-default font-mono tracking-tight">{memberWorkloads.length}</span>
          <span className="text-[11px] text-subtle font-medium">Assigned operatives</span>
        </div>
      </div>

      {/* 2. Main Analytics Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Status & Workload Spectrum */}
        <CommandModule
          title="Sprint Velocity & Workload Distribution"
          icon={TrendingUp}
          badge={<span className="text-[11px] font-mono font-bold text-brand">{doneCount}/{totalIssues} DONE</span>}
        >
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between text-[12px] mb-1.5 font-semibold">
                <span className="text-subtle">Overall Completion</span>
                <span className="text-default font-bold">{completionPct}%</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-neutral overflow-hidden flex">
                <div style={{ width: `${completionPct}%` }} className="bg-success transition-all" title="Done" />
                <div style={{ width: `${inProgressPct}%` }} className="bg-brand transition-all" title="In Progress" />
                <div style={{ width: `${Math.round(((todoCount) / (totalIssues || 1)) * 100)}%` }} className="bg-neutral-hovered transition-all" title="To Do" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-[10px] bg-neutral/60 p-3 border border-border-default">
                <span className="text-[10px] font-bold uppercase tracking-wider text-subtlest block mb-1">To Do</span>
                <span className="text-xl font-bold text-default font-mono">{todoCount}</span>
              </div>

              <div className="rounded-[10px] bg-brand/10 p-3 border border-brand/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand block mb-1">In Progress</span>
                <span className="text-xl font-bold text-brand font-mono">{inProgressCount}</span>
              </div>

              <div className="rounded-[10px] bg-purple/10 p-3 border border-purple/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple block mb-1">In Review</span>
                <span className="text-xl font-bold text-purple font-mono">{inReviewCount}</span>
              </div>

              <div className="rounded-[10px] bg-success/10 p-3 border border-success/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-success block mb-1">Done</span>
                <span className="text-xl font-bold text-success font-mono">{doneCount}</span>
              </div>
            </div>
          </div>
        </CommandModule>

        {/* Module 2: Operative Capacity & Teammate Workload */}
        <CommandModule
          title="Operative Workload & Capacity Load"
          icon={Users}
          badge={<span className="text-[11px] font-mono text-subtle">{memberWorkloads.length} Members</span>}
        >
          {memberWorkloads.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-subtlest italic">No operatives currently assigned.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {memberWorkloads.map((mw) => {
                const maxCap = 15;
                const capPct = Math.min(100, Math.round((mw.points / maxCap) * 100));
                const isOverloaded = mw.points > 12;

                return (
                  <div key={mw.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <Avatar name={mw.name} src={mw.avatarUrl} size={22} />
                        <span className="font-semibold text-default">{mw.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-subtle">{mw.count} tickets</span>
                        <span className={`font-bold ${isOverloaded ? "text-danger" : "text-brand"}`}>
                          {mw.points} pts
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden">
                      <div
                        style={{ width: `${capPct}%` }}
                        className={`h-full rounded-full transition-all ${
                          isOverloaded ? "bg-danger" : "bg-brand"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CommandModule>

        {/* Module 3: Priority Threat Spectrum */}
        <CommandModule
          title="Threat Level & Priority Spectrum"
          icon={ShieldAlert}
          badge={<span className="text-[11px] font-mono text-danger font-bold">{criticalThreatCount} Critical</span>}
        >
          <div className="flex flex-col gap-3">
            {Object.entries(priorityCounts).map(([prio, count]) => {
              const pct = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0;
              const isHighPrio = prio === "HIGHEST" || prio === "HIGH";

              return (
                <div key={prio} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 font-semibold text-default">
                      <PriorityIcon priority={prio as IssuePriority} size={13} />
                      {prio.charAt(0) + prio.slice(1).toLowerCase()} Priority
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className={`font-bold ${isHighPrio ? "text-danger" : "text-subtle"}`}>{count}</span>
                      <span className="text-[11px] text-subtlest w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className={`h-full rounded-full transition-all ${
                        isHighPrio ? "bg-danger" : "bg-brand/70"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CommandModule>

        {/* Module 4: Issue Type Spectrum */}
        <CommandModule
          title="Work Type Distribution"
          icon={BarChart3}
          badge={<span className="text-[11px] font-mono text-subtle">{totalIssues} Total</span>}
        >
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(typeCounts).map(([tType, count]) => {
              if (count === 0) return null;
              return (
                <div key={tType} className="flex items-center justify-between p-3 rounded-[10px] border border-border-default bg-neutral/40">
                  <div className="flex items-center gap-2">
                    <TypeIcon type={tType as IssueType} size={16} />
                    <span className="text-[12px] font-semibold text-default capitalize">{tType.toLowerCase()}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-default">{count}</span>
                </div>
              );
            })}
          </div>
        </CommandModule>
      </div>

      {/* 3. Project Radar & Assigned Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 5: Project Radar Health Table */}
        <CommandModule
          title="Project Health Radar"
          icon={FolderKanban}
          badge={<span className="text-[11px] font-mono text-brand font-bold">{projects.length} Projects</span>}
        >
          {projects.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-subtlest italic">No projects found.</div>
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
                        <Link href={`/projects/${p.key}/board`} className="font-bold text-[13px] text-default hover:text-brand transition-colors truncate block">
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
        </CommandModule>

        {/* Module 6: Assigned Tactical Tasks */}
        <CommandModule
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
        </CommandModule>
      </div>

      {/* 4. Live Activity Telemetry Feed */}
      <CommandModule
        title="Live Activity Telemetry Stream"
        icon={Activity}
        badge={<span className="text-[11px] font-mono text-success font-bold">LIVE RECENT AUDIT</span>}
      >
        {recentActivity.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-subtlest italic">No recent activity detected.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
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
      </CommandModule>
    </div>
  );
}
