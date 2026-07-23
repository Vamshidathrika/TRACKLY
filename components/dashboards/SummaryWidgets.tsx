"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  PlusCircle,
  AlertTriangle,
  PieChart,
  BarChart3,
  Layers,
  Users,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  X,
  ExternalLink,
  User,
  ArrowRight,
} from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { Avatar } from "@/components/ui/Avatar";
import type { IssueType, IssuePriority } from "@prisma/client";

// --- 1. METRICS ROW WIDGET ---
export type SummaryMetrics = {
  completed7d: number;
  updated7d: number;
  created7d: number;
  dueSoon7d: number;
};

export function MetricsRow({ metrics }: { metrics: SummaryMetrics }) {
  const cards = [
    {
      label: "Completed (7d)",
      value: metrics.completed7d,
      subtext: "Issues resolved",
      icon: CheckCircle2,
      color: "text-success bg-success/10 border-success/20",
    },
    {
      label: "Updated (7d)",
      value: metrics.updated7d,
      subtext: "Activity changes",
      icon: Clock,
      color: "text-brand bg-brand/10 border-brand/20",
    },
    {
      label: "Created (7d)",
      value: metrics.created7d,
      subtext: "New tickets opened",
      icon: PlusCircle,
      color: "text-purple bg-purple/10 border-purple/20",
    },
    {
      label: "Due Soon (7d)",
      value: metrics.dueSoon7d,
      subtext: "Target deadlines",
      icon: AlertTriangle,
      color: "text-warning bg-warning/10 border-warning/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="rounded-[12px] border border-border-default bg-surface p-4 flex flex-col gap-2 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-subtlest uppercase tracking-widest font-mono">
                {c.label}
              </span>
              <div className={`p-1.5 rounded-md border ${c.color}`}>
                <Icon size={14} />
              </div>
            </div>
            <span className="text-2xl font-bold text-default font-mono tracking-tight">
              {c.value}
            </span>
            <span className="text-[11px] text-subtle font-medium">{c.subtext}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- 2. STATUS OVERVIEW DONUT CHART WIDGET ---
export function StatusDonutWidget({
  statusCounts,
}: {
  statusCounts: Record<string, number>;
}) {
  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const statuses = [
    { key: "DONE", label: "Done", count: statusCounts["DONE"] || 0, color: "#10b981" },
    { key: "IN_PROGRESS", label: "In Progress", count: statusCounts["IN_PROGRESS"] || 0, color: "#3b82f6" },
    { key: "IN_REVIEW", label: "In Review", count: statusCounts["IN_REVIEW"] || 0, color: "#a855f7" },
    { key: "TO_DO", label: "To Do", count: statusCounts["TO_DO"] || 0, color: "#64748b" },
  ];

  let cumulativeAngle = 0;
  const slices = statuses.map((st) => {
    const pct = total > 0 ? st.count / total : 0;
    const angle = pct * 360;
    const slice = {
      ...st,
      pct: Math.round(pct * 100),
      startAngle: cumulativeAngle,
      endAngle: cumulativeAngle + angle,
    };
    cumulativeAngle += angle;
    return slice;
  });

  return (
    <DashboardCard
      title="Status Overview"
      icon={PieChart}
      badge={<span className="text-[11px] font-mono text-subtle">{total} Total</span>}
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* SVG Donut */}
        <div className="relative h-36 w-36 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90 transform">
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="transparent"
              stroke="var(--color-neutral-hovered, #e2e8f0)"
              strokeWidth="3.8"
            />
            {slices.map((slice) => {
              if (slice.pct === 0) return null;
              const strokeDasharray = `${slice.pct} ${100 - slice.pct}`;
              const strokeDashoffset = 100 - slice.startAngle / 3.6;
              return (
                <circle
                  key={slice.key}
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth="3.8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500 ease-out"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xl font-bold font-mono text-default">{total}</span>
            <span className="text-[10px] text-subtlest uppercase tracking-widest font-mono">Items</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 w-full">
          {slices.map((st) => (
            <div key={st.key} className="flex items-center justify-between text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: st.color }} />
                <span className="text-default">{st.label}</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-subtle">{st.count}</span>
                <span className="text-[11px] text-subtlest w-8 text-right">{st.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

// --- 3. PRIORITY BREAKDOWN BAR CHART WIDGET ---
export function PriorityBarWidget({
  priorityCounts,
}: {
  priorityCounts: Record<string, number>;
}) {
  const priorities: IssuePriority[] = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"];
  const total = Object.values(priorityCounts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(1, ...Object.values(priorityCounts));

  return (
    <DashboardCard
      title="Priority Breakdown"
      icon={BarChart3}
      badge={<span className="text-[11px] font-mono text-subtle">x: Level • y: Count</span>}
    >
      <div className="flex flex-col gap-3">
        {priorities.map((prio) => {
          const count = priorityCounts[prio] || 0;
          const pct = Math.round((count / maxCount) * 100);
          const totalPct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isDanger = prio === "HIGHEST" || prio === "HIGH";

          return (
            <div key={prio} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-default">
                  <PriorityIcon priority={prio} size={13} />
                  {prio.charAt(0) + prio.slice(1).toLowerCase()}
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className={`font-bold ${isDanger ? "text-danger" : "text-subtle"}`}>
                    {count}
                  </span>
                  <span className="text-[11px] text-subtlest w-8 text-right">{totalPct}%</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDanger ? "bg-danger" : "bg-brand/80"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

// --- 4. TYPE DISTRIBUTION HORIZONTAL BARS WIDGET ---
export function TypeDistributionWidget({
  typeCounts,
}: {
  typeCounts: Record<string, number>;
}) {
  const allTypes: IssueType[] = ["TASK", "STORY", "EPIC", "BUG", "SUBTASK"];
  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  return (
    <DashboardCard
      title="Issue Type Distribution"
      icon={Layers}
      badge={<span className="text-[11px] font-mono text-subtle">Shows 0% Types</span>}
    >
      <div className="flex flex-col gap-3">
        {allTypes.map((tType) => {
          const count = typeCounts[tType] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={tType} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TypeIcon type={tType} size={14} />
                  <span className="font-semibold text-default capitalize">
                    {tType.toLowerCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-default">{count}</span>
                  <span className="text-[11px] text-subtlest w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className="h-full rounded-full bg-brand transition-all duration-300"
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

// --- 5. TEAM WORKLOAD WIDGET WITH REASSIGN TRIGGER & UNASSIGNED BUCKET ---
export type WorkloadMember = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  count: number;
};

export function TeamWorkloadWidget({
  members,
  unassignedCount,
  projectKey,
}: {
  members: WorkloadMember[];
  unassignedCount: number;
  projectKey?: string;
}) {
  const totalAssigned = members.reduce((a, b) => a + b.count, 0);
  const grandTotal = totalAssigned + unassignedCount;

  return (
    <DashboardCard
      title="Team Workload Distribution"
      icon={Users}
      badge={
        projectKey ? (
          <Link
            href={`/projects/${projectKey}/board`}
            className="text-[11px] font-semibold text-brand hover:underline flex items-center gap-1"
          >
            Reassign work items <ArrowRight size={11} />
          </Link>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {/* Unassigned Explicit Bucket */}
        <div className="flex flex-col gap-1 p-2 rounded-lg bg-neutral/40 border border-border-default">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-neutral-hovered flex items-center justify-center text-subtlest">
                <User size={12} />
              </div>
              <span className="font-bold text-subtle">Unassigned</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="font-bold text-warning">{unassignedCount} items</span>
              <span className="text-subtlest">
                {grandTotal > 0 ? Math.round((unassignedCount / grandTotal) * 100) : 0}%
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden">
            <div
              style={{
                width: `${grandTotal > 0 ? Math.round((unassignedCount / grandTotal) * 100) : 0}%`,
              }}
              className="h-full rounded-full bg-warning transition-all"
            />
          </div>
        </div>

        {/* Assigned Teammates */}
        {members.map((m) => {
          const pct = grandTotal > 0 ? Math.round((m.count / grandTotal) * 100) : 0;
          return (
            <div key={m.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Avatar name={m.name} src={m.avatarUrl} size={20} />
                  <span className="font-semibold text-default">{m.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="font-bold text-brand">{m.count} items</span>
                  <span className="text-subtlest">{pct}%</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden">
                <div
                  style={{ width: `${pct}%` }}
                  className="h-full rounded-full bg-brand transition-all"
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

// --- 6. EPIC PROGRESS WIDGET WITH EDUCATIONAL EMPTY STATE ---
export type EpicProgressItem = {
  id: string;
  key: string;
  summary: string;
  totalChildIssues: number;
  doneChildIssues: number;
};

export function EpicProgressWidget({ epics }: { epics: EpicProgressItem[] }) {
  const [showEpicDrawer, setShowEpicDrawer] = useState(false);

  return (
    <>
      <DashboardCard
        title="Epic Roadmap Progress"
        icon={Bookmark}
        isEmpty={epics.length === 0}
        emptyState={{
          icon: Bookmark,
          title: "No epics found in this project",
          description: "Epics represent large bodies of work that can be broken down into smaller tasks.",
          actionText: "What is an epic?",
          onAction: () => setShowEpicDrawer(true),
        }}
      >
        <div className="flex flex-col gap-3">
          {epics.map((epic) => {
            const pct =
              epic.totalChildIssues > 0
                ? Math.round((epic.doneChildIssues / epic.totalChildIssues) * 100)
                : 0;

            return (
              <div key={epic.id} className="flex flex-col gap-1.5 p-3 rounded-lg border border-border-default bg-neutral/30">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <TypeIcon type="EPIC" size={14} />
                    <span className="font-mono font-bold text-brand">{epic.key}</span>
                    <span className="font-semibold text-default truncate">{epic.summary}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-success">
                    {epic.doneChildIssues}/{epic.totalChildIssues} ({pct}%)
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full rounded-full bg-purple transition-all"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </DashboardCard>

      {/* Educational "What is an Epic?" Dialog/Drawer */}
      {showEpicDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="rounded-xl border border-border-default bg-surface p-6 max-w-md w-full shadow-lg flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2 text-purple font-bold">
                <Bookmark size={18} />
                <span>What is an Epic in Trackly?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEpicDrawer(false)}
                className="p-1 hover:bg-neutral-hovered rounded text-subtlest"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-subtle leading-relaxed">
              An <strong>Epic</strong> is a container for higher-level strategic goals (e.g. &quot;Q3 Mobile App Redesign&quot;). It groups multiple user stories, bugs, and tasks together across sprints.
            </p>

            <div className="rounded-lg bg-brand/5 border border-brand/20 p-3 text-xs text-subtle flex flex-col gap-1 font-mono">
              <span className="font-bold text-brand">Example Hierarchy:</span>
              <span>EPIC-1: Customer Checkout Overhaul</span>
              <span className="pl-3">├─ TASK-10: Stripe webhook handler</span>
              <span className="pl-3">└─ STORY-12: Address autocomplete UI</span>
            </div>

            <button
              type="button"
              onClick={() => setShowEpicDrawer(false)}
              className="w-full py-2 rounded-lg bg-brand text-white font-semibold text-xs text-center"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// --- 7. PAGE FEEDBACK FOOTER WIDGET ---
export function PageFeedbackFooter() {
  const [feedbackSent, setFeedbackSent] = useState<"yes" | "no" | null>(null);

  return (
    <footer className="mt-8 pt-4 border-t border-border-default flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-subtle">
      <div className="flex items-center gap-2">
        <span>Was this page useful?</span>
        {feedbackSent ? (
          <span className="font-bold text-success flex items-center gap-1 font-mono text-[11px]">
            ✓ Thank you for your feedback!
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFeedbackSent("yes")}
              className="p-1.5 rounded hover:bg-success/15 hover:text-success border border-border-default transition-all"
              title="Yes, very useful"
            >
              <ThumbsUp size={13} />
            </button>
            <button
              type="button"
              onClick={() => setFeedbackSent("no")}
              className="p-1.5 rounded hover:bg-danger/15 hover:text-danger border border-border-default transition-all"
              title="Needs improvement"
            >
              <ThumbsDown size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-subtlest">
        <a
          href="mailto:feedback@trackly.dev"
          className="hover:text-brand transition-colors flex items-center gap-1"
        >
          Give us feedback <ExternalLink size={11} />
        </a>
        <span>•</span>
        <span>Trackly Telemetry v2.0</span>
      </div>
    </footer>
  );
}
