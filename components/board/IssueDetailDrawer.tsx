"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  User,
  CheckSquare,
  Clock,
  Trash2,
  Share2,
  Tag,
  AlertCircle,
  Bookmark,
  Bug,
  CheckCircle2,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  MessageSquare,
  Plus,
  Send,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { updateIssueFieldAction, deleteIssueAction } from "@/app/(app)/projects/[key]/issues/actions";
import type { BoardIssue, BoardUserOption } from "./IssueCard";
import type { IssueStatus, IssuePriority, IssueType } from "@prisma/client";
import { ISSUE_TYPES as issueTypes, PRIORITY_CONFIG as priorityIcons, ISSUE_STATUSES as statuses } from "@/lib/issues-config";

export function IssueDetailDrawer({
  issue,
  onClose,
  onUpdateIssue,
  onDeleteIssue,
  availableUsers = [],
}: {
  issue: BoardIssue | null;
  onClose: () => void;
  onUpdateIssue: (updated: BoardIssue) => void;
  onDeleteIssue: (issueId: string) => void;
  availableUsers?: BoardUserOption[];
}) {
  const [, startTransition] = useTransition();
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [points, setPoints] = useState<number | "">("");
  const [commentInput, setCommentInput] = useState("");
  const [comments, setComments] = useState<{ id: string; text: string; date: string; author: string }[]>([]);

  useEffect(() => {
    if (issue) {
      setSummary(issue.summary);
      setDescription(issue.description || "");
      setPoints(issue.storyPoints ?? "");
      setIsEditingSummary(false);
      setIsEditingDescription(false);
      setCommentInput("");
    }
  }, [issue]);

  if (!issue) return null;

  const currentType = issueTypes.find((t) => t.value === issue.type) || issueTypes[1];
  const currentPriority = priorityIcons[issue.priority] || priorityIcons.MEDIUM;
  const currentStatus = statuses.find((s) => s.value === issue.status) || statuses[0];

  const handleSummaryBlur = () => {
    setIsEditingSummary(false);
    if (summary.trim() && summary !== issue.summary) {
      const updated = { ...issue, summary: summary.trim() };
      onUpdateIssue(updated);
      startTransition(async () => {
        await updateIssueFieldAction(issue.id, "summary", summary.trim());
      });
    } else {
      setSummary(issue.summary);
    }
  };

  const handleDescriptionSave = () => {
    setIsEditingDescription(false);
    if (description !== (issue.description || "")) {
      const updated = { ...issue, description };
      onUpdateIssue(updated);
      startTransition(async () => {
        await updateIssueFieldAction(issue.id, "description", description || "");
      });
    }
  };

  const handleStatusSelect = (newStatus: IssueStatus) => {
    if (newStatus === issue.status) return;
    const updated = { ...issue, status: newStatus };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "status", newStatus);
    });
  };

  const handlePrioritySelect = (newPriority: IssuePriority) => {
    if (newPriority === issue.priority) return;
    const updated = { ...issue, priority: newPriority };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "priority", newPriority);
    });
  };

  const handleTypeSelect = (newType: IssueType) => {
    if (newType === issue.type) return;
    const updated = { ...issue, type: newType };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "type", newType);
    });
  };

  const handleAssigneeSelect = (assigneeId: string | null) => {
    const selectedUser = availableUsers.find((u) => u.id === assigneeId);
    const updated = { ...issue, assignee: selectedUser ? { id: selectedUser.id, name: selectedUser.name, avatarUrl: selectedUser.avatarUrl } : null };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "assigneeId", assigneeId || "");
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

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this issue?")) {
      onDeleteIssue(issue.id);
      onClose();
      startTransition(async () => {
        await deleteIssueAction(issue.id);
      });
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        text: commentInput.trim(),
        date: "Just now",
        author: "You",
      },
    ]);
    setCommentInput("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="relative w-full max-w-2xl bg-surface border-l border-border h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-subtle">
            <span className={`p-1 rounded ${currentType.color}`}>{currentType.icon}</span>
            <span className="font-mono text-text hover:underline cursor-pointer">{issue.key}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              title="Copy issue link"
              className="p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={handleDelete}
              title="Delete issue"
              className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Title / Summary */}
            <div>
              {isEditingSummary ? (
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  onBlur={handleSummaryBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSummaryBlur();
                    if (e.key === "Escape") {
                      setSummary(issue.summary);
                      setIsEditingSummary(false);
                    }
                  }}
                  autoFocus
                  className="w-full text-xl font-bold text-text bg-surface border border-brand rounded-lg px-2.5 py-1.5 outline-none"
                />
              ) : (
                <h1
                  onClick={() => setIsEditingSummary(true)}
                  className="text-xl font-bold text-text hover:bg-neutral/60 px-2 py-1 -ml-2 rounded-lg cursor-pointer transition-colors"
                >
                  {issue.summary}
                </h1>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider">Description</h3>
              {isEditingDescription ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a detailed description…"
                    rows={5}
                    className="w-full text-sm text-text bg-surface border border-brand rounded-lg p-3 outline-none resize-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => setIsEditingDescription(false)}
                      className="px-3 py-1.5 text-xs font-medium text-text-subtle hover:bg-neutral rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDescriptionSave}
                      className="px-3 py-1.5 text-xs font-semibold bg-brand text-white hover:bg-brand-hovered rounded-lg shadow-xs"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDescription(true)}
                  className="min-h-[90px] text-sm text-text bg-surface-sunken hover:bg-neutral/60 rounded-xl p-3 cursor-pointer transition-colors border border-border/50"
                >
                  {issue.description ? (
                    <p className="whitespace-pre-wrap">{issue.description}</p>
                  ) : (
                    <span className="text-text-subtle text-xs italic">Add a description…</span>
                  )}
                </div>
              )}
            </div>

            {/* Activity / Comments */}
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} /> Activity & Comments
                </h3>
              </div>

              {/* Comment Input */}
              <div className="flex gap-2.5 items-start">
                <Avatar name="User" size={28} />
                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add a comment…"
                    rows={2}
                    className="w-full text-xs text-text bg-surface border border-border rounded-lg p-2.5 outline-none focus:border-brand resize-none"
                  />
                  {commentInput.trim() && (
                    <button
                      onClick={handleAddComment}
                      className="self-end px-3 py-1 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-hovered flex items-center gap-1 shadow-xs"
                    >
                      <Send size={12} /> Comment
                    </button>
                  )}
                </div>
              </div>

              {/* Comments List */}
              <div className="flex flex-col gap-3 mt-2">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5 p-2.5 rounded-lg bg-surface-sunken border border-border/40">
                    <Avatar name={c.author} size={24} />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between text-text-subtle mb-1">
                        <span className="font-semibold text-text">{c.author}</span>
                        <span className="text-[10px]">{c.date}</span>
                      </div>
                      <p className="text-text whitespace-pre-wrap">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Attributes Column */}
          <div className="flex flex-col gap-5 p-4 rounded-xl bg-surface-sunken border border-border/60 shrink-0 h-fit">
            {/* Status Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Status</label>
              <select
                value={issue.status}
                onChange={(e) => handleStatusSelect(e.target.value as IssueStatus)}
                className={`h-9 px-3 text-xs font-bold rounded-lg border border-border outline-none transition-all cursor-pointer ${currentStatus.bg} ${currentStatus.text}`}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Assignee</label>
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

            {/* Issue Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Issue Type</label>
              <select
                value={issue.type}
                onChange={(e) => handleTypeSelect(e.target.value as IssueType)}
                className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none cursor-pointer"
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
                className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none cursor-pointer"
              >
                {Object.entries(priorityIcons).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
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
                className="h-9 px-3 text-xs font-mono font-bold rounded-lg border border-border bg-surface text-text outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
