"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, ChevronDown } from "lucide-react";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type IssueListItem = {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints?: number | null;
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
  projectKey: string;
  loggedHours?: number;
};

const statusColors: Record<IssueStatus, string> = {
  TO_DO: "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
};

const statusLabels: Record<IssueStatus, string> = {
  TO_DO: "TO DO",
  IN_PROGRESS: "IN PROGRESS",
  IN_REVIEW: "IN REVIEW",
  DONE: "DONE",
};

const priorityLabels: Record<IssuePriority, string> = {
  HIGHEST: "Highest",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  LOWEST: "Lowest",
};

const typeLabels: Record<IssueType, string> = {
  STORY: "Story",
  TASK: "Task",
  BUG: "Bug",
  EPIC: "Epic",
  SUBTASK: "Subtask",
};

export function IssueTable({
  issues: initialIssues,
  projectKey,
  onStatusChange,
  onPriorityChange,
  onAssigneeChange,
  onTypeChange,
  availableUsers = [],
}: {
  issues: IssueListItem[];
  projectKey: string;
  onStatusChange?: (issueId: string, status: IssueStatus) => void;
  onPriorityChange?: (issueId: string, priority: IssuePriority) => void;
  onAssigneeChange?: (issueId: string, assigneeId: string | null) => void;
  onTypeChange?: (issueId: string, type: IssueType) => void;
  availableUsers?: { id: string; name: string; avatarUrl?: string | null }[];
}) {
  const [, startTransition] = useTransition();
  const [localIssues, setLocalIssues] = useState<IssueListItem[]>(initialIssues);

  // Sync if initialIssues changes
  const activeIssues = initialIssues.length !== localIssues.length ? initialIssues : localIssues;

  const handleStatusUpdate = (issueId: string, newStatus: IssueStatus) => {
    setLocalIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
    );

    if (onStatusChange) {
      onStatusChange(issueId, newStatus);
    }

    startTransition(async () => {
      await updateIssueFieldAction(issueId, "status", newStatus);
    });
  };

  const handlePriorityUpdate = (issueId: string, newPriority: IssuePriority) => {
    setLocalIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, priority: newPriority } : i))
    );

    if (onPriorityChange) {
      onPriorityChange(issueId, newPriority);
    }

    startTransition(async () => {
      await updateIssueFieldAction(issueId, "priority", newPriority);
    });
  };

  const handleTypeUpdate = (issueId: string, newType: IssueType) => {
    setLocalIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, type: newType } : i))
    );

    if (onTypeChange) {
      onTypeChange(issueId, newType);
    }

    startTransition(async () => {
      await updateIssueFieldAction(issueId, "type", newType);
    });
  };

  const handleAssigneeUpdate = (issueId: string, assigneeId: string | null) => {
    const assignedUser = availableUsers.find((u) => u.id === assigneeId);
    setLocalIssues((prev) =>
      prev.map((i) =>
        i.id === issueId
          ? {
              ...i,
              assignee: assignedUser
                ? { id: assignedUser.id, name: assignedUser.name, avatarUrl: assignedUser.avatarUrl }
                : null,
            }
          : i
      )
    );

    if (onAssigneeChange) {
      onAssigneeChange(issueId, assigneeId);
    }

    startTransition(async () => {
      await updateIssueFieldAction(issueId, "assigneeId", assigneeId || "");
    });
  };

  if (activeIssues.length === 0) {
    return (
      <div className="mt-12 text-center text-sm text-text-subtle py-8">
        No tasks found. Use the &ldquo;Create&rdquo; button in the top navigation to add one!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle bg-neutral/40">
            <th className="py-2.5 pl-3 w-10">T</th>
            <th className="w-24">Key</th>
            <th>Summary</th>
            <th className="w-36">Status</th>
            <th className="w-28">Priority</th>
            <th className="w-44">Assignee</th>
            <th className="w-24 text-center">Logged</th>
            <th className="w-16 text-right pr-3">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {activeIssues.map((issue) => (
            <tr key={issue.id} className="hover:bg-neutral/50 transition-colors group">
              {/* Type Dropdown */}
              <td className="py-2.5 pl-3">
                <div className="relative inline-flex items-center group/type">
                  <select
                    value={issue.type}
                    onChange={(e) => handleTypeUpdate(issue.id, e.target.value as IssueType)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title={`Change type (${typeLabels[issue.type]})`}
                  >
                    <option value="STORY">Story</option>
                    <option value="TASK">Task</option>
                    <option value="BUG">Bug</option>
                    <option value="EPIC">Epic</option>
                  </select>
                  <div className="p-1 rounded hover:bg-neutral transition-colors cursor-pointer flex items-center gap-0.5">
                    <TypeIcon type={issue.type} />
                  </div>
                </div>
              </td>

              {/* Key */}
              <td className="font-mono text-xs font-semibold text-text-subtle">
                <Link href={`/projects/${projectKey}/issues/${issue.key}`} className="hover:text-brand">
                  {issue.key}
                </Link>
              </td>

              {/* Summary */}
              <td className="font-medium text-text">
                <Link href={`/projects/${projectKey}/issues/${issue.key}`} className="hover:underline">
                  {issue.summary}
                </Link>
              </td>

              {/* Status Interactive Dropdown Badge */}
              <td className="py-2">
                <div className="relative inline-block">
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusUpdate(issue.id, e.target.value as IssueStatus)}
                    className={`h-7 px-2 pr-6 rounded-md text-xs font-bold border transition-colors outline-none cursor-pointer appearance-none ${
                      statusColors[issue.status]
                    }`}
                  >
                    <option value="TO_DO">TO DO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="IN_REVIEW">IN REVIEW</option>
                    <option value="DONE">DONE</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2 top-2.5 pointer-events-none text-current opacity-70"
                  />
                </div>
              </td>

              {/* Priority Interactive Dropdown */}
              <td className="py-2">
                <div className="relative flex items-center gap-1">
                  <PriorityIcon priority={issue.priority} />
                  <select
                    value={issue.priority}
                    onChange={(e) => handlePriorityUpdate(issue.id, e.target.value as IssuePriority)}
                    className="h-7 rounded border border-transparent bg-transparent hover:border-border px-1.5 text-xs font-medium text-text outline-none focus:border-brand cursor-pointer"
                  >
                    <option value="HIGHEST">Highest</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                    <option value="LOWEST">Lowest</option>
                  </select>
                </div>
              </td>

              {/* Assignee Interactive Dropdown */}
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={22} />
                  <select
                    value={issue.assignee?.id ?? ""}
                    onChange={(e) => handleAssigneeUpdate(issue.id, e.target.value || null)}
                    className="h-7 max-w-[130px] rounded border border-transparent bg-transparent hover:border-border px-1 text-xs font-medium text-text outline-none focus:border-brand cursor-pointer truncate"
                  >
                    <option value="">Unassigned</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </td>

              {/* Logged Hours */}
              <td className="text-center font-mono text-xs text-text-subtle">
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} className="text-brand" />
                  {issue.loggedHours ? `${issue.loggedHours.toFixed(1)}h` : "-"}
                </span>
              </td>

              {/* Story Points */}
              <td className="pr-3 text-right font-mono text-xs text-text-subtle">
                {issue.storyPoints ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
