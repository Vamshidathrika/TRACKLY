"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatHoursToReadable } from "@/components/issues/TimeLogModal";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import { getReleasesAction } from "@/app/(app)/projects/[key]/releases/actions";
import type { BoardIssue, BoardUserOption } from "../IssueCard";
import type { IssueStatus, IssuePriority, IssueType } from "@prisma/client";
import {
  ISSUE_TYPES as issueTypes,
  PRIORITY_CONFIG as priorityIcons,
  ISSUE_STATUSES as statuses,
} from "@/lib/issues-config";
import {
  ShieldAlert,
  ArrowRight,
  Clock,
  Layers,
  GitPullRequest,
  GitBranch,
  Sparkles,
} from "lucide-react";

function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function getDueDateStatus(dueDateStr: string, currentStatus: string) {
  if (!dueDateStr || currentStatus === "DONE") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      type: "overdue",
      label: `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "day" : "days"}`,
      bg: "bg-danger/10 text-danger border-danger/30",
    };
  } else if (diffDays === 0) {
    return {
      type: "today",
      label: "Due today",
      bg: "bg-warning/20 text-warning-text border-warning/40",
    };
  } else if (diffDays <= 3) {
    return {
      type: "soon",
      label: `Due in ${diffDays} ${diffDays === 1 ? "day" : "days"}`,
      bg: "bg-brand/10 text-brand border-brand/30",
    };
  }
  return null;
}

interface IssueSidebarProps {
  issue: BoardIssue;
  onUpdateIssue: (updated: BoardIssue) => void;
  availableUsers: BoardUserOption[];
  isBlocked: boolean;
  activeBlockers: any[];
  currentStatus: any;
  handleStatusSelect: (status: IssueStatus) => void;
  handleWorkflowTransition: () => void;
  handleAssigneeSelect: (id: string | null) => void;
  handleTypeSelect: (type: IssueType) => void;
  handlePrioritySelect: (priority: IssuePriority) => void;
  estimateHours: number | string;
  setEstimateHours: (hours: number | string) => void;
  handleEstimateBlur: () => void;
  loggedHours: number;
  estimatedHours: number;
  setShowTimeModal: (show: boolean) => void;
  setActiveTab: (tab: any) => void;
  devData: any;
  showToast: (msg: string) => void;
}

