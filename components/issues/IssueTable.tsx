import Link from "next/link";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Tag } from "@/components/ui/Tag";
import { Avatar } from "@/components/ui/Avatar";
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
};

const statusColors: Record<IssueStatus, "gray" | "blue" | "green" | "red"> = {
  TO_DO: "gray",
  IN_PROGRESS: "blue",
  IN_REVIEW: "blue",
  DONE: "green",
};

const statusLabels: Record<IssueStatus, string> = {
  TO_DO: "TO DO",
  IN_PROGRESS: "IN PROGRESS",
  IN_REVIEW: "IN REVIEW",
  DONE: "DONE",
};

export function IssueTable({ issues, projectKey }: { issues: IssueListItem[]; projectKey: string }) {
  if (issues.length === 0) {
    return (
      <div className="mt-12 text-center text-sm text-text-subtle">
        No issues found in this project. Use the "Create" button in the top navigation to add one!
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle">
          <th className="py-2.5 pl-2 w-10">T</th>
          <th className="w-24">Key</th>
          <th>Summary</th>
          <th className="w-32">Status</th>
          <th className="w-16">P</th>
          <th className="w-32">Assignee</th>
          <th className="w-16 text-right pr-2">Pts</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id} className="border-b border-border hover:bg-[#F4F5F7] transition-colors">
            <td className="py-2 pl-2">
              <TypeIcon type={issue.type} />
            </td>
            <td className="font-mono text-xs font-semibold text-text-subtle">
              <Link href={`/projects/${projectKey}/issues/${issue.key}`} className="hover:text-brand">
                {issue.key}
              </Link>
            </td>
            <td className="font-medium text-text">
              <Link href={`/projects/${projectKey}/issues/${issue.key}`} className="hover:underline">
                {issue.summary}
              </Link>
            </td>
            <td>
              <Tag color={statusColors[issue.status]}>{statusLabels[issue.status]}</Tag>
            </td>
            <td>
              <PriorityIcon priority={issue.priority} />
            </td>
            <td className="py-2">
              {issue.assignee ? (
                <div className="flex items-center gap-1.5" title={issue.assignee.name}>
                  <Avatar name={issue.assignee.name} src={issue.assignee.avatarUrl} size={24} />
                  <span className="truncate max-w-24 text-xs">{issue.assignee.name}</span>
                </div>
              ) : (
                <span className="text-xs text-text-subtle italic">Unassigned</span>
              )}
            </td>
            <td className="pr-2 text-right font-mono text-xs text-text-subtle">
              {issue.storyPoints ?? "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
