"use client";

import { IssueCard, type BoardIssue } from "./IssueCard";
import type { IssueStatus } from "@prisma/client";

const columnTitles: Record<IssueStatus, string> = {
  TO_DO: "TO DO",
  IN_PROGRESS: "IN PROGRESS",
  IN_REVIEW: "IN REVIEW",
  DONE: "DONE",
};

export function BoardColumn({
  status,
  issues,
  onStatusChange,
}: {
  status: IssueStatus;
  issues: BoardIssue[];
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
}) {
  return (
    <div className="flex w-72 flex-col rounded-ds border border-border bg-[#F4F5F7] p-3 max-h-[calc(100vh-180px)]">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider">
          {columnTitles[status]}
        </h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DFE1E6] px-1.5 font-mono text-xs font-bold text-text">
          {issues.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
        {issues.length === 0 ? (
          <div className="rounded-ds border border-dashed border-border p-4 text-center text-xs text-text-subtle italic">
            No issues
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onStatusChange={onStatusChange} />
          ))
        )}
      </div>
    </div>
  );
}