export function IssueSidebar({
  issue,
  onUpdateIssue,
  availableUsers,
  isBlocked,
  activeBlockers,
  currentStatus,
  handleStatusSelect,
  handleWorkflowTransition,
  handleAssigneeSelect,
  handleTypeSelect,
  handlePrioritySelect,
  estimateHours,
  setEstimateHours,
  handleEstimateBlur,
  loggedHours,
  estimatedHours,
  setShowTimeModal,
  setActiveTab,
  devData,
  showToast,
}: IssueSidebarProps) {
  const [, startTransition] = useTransition();

  const [points, setPoints] = useState<number | string>("");
  const [reporterId, setReporterId] = useState<string>("");
  const [releaseId, setReleaseId] = useState<string>("");
  const [availableReleases, setAvailableReleases] = useState<{ id: string; name: string }[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState<string>("");

  const lastIssueIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (issue) {
      const isNewIssue = lastIssueIdRef.current !== issue.id;
      lastIssueIdRef.current = issue.id;

      setPoints(typeof issue.storyPoints === "number" && issue.storyPoints > 0 ? issue.storyPoints : (issue.storyPoints === 0 ? 0 : ""));
      setReporterId(issue.reporterId || issue.reporter?.id || "");
      setReleaseId(issue.releaseId || "");
      setStartDate(toDateInput(issue.startDate));
      setDueDate(toDateInput(issue.dueDate));
      setLabels(issue.labels || []);
    }
  }, [issue]);

  useEffect(() => {
    let cancelled = false;
    const projectId = issue.projectId || issue.project?.id;
    if (projectId) {
      getReleasesAction(projectId).then((res) => {
        if (!cancelled && res.success) setAvailableReleases(res.releases);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [issue.id, issue.projectId, issue.project?.id]);

  const handleReporterSelect = (newReporterId: string) => {
    const selectedUser = availableUsers.find((u) => u.id === newReporterId);
    setReporterId(newReporterId);
    const updated = {
      ...issue,
      reporterId: newReporterId,
      reporter: selectedUser ? { id: selectedUser.id, name: selectedUser.name, avatarUrl: selectedUser.avatarUrl } : issue.reporter,
    };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "reporterId", newReporterId || "");
    });
  };

  const handleReleaseSelect = (newReleaseId: string) => {
    if (newReleaseId === releaseId) return;
    setReleaseId(newReleaseId);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "releaseId", newReleaseId || null);
    });
  };

  const handlePointsBlur = () => {
    const num = points === "" ? null : Number(points);
    if (num !== issue.storyPoints) {
      const updated = { ...issue, storyPoints: num };
      onUpdateIssue(updated);
      startTransition(async () => {
        await updateIssueFieldAction(issue.id, "storyPoints", num);
      });
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const updated = { ...issue, startDate: val ? new Date(val) : null };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "startDate", val);
    });
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    const updated = { ...issue, dueDate: val ? new Date(val) : null };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "dueDate", val);
    });
  };

  const handleAddLabel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tag = labelDraft.trim().toLowerCase();
    if (!tag || labels.includes(tag)) return;
    const newLabels = [...labels, tag];
    setLabels(newLabels);
    setLabelDraft("");
    const updated = { ...issue, labels: newLabels };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "labels", newLabels.join(","));
    });
  };

  const handleRemoveLabel = (tagToRemove: string) => {
    const newLabels = labels.filter((l) => l !== tagToRemove);
    setLabels(newLabels);
    const updated = { ...issue, labels: newLabels };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "labels", newLabels.join(","));
    });
  };

  const dueDateStatus = getDueDateStatus(dueDate, issue.status);

  return (
    <div className="flex flex-col gap-5 p-4 rounded-xl bg-surface-sunken border border-border/60 shrink-0 h-fit">
      {/* Smart Workflow Action Primary Button */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Workflow Action</label>
          {isBlocked && (
            <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20 flex items-center gap-1">
              <ShieldAlert size={10} /> Blocked
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleWorkflowTransition}
          className={`w-full h-10 sm:h-9 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
            isBlocked && issue.status === "IN_REVIEW"
              ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20"
              : issue.status === "DONE"
              ? "bg-neutral text-text hover:bg-neutral/80 border border-border"
              : "bg-brand text-white hover:bg-brand-hovered"
          }`}
        >
          {isBlocked && issue.status === "IN_REVIEW" && <ShieldAlert size={14} className="text-amber-500" />}
          <span>
            {issue.status === "TO_DO"
              ? "Start Progress"
              : issue.status === "IN_PROGRESS"
              ? "Submit for Review"
              : issue.status === "IN_REVIEW"
              ? (isBlocked ? `Mark Complete (Blocked by ${activeBlockers[0]?.key})` : "Mark Complete")
              : "Reopen Task"}
          </span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Status Select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Status</label>
        <select
          value={issue.status}
          onChange={(e) => handleStatusSelect(e.target.value as IssueStatus)}
          className={`h-10 sm:h-9 px-3 text-xs font-bold rounded-lg border border-border outline-none transition-all cursor-pointer ${currentStatus?.bg || ""} ${currentStatus?.text || ""}`}
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Assignee Dropdown + Assign to me */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Assignee</label>
          {availableUsers.length > 0 && (
            <button
              type="button"
              onClick={() => {
                handleAssigneeSelect(availableUsers[0].id);
                showToast(`Assigned task to ${availableUsers[0].name}`);
              }}
              className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
            >
              Assign to me
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-border">
          <Avatar name={issue.assignee?.name || "Unassigned"} src={issue.assignee?.avatarUrl} size={24} />
          <select
            value={issue.assignee?.id || ""}
            onChange={(e) => handleAssigneeSelect(e.target.value || null)}
            className="flex-1 bg-transparent text-xs text-text font-medium outline-none cursor-pointer"
          >
            <option value="">Unassigned</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reporter Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Reporter</label>
        <div className="flex items-center gap-2 bg-surface p-2 rounded-lg border border-border">
          <Avatar name={issue.reporter?.name || "Unassigned"} src={issue.reporter?.avatarUrl} size={24} />
          <select
            value={reporterId}
            onChange={(e) => handleReporterSelect(e.target.value)}
            className="flex-1 bg-transparent text-xs text-text font-medium outline-none cursor-pointer"
          >
            <option value="">Select reporter</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Issue Type */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Issue Type</label>
        <select
          value={issue.type}
          onChange={(e) => handleTypeSelect(e.target.value as IssueType)}
          className="h-10 sm:h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none cursor-pointer"
        >
          {issueTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Priority</label>
        <select
          value={issue.priority}
          onChange={(e) => handlePrioritySelect(e.target.value as IssuePriority)}
          className="h-10 sm:h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none cursor-pointer"
        >
          {Object.entries(priorityIcons).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fix Version */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Fix Version</label>
        <select
          value={releaseId}
          onChange={(e) => handleReleaseSelect(e.target.value)}
          className="h-10 sm:h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none cursor-pointer"
        >
          <option value="">None</option>
          {availableReleases.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Story Points */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Story Points</label>
        <input
          type="number"
          value={points}
          onChange={(e) => setPoints(e.target.value === "" ? "" : Number(e.target.value))}
          onBlur={handlePointsBlur}
          placeholder="None"
          min={0}
          max={100}
          className="h-10 sm:h-9 px-3 text-xs font-mono font-bold rounded-lg border border-border bg-surface text-text outline-none focus:border-brand"
        />
      </div>

      {/* Unified Time Tracking & Log Work Box */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-surface border border-border shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-brand" /> Time Tracking
          </label>
          <button
            type="button"
            onClick={() => setShowTimeModal(true)}
            className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
          >
            + Log work
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
          <span className="text-xs font-semibold text-text-subtle">Estimated (hours):</span>
          <input
            type="number"
            value={estimateHours}
            onChange={(e) => setEstimateHours(e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={handleEstimateBlur}
            placeholder="None"
            min={0}
            step={0.5}
            className="h-10 sm:h-8 w-24 px-2 text-right text-xs font-mono font-bold rounded-lg border border-border bg-neutral/30 text-text outline-none focus:border-brand"
          />
        </div>

        <div className="pt-1 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-subtle font-medium">Logged:</span>
            <span className="font-bold text-text font-mono">
              {formatHoursToReadable(loggedHours)} / {estimatedHours > 0 ? formatHoursToReadable(estimatedHours) : "Not set"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral overflow-hidden">
            <div
              style={{
                width: `${estimatedHours > 0 ? Math.min(100, Math.round((loggedHours / estimatedHours) * 100)) : 0}%`,
              }}
              className="h-full bg-brand transition-all"
            />
          </div>
        </div>
      </div>

      {/* Start Date */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="h-10 sm:h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none focus:border-brand cursor-pointer"
        />
      </div>

      {/* Due Date & Overdue Alert */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Due Date</label>
          {dueDateStatus && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dueDateStatus.bg}`}>
              {dueDateStatus.label}
            </span>
          )}
        </div>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => handleDueDateChange(e.target.value)}
          className="h-10 sm:h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none focus:border-brand cursor-pointer"
        />
      </div>

      {/* Labels / Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Labels</label>
        <div className="flex flex-wrap gap-1.5 items-center">
          {labels.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-brand/10 text-brand text-[11px] font-semibold flex items-center gap-1 group"
            >
              #{tag}
              <button
                onClick={() => handleRemoveLabel(tag)}
                className="hover:text-red-500 text-brand/60 font-bold"
                title="Remove tag"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddLabel} className="flex gap-1 mt-1">
          <input
            type="text"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="+ Add tag..."
            className="flex-1 h-10 sm:h-7 px-2 text-[11px] rounded border border-border bg-surface text-text outline-none focus:border-brand"
          />
          <button
            type="submit"
            className="h-10 sm:h-7 px-2 bg-neutral hover:bg-neutral/80 text-text font-bold text-[11px] rounded shrink-0"
          >
            Add
          </button>
        </form>
      </div>

      {/* Development & Superpowers Summary Card */}
      <div className="pt-3 border-t border-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-text uppercase tracking-wider flex items-center gap-1">
            <Layers size={13} className="text-purple-600" /> Development & Apps
          </span>
          <button
            type="button"
            onClick={() => setActiveTab("development")}
            className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
          >
            Open Panel →
          </button>
        </div>
        {(() => {
          const prs = devData.pullRequests ?? [];
          const branches = devData.branches ?? [];
          const commits = devData.commits ?? [];

          if (prs.length === 0 && branches.length === 0 && commits.length === 0) {
            return (
              <div className="p-3 rounded-xl border border-dashed border-border bg-neutral/10 text-[11px] text-text-subtle">
                No linked branches, commits or pull requests yet. Reference this issue key
                in a branch name or commit message to link work here.
              </div>
            );
          }

          const latestPr = prs[0] as { number?: number; status?: string } | undefined;

          return (
            <div
              onClick={() => setActiveTab("development")}
              className="p-3 rounded-xl border border-border bg-neutral/20 hover:bg-neutral/40 transition-all cursor-pointer flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text flex items-center gap-1.5 truncate">
                  <GitPullRequest size={13} className="text-purple-600 shrink-0" />
                  {prs.length} Pull Request{prs.length === 1 ? "" : "s"}
                </span>
                {latestPr?.number != null && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono bg-purple-500/10 text-purple-600 shrink-0">
                    #{latestPr.number} {latestPr.status ?? ""}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-subtle">
                <span className="flex items-center gap-1 font-mono truncate">
                  <GitBranch size={11} className="text-brand shrink-0" />
                  {branches.length} Branch{branches.length === 1 ? "" : "es"}
                </span>
                <span className="text-[10px] font-mono text-text-subtle shrink-0">
                  {commits.length} commit{commits.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-border/50 text-[10px] text-purple-600 font-extrabold">
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" /> Development
                </span>
                <span>View All →</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
