"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Clock, User } from "lucide-react";
import { TimeLogModal } from "@/components/issues/TimeLogModal";
import { logWorkAction } from "@/app/(app)/projects/[key]/issues/actions";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type BoardUserOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initials?: string;
  color?: string;
};

export type BoardIssue = {
  id: string;
  key: string;
  summary: string;
  description?: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints?: number | null;
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
  reporter?: { id: string; name: string; avatarUrl?: string | null } | null;
  sprintId?: string | null;
  projectKey: string;
  loggedHours?: number;
  estimatedHours?: number;
};

function IssueCardComponent({
  issue,
  onStatusChange,
  onAssigneeChange,
  onSelectIssue,
  availableUsers = [],
  canEditStatus = true,
}: {
  issue: BoardIssue;
  onStatusChange: (issueId: string, newStatus: IssueStatus) => void;
  onAssigneeChange?: (issueId: string, assigneeId: string | null) => void;
  onSelectIssue?: (issue: BoardIssue) => void;
  availableUsers?: BoardUserOption[];
  canEditStatus?: boolean;
}) {
  const router = useRouter();
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [loggedHours, setLoggedHours] = useState(issue.loggedHours ?? 0);
  const estimatedHours = issue.estimatedHours ?? 8;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEditStatus) return;
    e.dataTransfer.setData("text/plain", issue.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <>
      <TimeLogModal
        isOpen={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        issueKey={issue.key}
        issueSummary={issue.summary}
        currentLoggedHours={loggedHours}
        estimatedHours={estimatedHours}
        onLogTime={async (hours, description, startedAt) => {
          const res = await logWorkAction(issue.id, hours, description, startedAt);
          if (res?.error) return res.error;
          setLoggedHours((prev) => prev + hours);
          router.refresh();
          return null;
        }}
      />

      <div
        draggable={canEditStatus}
        onDragStart={handleDragStart}
        onClick={(e) => {
          // Don't trigger slide drawer if clicking dropdowns or buttons inside
          const target = e.target as HTMLElement;
          if (target.closest("select") || target.closest("button") || target.closest("a")) return;
          onSelectIssue?.(issue);
        }}
        className={`flex flex-col gap-2 rounded-ds border border-border bg-surface p-3 shadow-xs transition-all relative group cursor-pointer ${
          canEditStatus ? "hover:shadow-md hover:border-brand/60" : "opacity-90"
        }`}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSelectIssue?.(issue)}
            className="font-mono text-xs font-semibold text-text-subtle group-hover:text-brand hover:underline"
          >
            {issue.key}
          </button>

          <select
            disabled={!canEditStatus}
            value={issue.status}
            onChange={(e) => onStatusChange(issue.id, e.target.value as IssueStatus)}
            title={canEditStatus ? "Change status" : "Status changes restricted to Assignee or Admin"}
            className={`h-6 rounded-ds border border-border bg-background px-1 text-[11px] font-semibold text-text-subtle outline-none focus:border-brand ${
              !canEditStatus ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            <option value="TO_DO">TO DO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="IN_REVIEW">IN REVIEW</option>
            <option value="DONE">DONE</option>
          </select>
        </div>

        <p
          onClick={() => onSelectIssue?.(issue)}
          className="text-sm font-medium text-text group-hover:text-brand transition-colors line-clamp-2 cursor-pointer"
        >
          {issue.summary}
        </p>

        {/* Time Logged Progress Bar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowTimeModal(true);
          }}
          className="flex items-center gap-1.5 cursor-pointer text-[10px] text-text-subtle hover:text-brand transition-colors pt-1"
          title="Click to log time spent"
        >
          <Clock size={11} />
          <span>{loggedHours > 0 ? `${loggedHours.toFixed(1)}h logged` : "Log time"}</span>
          <div className="flex-1 h-1.5 rounded-full bg-neutral overflow-hidden ml-1">
            <div
              style={{ width: `${Math.min(100, Math.round((loggedHours / estimatedHours) * 100))}%` }}
              className="h-full bg-brand"
            />
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <TypeIcon type={issue.type} size={14} />
            <PriorityIcon priority={issue.priority} size={14} />
          </div>

          <div className="flex items-center gap-2 relative">
            {issue.storyPoints != null && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral px-1.5 font-mono text-[11px] font-bold text-subtle">
                {issue.storyPoints}
              </span>
            )}

            {/* Quick Assign Avatar Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAssignDropdown((prev) => !prev);
              }}
              className="rounded-full hover:ring-2 hover:ring-brand/40 transition-all cursor-pointer"
              title={issue.assignee ? `Assigned to: ${issue.assignee.name} (Click to reassign)` : "Unassigned (Click to assign)"}
            >
              <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={22} />
            </button>

            {/* Quick Assign Popover */}
            {showAssignDropdown && (
              <div className="absolute right-0 top-7 z-40 w-48 rounded-md border border-border bg-surface py-1 shadow-xl text-xs animate-in fade-in duration-150">
                <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-text-subtle border-b border-border">
                  Assign To
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssigneeChange?.(issue.id, null);
                    setShowAssignDropdown(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-hovered text-text font-medium text-left"
                >
                  <User size={14} className="text-text-subtle" />
                  <span>Unassigned</span>
                </button>
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssigneeChange?.(issue.id, user.id);
                      setShowAssignDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-hovered text-left text-text font-medium ${
                      issue.assignee?.id === user.id ? "bg-selected/40 font-bold" : ""
                    }`}
                  >
                    <Avatar name={user.name} src={user.avatarUrl} size={18} />
                    <span className="truncate">{user.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export const IssueCard = memo(IssueCardComponent, (prev, next) => {
  return (
    prev.issue.id === next.issue.id &&
    prev.issue.summary === next.issue.summary &&
    prev.issue.status === next.issue.status &&
    prev.issue.priority === next.issue.priority &&
    prev.issue.type === next.issue.type &&
    prev.issue.storyPoints === next.issue.storyPoints &&
    prev.issue.assignee?.id === next.issue.assignee?.id &&
    prev.canEditStatus === next.canEditStatus
  );
});
