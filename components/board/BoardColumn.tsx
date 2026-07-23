"use client";

import { useState } from "react";
import { IssueCard, type BoardIssue, type BoardUserOption } from "./IssueCard";
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
  onAssigneeChange,
  availableUsers = [],
  currentUserId,
  isAdmin = true,
  wipLimit,
}: {
  status: IssueStatus;
  issues: BoardIssue[];
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
  onAssigneeChange?: (issueId: string, assigneeId: string | null) => void;
  availableUsers?: BoardUserOption[];
  currentUserId?: string;
  isAdmin?: boolean;
  wipLimit?: number | null;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const isWipExceeded = typeof wipLimit === "number" && issues.length > wipLimit;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const issueId = e.dataTransfer.getData("text/plain");
    if (!issueId) return;

    const targetIssue = issues.find((i) => i.id === issueId);
    const canEdit = isAdmin || (targetIssue && targetIssue.assignee?.id === currentUserId);
    if (canEdit || targetIssue === undefined) {
      onStatusChange(issueId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex w-72 flex-col rounded-ds border p-3 max-h-[calc(100vh-180px)] transition-colors ${
        isWipExceeded
          ? "border-danger/60 bg-danger/5"
          : isDragOver
          ? "border-brand bg-selected/40 ring-2 ring-brand/30"
          : "border-border-default bg-surface-sunken"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isWipExceeded ? "text-danger" : "text-subtle"}`}>
            {columnTitles[status]}
          </h3>
          {status === "DONE" && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-success fill-none stroke-[3] stroke-current" xmlns="http://www.w3.org/2000/svg">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {isWipExceeded && (
            <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Max {wipLimit}
            </span>
          )}
          <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-xs font-bold ${
            isWipExceeded ? "bg-danger/20 text-danger" : "bg-neutral text-default"
          }`}>
            {issues.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
        {issues.length === 0 ? (
          <div className="rounded-ds border border-dashed border-border p-4 text-center text-xs text-text-subtle italic">
            Drop issues here
          </div>
        ) : (
          issues.map((issue) => {
            const canEditStatus = isAdmin || issue.assignee?.id === currentUserId;
            return (
              <IssueCard
                key={issue.id}
                issue={issue}
                onStatusChange={onStatusChange}
                onAssigneeChange={onAssigneeChange}
                availableUsers={availableUsers}
                canEditStatus={canEditStatus}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

