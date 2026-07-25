"use client";

import { useState, memo } from "react";
import { Plus } from "lucide-react";
import { IssueCard, type BoardIssue, type BoardUserOption } from "./IssueCard";
import { quickCreateIssueAction } from "@/app/(app)/projects/[key]/backlog/actions";
import type { IssueStatus } from "@prisma/client";

const columnTitles: Record<IssueStatus, string> = {
  TO_DO: "TO DO",
  IN_PROGRESS: "IN PROGRESS",
  IN_REVIEW: "IN REVIEW",
  DONE: "DONE",
};

function BoardColumnComponent({
  status,
  issues,
  onStatusChange,
  onAssigneeChange,
  onSelectIssue,
  availableUsers = [],
  currentUserId,
  isAdmin = true,
  wipLimit,
  projectId,
  projectKey,
  sprintId,
  onQuickCreated,
}: {
  status: IssueStatus;
  issues: BoardIssue[];
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
  onAssigneeChange?: (issueId: string, assigneeId: string | null) => void;
  onSelectIssue?: (issue: BoardIssue) => void;
  availableUsers?: BoardUserOption[];
  currentUserId?: string;
  isAdmin?: boolean;
  wipLimit?: number | null;
  projectId?: string;
  projectKey?: string;
  sprintId?: string | null;
  onQuickCreated?: (newIssue: BoardIssue) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isQuickCreating, setIsQuickCreating] = useState(false);
  const [quickSummary, setQuickSummary] = useState("");

  const isWipExceeded = typeof wipLimit === "number" && issues.length > wipLimit;
  const totalStoryPoints = issues.reduce((acc, i) => acc + (i.storyPoints ?? 0), 0);

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
    const canEdit = isAdmin || (targetIssue ? targetIssue.assignee?.id === currentUserId : true);
    if (!canEdit) return;

    onStatusChange(issueId, status);
  };

  const handleQuickCreate = async () => {
    if (!quickSummary.trim() || !projectId || !projectKey) return;
    const text = quickSummary.trim();
    setQuickSummary("");
    setIsQuickCreating(false);

    const tempIssue: BoardIssue = {
      id: `temp-${Date.now()}`,
      key: `${projectKey}-…`,
      summary: text,
      type: "TASK",
      status,
      priority: "MEDIUM",
      projectKey,
    };
    onQuickCreated?.(tempIssue);

    const res = await quickCreateIssueAction({
      projectId,
      summary: text,
      status,
      sprintId: sprintId || undefined,
    });
    if (res?.success && res.issue) {
      onQuickCreated?.({ ...res.issue, projectKey } as BoardIssue);
    }
  };

  const statusColors: Record<IssueStatus, string> = {
    TO_DO: "bg-amber-400",
    IN_PROGRESS: "bg-sky-500",
    IN_REVIEW: "bg-purple-500",
    DONE: "bg-emerald-500",
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex w-72 shrink-0 flex-col rounded-[16px] border p-3.5 min-h-[520px] max-h-[calc(100vh-170px)] transition-all ${
        isWipExceeded
          ? "border-danger/50 bg-danger/5"
          : isDragOver
          ? "border-brand bg-brand/5 ring-2 ring-brand/30 shadow-md"
          : "border-border-default/60 bg-surface-sunken/40"
      }`}
    >
      {/* Column Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`} />
          <h3 className={`text-[11px] font-extrabold uppercase tracking-wider ${isWipExceeded ? "text-danger" : "text-subtle"}`}>
            {columnTitles[status]}
          </h3>
          {status === "DONE" && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-500 fill-none stroke-[3] stroke-current" xmlns="http://www.w3.org/2000/svg">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isWipExceeded && (
            <span className="rounded-[4px] bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Max {wipLimit}
            </span>
          )}
          {totalStoryPoints > 0 && (
            <span
              title="Total story points"
              className="flex h-5 items-center justify-center rounded-full bg-neutral px-2 font-mono text-[10px] font-bold text-subtle"
            >
              {totalStoryPoints} pts
            </span>
          )}
          <span
            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-bold ${
              isWipExceeded ? "bg-danger/20 text-danger" : "bg-neutral text-default"
            }`}
          >
            {issues.length}
          </span>
        </div>
      </div>

      {/* Issues list */}
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-0.5">
        {issues.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border-default p-4 text-center text-[12px] text-subtlest italic">
            Drop tasks here
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
                onSelectIssue={onSelectIssue}
                availableUsers={availableUsers}
                canEditStatus={canEditStatus}
              />
            );
          })
        )}
      </div>

      {/* Quick Create in Column Footer */}
      <div className="mt-2 pt-1 border-t border-border-default">
        {isQuickCreating ? (
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <input
              type="text"
              autoFocus
              placeholder="What needs to be done?"
              value={quickSummary}
              onChange={(e) => setQuickSummary(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickCreate();
                if (e.key === "Escape") setIsQuickCreating(false);
              }}
              className="h-8 rounded-[8px] border border-brand bg-surface px-2.5 text-[12px] text-default outline-none shadow-xs"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleQuickCreate}
                className="h-7 px-2.5 rounded-[6px] bg-brand text-white text-[11px] font-semibold hover:bg-brand-hovered"
              >
                Add
              </button>
              <button
                onClick={() => setIsQuickCreating(false)}
                className="h-7 px-2 text-subtlest hover:text-default text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsQuickCreating(true);
              setQuickSummary("");
            }}
            className="flex items-center gap-1 w-full rounded-[8px] py-1.5 px-2 text-[12px] font-semibold text-subtle hover:bg-neutral hover:text-default transition-all"
          >
            <Plus size={13} />
            <span>Create task</span>
          </button>
        )}
      </div>
    </div>
  );
}

export const BoardColumn = memo(BoardColumnComponent);
