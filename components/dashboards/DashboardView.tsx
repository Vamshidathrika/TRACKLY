"use client";

import Link from "next/link";
import { FolderKanban, CheckCircle2, User, Activity, AlertCircle } from "lucide-react";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Tag } from "@/components/ui/Tag";
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

export function DashboardView({
  statusCounts,
  priorityCounts,
  assignedIssues,
  recentActivity,
}: {
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  assignedIssues: AssignedIssue[];
  recentActivity: ActivityItem[];
}) {
  const totalIssues = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl">
      {/* Gadget 1: Status Summary */}
      <div className="rounded-ds border border-border bg-surface p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-text">
            <CheckCircle2 size={16} className="text-brand" /> Project Status Summary
          </div>
          <span className="text-xs text-text-subtle font-semibold">{totalIssues} total</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex flex-col rounded-ds border border-border-default bg-surface-sunken p-3">
              <span className="text-[11px] font-bold text-text-subtle uppercase">
                {status.replace("_", " ")}
              </span>
              <span className="text-xl font-bold text-text mt-1">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gadget 2: Priority Distribution */}
      <div className="rounded-ds border border-border bg-surface p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-text">
            <AlertCircle size={16} className="text-warning" /> Priority Breakdown
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {Object.entries(priorityCounts).map(([prio, count]) => (
            <div key={prio} className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="flex items-center gap-1.5 text-text">
                  <PriorityIcon priority={prio as IssuePriority} size={14} /> {prio}
                </span>
                <span className="text-text-subtle font-semibold">{count}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
                <div
                  style={{ width: `${totalIssues > 0 ? (count / totalIssues) * 100 : 0}%` }}
                  className="h-full bg-brand transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gadget 3: Assigned to Me */}
      <div className="rounded-ds border border-border bg-surface p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-text">
            <User size={16} className="text-brand" /> Assigned to Me ({assignedIssues.length})
          </div>
        </div>

        <div className="flex flex-col divide-y divide-border/60">
          {assignedIssues.length === 0 ? (
            <div className="py-6 text-center text-xs text-text-subtle italic">
              No issues currently assigned to you.
            </div>
          ) : (
            assignedIssues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between py-2 text-xs">
                <div className="flex items-center gap-2">
                  <TypeIcon type={issue.type} size={14} />
                  <Link
                    href={`/projects/${issue.project.key}/issues/${issue.key}`}
                    className="font-mono font-semibold text-text-subtle hover:text-brand"
                  >
                    {issue.key}
                  </Link>
                  <Link
                    href={`/projects/${issue.project.key}/issues/${issue.key}`}
                    className="font-medium text-text hover:underline truncate max-w-[180px]"
                  >
                    {issue.summary}
                  </Link>
                </div>
                <Tag>{issue.status.replace("_", " ")}</Tag>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Gadget 4: Recent Activity Stream */}
      <div className="rounded-ds border border-border bg-surface p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2 font-semibold text-sm text-text">
            <Activity size={16} className="text-success" /> Activity Stream
          </div>
        </div>

        <div className="flex flex-col divide-y divide-border/60 max-h-56 overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="py-6 text-center text-xs text-text-subtle italic">
              No recent audit activity recorded.
            </div>
          ) : (
            recentActivity.map((act) => (
              <div key={act.id} className="flex flex-col py-2 text-xs gap-0.5">
                <div className="flex items-center justify-between font-semibold text-text">
                  <span>
                    {act.author.name} updated {act.issue.key}
                  </span>
                  <span className="text-[10px] text-text-subtle opacity-70">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <span className="text-text-subtle text-[11px]">
                  Changed <span className="font-semibold">{act.field}</span>: {act.oldValue || "none"} → {act.newValue}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
