"use client";

import { useState } from "react";
import Link from "next/link";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Eye } from "lucide-react";
import { updateIssueFieldAction, postCommentAction, toggleWatcherAction } from "@/app/(app)/projects/[key]/issues/actions";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type IssueDetailData = {
  id: string;
  key: string;
  summary: string;
  description?: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints?: number | null;
  createdAt: Date;
  updatedAt: Date;
  project: { name: string; key: string };
  reporter: { id: string; name: string; avatarUrl?: string | null };
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
  comments: {
    id: string;
    body: string;
    createdAt: Date;
    author: { name: string; avatarUrl?: string | null };
  }[];
  history: {
    id: string;
    field: string;
    oldValue?: string | null;
    newValue?: string | null;
    createdAt: Date;
    author: { name: string; avatarUrl?: string | null };
  }[];
};

export function IssueDetail({
  issue,
  currentUserId,
  isAdmin = false,
}: {
  issue: IssueDetailData;
  currentUserId?: string;
  isAdmin?: boolean;
}) {
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [priority, setPriority] = useState<IssuePriority>(issue.priority);
  const [description, setDescription] = useState(issue.description ?? "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "history">("comments");

  const canEditStatus = isAdmin || (currentUserId && issue.assignee?.id === currentUserId);

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!canEditStatus) return;
    setStatus(newStatus);
    await updateIssueFieldAction(issue.id, "status", newStatus);
  };

  const handlePriorityChange = async (newPriority: IssuePriority) => {
    setPriority(newPriority);
    await updateIssueFieldAction(issue.id, "priority", newPriority);
  };

  const handleSaveDescription = async () => {
    await updateIssueFieldAction(issue.id, "description", description);
    setIsEditingDesc(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    await postCommentAction(issue.id, commentText);
    setCommentText("");
    setIsSubmittingComment(false);
  };

  const [isWatching, setIsWatching] = useState(false);

  const handleToggleWatch = async () => {
    const res = await toggleWatcherAction(issue.id);
    if (res.isWatching !== undefined) setIsWatching(res.isWatching);
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-text-subtle">
          <TypeIcon type={issue.type} />
          <Link href={`/projects/${issue.project.key}`} className="hover:underline">
            {issue.project.name}
          </Link>
          <span>/</span>
          <span className="font-mono font-semibold text-text">{issue.key}</span>
        </div>

        <Button
          appearance="subtle"
          onClick={handleToggleWatch}
          className={`h-7 text-xs ${isWatching ? "bg-selected text-selected-text" : ""}`}
        >
          <Eye size={14} /> {isWatching ? "Watching" : "Watch"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Main Info & Activity */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Summary */}
          <h1 className="text-2xl font-bold text-text">{issue.summary}</h1>

          {/* Description Section */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-text">Description</h3>
            {isEditingDesc ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-ds border-2 border-brand bg-surface p-3 text-sm outline-none"
                  placeholder="Add a description..."
                />
                <div className="flex gap-2">
                  <Button appearance="primary" onClick={handleSaveDescription}>
                    Save
                  </Button>
                  <Button appearance="subtle" onClick={() => setIsEditingDesc(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingDesc(true)}
                className="cursor-pointer min-h-16 rounded-ds border border-transparent p-2 hover:border-border-default hover:bg-neutral text-sm text-default"
              >
                {description ? (
                  <p className="whitespace-pre-wrap">{description}</p>
                ) : (
                  <span className="text-text-subtle italic">Add a description...</span>
                )}
              </div>
            )}
          </div>

          {/* Activity Section Tabs */}
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex border-b border-border text-sm font-semibold text-text-subtle">
              <button
                onClick={() => setActiveTab("comments")}
                className={`px-3 pb-2 ${activeTab === "comments" ? "border-b-2 border-brand text-brand" : ""}`}
              >
                Comments ({issue.comments.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`px-3 pb-2 ${activeTab === "history" ? "border-b-2 border-brand text-brand" : ""}`}
              >
                History ({issue.history.length})
              </button>
            </div>

            {/* Tab: Comments */}
            {activeTab === "comments" && (
              <div className="flex flex-col gap-4">
                <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    className="rounded-ds border-2 border-border bg-surface p-2 text-sm outline-none focus:border-brand"
                  />
                  <div className="flex justify-end">
                    <Button appearance="primary" type="submit" disabled={isSubmittingComment || !commentText.trim()}>
                      {isSubmittingComment ? "Posting..." : "Save"}
                    </Button>
                  </div>
                </form>

                <div className="flex flex-col gap-3">
                  {issue.comments.map((c) => (
                    <div key={c.id} className="flex gap-3 border-b border-border/50 pb-3">
                      <Avatar name={c.author.name} src={c.author.avatarUrl} size={28} />
                      <div className="flex flex-col text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text">{c.author.name}</span>
                          <span className="text-xs text-text-subtle">
                            {new Date(c.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-1 text-text whitespace-pre-wrap">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: History */}
            {activeTab === "history" && (
              <div className="flex flex-col gap-2">
                {issue.history.length === 0 ? (
                  <p className="text-sm text-text-subtle italic">No field history recorded yet.</p>
                ) : (
                  issue.history.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs text-text-subtle py-1 border-b border-border/40">
                      <Avatar name={h.author.name} src={h.author.avatarUrl} size={20} />
                      <span className="font-medium text-text">{h.author.name}</span>
                      <span>updated</span>
                      <span className="font-semibold text-text">{h.field}</span>
                      <span>from</span>
                      <span className="font-mono bg-neutral px-1 rounded-ds text-default">{h.oldValue ?? "none"}</span>
                      <span>to</span>
                      <span className="font-mono bg-selected text-selected-text px-1 rounded-ds">{h.newValue ?? "none"}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Metadata Attributes */}
        <div className="flex flex-col gap-4 rounded-ds border border-border bg-surface p-4 h-fit">
          {/* Status Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-subtle uppercase">Status</label>
            <select
              disabled={!canEditStatus}
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
              title={canEditStatus ? "Change status" : "Status changes restricted to Assignee or Admin"}
              className={`h-8 rounded-ds border border-border bg-surface px-2 text-xs font-semibold outline-none focus:border-brand ${
                !canEditStatus ? "cursor-not-allowed opacity-60" : ""
              }`}
            >
              <option value="TO_DO">TO DO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="DONE">DONE</option>
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-subtle uppercase">Priority</label>
            <div className="flex items-center gap-2">
              <PriorityIcon priority={priority} />
              <select
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value as IssuePriority)}
                className="h-8 flex-1 rounded-ds border border-border bg-surface px-2 text-xs font-semibold outline-none focus:border-brand"
              >
                <option value="HIGHEST">Highest</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="LOWEST">Lowest</option>
              </select>
            </div>
          </div>

          <div className="border-t border-border my-1" />

          {/* Assignee */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-subtle uppercase">Assignee</label>
            <div className="flex items-center gap-2 text-sm">
              <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={24} />
              <span>{issue.assignee?.name ?? "Unassigned"}</span>
            </div>
          </div>

          {/* Reporter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-subtle uppercase">Reporter</label>
            <div className="flex items-center gap-2 text-sm">
              <Avatar name={issue.reporter.name} src={issue.reporter.avatarUrl} size={24} />
              <span>{issue.reporter.name}</span>
            </div>
          </div>

          {/* Story Points */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-subtle uppercase">Story Points</label>
            <span className="font-mono text-sm font-semibold">{issue.storyPoints ?? "-"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
