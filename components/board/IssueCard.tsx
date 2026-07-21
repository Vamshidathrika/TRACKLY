"use client";

import Link from "next/link";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type BoardIssue = {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints?: number | null;
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
  projectKey: string;
};

export function IssueCard({
  issue,
  onStatusChange,
}: {
  issue: BoardIssue;
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-ds border border-border bg-surface p-3 shadow-xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <Link
          href={`/projects/${issue.projectKey}/issues/${issue.key}`}
          className="font-mono text-xs font-semibold text-text-subtle hover:text-brand"
        >
          {issue.key}
        </Link>
        <select
          value={issue.status}
          onChange={(e) => onStatusChange(issue.id, e.target.value as IssueStatus)}
          className="h-6 rounded-ds border border-border bg-background px-1 text-[11px] font-semibold text-text-subtle outline-none focus:border-brand"
        >
          <option value="TO_DO">TO DO</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="IN_REVIEW">IN REVIEW</option>
          <option value="DONE">DONE</option>
        </select>
      </div>

      <Link
        href={`/projects/${issue.projectKey}/issues/${issue.key}`}
        className="text-sm font-medium text-text hover:underline line-clamp-2"
      >
        {issue.summary}
      </Link>

      <div className="mt-1 flex items-center justify-between pt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          <TypeIcon type={issue.type} size={14} />
          <PriorityIcon priority={issue.priority} size={14} />
        </div>

        <div className="flex items-center gap-2">
          {issue.storyPoints != null && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EBECF0] px-1.5 font-mono text-[11px] font-bold text-text-subtle">
              {issue.storyPoints}
            </span>
          )}
          <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={22} />
        </div>
      </div>
    </div>
  );
}
