"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  X,
  User,
  Clock,
  Trash2,
  Share2,
  Tag,
  MessageSquare,
  Plus,
  Send,
  ExternalLink,
  Calendar,
  History as HistoryIcon,
  Award,
  CheckCircle2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TimeLogModal } from "@/components/issues/TimeLogModal";
import {
  updateIssueFieldAction,
  deleteIssueAction,
  logWorkAction,
  postCommentAction,
} from "@/app/(app)/projects/[key]/issues/actions";
import type { BoardIssue, BoardUserOption } from "./IssueCard";
import type { IssueStatus, IssuePriority, IssueType } from "@prisma/client";
import {
  ISSUE_TYPES as issueTypes,
  PRIORITY_CONFIG as priorityIcons,
  ISSUE_STATUSES as statuses,
} from "@/lib/issues-config";

function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

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

  const [points, setPoints] = useState<number | string>("");
  const [estimateHours, setEstimateHours] = useState<number | string>("");
  const [reporterId, setReporterId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"comments" | "history" | "worklog">("comments");
  const [commentInput, setCommentInput] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [workLogsList, setWorkLogsList] = useState<any[]>([]);
  const [loggedHours, setLoggedHours] = useState<number>(0);

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (issue) {
      setSummary(issue.summary);
      setDescription(issue.description || "");
      setPoints(issue.storyPoints ?? "");
      setEstimateHours(issue.estimatedHours ?? issue.originalEstimate ?? "");
      setReporterId(issue.reporterId || issue.reporter?.id || "");
      setStartDate(toDateInput(issue.startDate));
      setDueDate(toDateInput(issue.dueDate));
      setLabels(issue.labels || []);
      setIsEditingSummary(false);
      setIsEditingDescription(false);
      setCommentInput("");

      const logs = issue.workLogs || [];
      setWorkLogsList(logs);
      setCommentsList(issue.comments || []);
      setHistoryList(issue.history || []);
      const totalLogged = issue.loggedHours ?? logs.reduce((sum, w) => sum + Number(w.hours || 0), 0);
      setLoggedHours(totalLogged);
    }
  }, [issue]);

  if (!issue) return null;

  const currentType = issueTypes.find((t) => t.value === issue.type) || issueTypes[1];
  const currentPriority = priorityIcons[issue.priority] || priorityIcons.MEDIUM;
  const currentStatus = statuses.find((s) => s.value === issue.status) || statuses[0];
  const estimatedHours = typeof estimateHours === "number" ? estimateHours : (parseFloat(String(estimateHours)) || 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    const updated = {
      ...issue,
      assignee: selectedUser ? { id: selectedUser.id, name: selectedUser.name, avatarUrl: selectedUser.avatarUrl } : null,
    };
    onUpdateIssue(updated);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "assigneeId", assigneeId || "");
    });
  };

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

  const handleEstimateBlur = () => {
    const num = estimateHours === "" ? null : Number(estimateHours);
    if (num !== (issue.estimatedHours ?? issue.originalEstimate)) {
      const updated = { ...issue, originalEstimate: num, estimatedHours: num ?? 0 };
      onUpdateIssue(updated);
      startTransition(async () => {
        await updateIssueFieldAction(issue.id, "originalEstimate", num);
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

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this issue?")) {
      onDeleteIssue(issue.id);
      onClose();
      startTransition(async () => {
        await deleteIssueAction(issue.id);
      });
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    const text = commentInput.trim();
    const newComm = {
      id: `c-${Date.now()}`,
      body: text,
      createdAt: new Date().toISOString(),
      author: { name: "You", avatarUrl: null },
    };
    setCommentsList((prev) => [newComm, ...prev]);
    setCommentInput("");

    startTransition(async () => {
      await postCommentAction(issue.id, text);
    });
  };

  const handleChipClick = (chip: string) => {
    setCommentInput((prev) => (prev ? `${prev} ${chip}` : chip));
  };

  const actionChips = ["Approved 👍", "Please review 🔍", "Needs info ❓", "In progress 🚀"];

  return (
    <>
      {/* Time Logging Modal */}
      {showTimeModal && (
        <TimeLogModal
          isOpen={showTimeModal}
          onClose={() => setShowTimeModal(false)}
          issueKey={issue.key}
          issueSummary={summary}
          currentLoggedHours={loggedHours}
          estimatedHours={estimatedHours}
          onLogTime={async (hours, desc, startedAt) => {
            const res = await logWorkAction(issue.id, hours, desc, startedAt);
            if (res?.error) return res.error;
            const newLogged = loggedHours + hours;
            setLoggedHours(newLogged);
            if (res.log) {
              setWorkLogsList((prev) => [res.log, ...prev]);
            }
            onUpdateIssue({ ...issue, loggedHours: newLogged });
            return null;
          }}
          onUpdateEstimate={async (h) => {
            setEstimateHours(h);
            onUpdateIssue({ ...issue, originalEstimate: h, estimatedHours: h });
            await updateIssueFieldAction(issue.id, "originalEstimate", h);
          }}
        />
      )}

      {/* Main Drawer Overlay */}
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
        <div className="relative w-full max-w-2xl bg-surface border-l border-border h-full shadow-2xl flex flex-col overflow-hidden animate-slide-in-right">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute top-16 left-6 z-50 rounded-lg bg-text text-surface px-3 py-2 text-xs font-semibold shadow-lg">
              {toastMessage}
            </div>
          )}

          {/* Top Action Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-subtle">
              <span className={`p-1 rounded ${currentType.color}`}>{currentType.icon}</span>
              <span className="font-mono text-text font-bold">{issue.key}</span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${issue.projectKey}/issues/${issue.key}`}
                target="_blank"
                rel="noreferrer"
                title="Open in full ticket page"
                className="p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors flex items-center gap-1 text-xs"
              >
                <ExternalLink size={15} />
                <span className="hidden sm:inline font-semibold">Open</span>
              </Link>

              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(`${window.location.origin}/projects/${issue.projectKey}/issues/${issue.key}`);
                    showToast("Copied issue link to clipboard!");
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
                      <span className="text-text-subtle text-xs italic">Add a detailed description…</span>
                    )}
                  </div>
                )}
              </div>

              {/* Activity Section (Comments, History, Work Log) */}
              <div className="flex flex-col gap-4 pt-4 border-t border-border">
                {/* Tabs Header */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex gap-4 text-xs font-bold text-text-subtle">
                    <button
                      onClick={() => setActiveTab("comments")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        activeTab === "comments" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <MessageSquare size={14} /> Comments ({commentsList.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("history")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        activeTab === "history" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <HistoryIcon size={14} /> History ({historyList.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("worklog")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        activeTab === "worklog" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <Clock size={14} /> Work Log ({workLogsList.length})
                    </button>
                  </div>
                </div>

                {/* Tab 1: Comments */}
                {activeTab === "comments" && (
                  <div className="flex flex-col gap-4">
                    {/* Comment Form */}
                    <form onSubmit={handlePostComment} className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-neutral/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name="You" size={24} />
                        <span className="text-xs font-bold text-text">Add a comment...</span>
                      </div>

                      <textarea
                        rows={3}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Type your comment or update..."
                        className="w-full rounded border border-border bg-surface p-2.5 text-xs outline-none focus:border-brand"
                      />

                      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-text-subtle uppercase mr-1">Quick reply:</span>
                          {actionChips.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => handleChipClick(chip)}
                              className="px-2 py-0.5 rounded-full bg-surface border border-border text-[11px] font-semibold text-text-subtle hover:text-brand hover:border-brand transition-colors"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                        <Button appearance="primary" type="submit" className="bg-brand text-white text-xs font-bold flex items-center gap-1.5">
                          <Send size={12} /> Save
                        </Button>
                      </div>
                    </form>

                    {/* Comments Feed */}
                    <div className="flex flex-col gap-3 divide-y divide-border/60">
                      {commentsList.length === 0 ? (
                        <p className="text-xs text-text-subtle italic py-2">No comments yet.</p>
                      ) : (
                        commentsList.map((c) => (
                          <div key={c.id} className="pt-3 flex items-start gap-3">
                            <Avatar name={c.author?.name || c.author || "User"} src={c.author?.avatarUrl} size={28} />
                            <div className="flex-1 text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-text">{c.author?.name || c.author || "User"}</span>
                                <span className="text-[11px] text-text-subtle">
                                  {typeof c.createdAt === "string" ? c.createdAt : "Recently"}
                                </span>
                              </div>
                              <p className="text-text whitespace-pre-wrap leading-relaxed">{c.body || c.text}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: History */}
                {activeTab === "history" && (
                  <div className="flex flex-col gap-2 divide-y divide-border/40">
                    {historyList.length === 0 ? (
                      <p className="text-xs text-text-subtle italic py-2">No history recorded yet.</p>
                    ) : (
                      historyList.map((h) => (
                        <div key={h.id} className="py-2 flex items-center gap-2 text-xs text-text-subtle">
                          <Avatar name={h.author?.name || "User"} src={h.author?.avatarUrl} size={20} />
                          <span className="font-bold text-text">{h.author?.name || "User"}</span>
                          <span>updated</span>
                          <span className="font-semibold text-text">{h.field}</span>
                          {h.oldValue && (
                            <span>
                              from <strong className="font-mono bg-neutral px-1.5 rounded text-text">{h.oldValue}</strong>
                            </span>
                          )}
                          {h.newValue && (
                            <span>
                              to <strong className="font-mono bg-selected text-selected-text px-1.5 rounded">{h.newValue}</strong>
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Tab 3: Work Log */}
                {activeTab === "worklog" && (
                  <div className="flex flex-col gap-3">
                    <div className="p-3 rounded-md bg-neutral/30 border border-border flex items-center justify-between text-xs font-semibold">
                      <span>
                        Total Logged Time:{" "}
                        <strong className="text-brand font-bold">{loggedHours.toFixed(1)} hours</strong>
                      </span>
                      <span>
                        Original Estimate:{" "}
                        <strong className="text-text font-bold">
                          {estimatedHours > 0 ? `${estimatedHours.toFixed(1)} hours` : "Not set"}
                        </strong>
                      </span>
                    </div>

                    <div>
                      <Button
                        appearance="primary"
                        type="button"
                        onClick={() => setShowTimeModal(true)}
                        className="bg-brand text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Plus size={12} /> Log work
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2 divide-y divide-border/40">
                      {workLogsList.length === 0 ? (
                        <p className="text-xs text-text-subtle italic py-2">No work logged yet.</p>
                      ) : (
                        workLogsList.map((w) => (
                          <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Avatar name={w.author?.name || "User"} src={w.author?.avatarUrl} size={24} />
                              <div>
                                <p className="font-bold text-text">{w.author?.name || "User"}</p>
                                {w.description && <p className="text-text-subtle text-[11px]">{w.description}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-brand">{Number(w.hours).toFixed(1)}h</span>
                              <p className="text-[10px] text-text-subtle">
                                {typeof w.startedAt === "string" ? w.startedAt.split("T")[0] : "Logged"}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
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

              {/* Estimated Time (hours) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Estimated Time (hours)</label>
                <input
                  type="number"
                  value={estimateHours}
                  onChange={(e) => setEstimateHours(e.target.value === "" ? "" : Number(e.target.value))}
                  onBlur={handleEstimateBlur}
                  placeholder="None"
                  min={0}
                  step={0.5}
                  className="h-9 px-3 text-xs font-mono font-bold rounded-lg border border-border bg-surface text-text outline-none focus:border-brand"
                />
              </div>

              {/* Time Tracking Progress Indicator */}
              <div className="pt-2 border-t border-border/50 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-text-subtle font-medium flex items-center gap-1">
                    <Clock size={12} /> Time Logged
                  </span>
                  <span className="font-bold text-text">
                    {loggedHours.toFixed(1)}h / {estimatedHours.toFixed(1)}h
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden">
                  <div
                    style={{
                      width: `${estimatedHours > 0 ? Math.min(100, Math.round((loggedHours / estimatedHours) * 100)) : 0}%`,
                    }}
                    className="h-full bg-brand transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowTimeModal(true)}
                  className="text-right text-[11px] font-bold text-brand hover:underline cursor-pointer pt-0.5"
                >
                  + Log work
                </button>
              </div>

              {/* Start Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none focus:border-brand cursor-pointer"
                />
              </div>

              {/* Due Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="h-9 px-3 text-xs font-medium rounded-lg border border-border bg-surface text-text outline-none focus:border-brand cursor-pointer"
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
                    className="flex-1 h-7 px-2 text-[11px] rounded border border-border bg-surface text-text outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="h-7 px-2 bg-neutral hover:bg-neutral/80 text-text font-bold text-[11px] rounded"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
