"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  Share2,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  RefreshCw,
  Zap,
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  User,
  Calendar,
  Tag as TagIcon,
  Users,
  Award,
  Clock,
  Layers,
  ArrowLeft,
  Edit2,
  Check,
  X,
  FileText,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Tag as StatusTag } from "@/components/ui/Tag";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { Button } from "@/components/ui/Button";
import {
  SubtasksChecklist,
  AttachmentsDropzone,
  LinkedWorkItems,
  ActivitySection,
} from "@/components/issues/TaskWorkspaceComponents";
import { TimeLogModal } from "@/components/issues/TimeLogModal";
import {
  updateIssueFieldAction,
  postCommentAction,
  logWorkAction,
  deleteWorkLogAction,
  toggleWatcherAction,
} from "@/app/(app)/projects/[key]/issues/actions";
import type { IssueStatus, IssueType, IssuePriority } from "@prisma/client";

// Dynamic initials generator
function getInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

const userColorPalette = [
  "bg-blue-600 border-blue-700 text-white",
  "bg-sky-600 border-sky-700 text-white",
  "bg-slate-800 border-slate-900 text-white",
  "bg-indigo-900 border-indigo-950 text-white",
  "bg-amber-600 border-amber-700 text-white",
  "bg-teal-600 border-teal-700 text-white",
];

function getUserColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % userColorPalette.length;
  return userColorPalette[idx];
}

// <input type="date"> needs a bare YYYY-MM-DD value, never an ISO timestamp.
function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export function IssueDetail({
  issue,
  currentUserId,
  isAdmin = false,
  members = [],
  sprints = [],
  automationRules = [],
}: {
  issue: any;
  currentUserId: string;
  isAdmin?: boolean;
  members?: { id: string; name: string; email?: string | null; avatarUrl?: string | null }[];
  sprints?: { id: string; name: string; status: string }[];
  automationRules?: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Primary Editable State
  const [title, setTitle] = useState<string>(issue.summary || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState<string>(issue.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const [status, setStatus] = useState<IssueStatus>(issue.status || "TO_DO");
  const [priority, setPriority] = useState<IssuePriority>(issue.priority || "MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>(issue.assigneeId || "");
  const [storyPoints, setStoryPoints] = useState<number | null>(issue.storyPoints ?? null);
  const [sprintId, setSprintId] = useState<string>(issue.sprintId || "");
  const [startDate, setStartDate] = useState<string>(toDateInput(issue.startDate));
  const [dueDate, setDueDate] = useState<string>(toDateInput(issue.dueDate));
  const [labels, setLabels] = useState<string[]>(issue.labels || []);
  const [labelDraft, setLabelDraft] = useState("");

  const watcherIds: string[] = (issue.watchers || []).map((w: any) => w.userId);
  const [watchers, setWatchers] = useState(watcherIds.length);
  const [isWatching, setIsWatching] = useState(watcherIds.includes(currentUserId));

  // Accordion Section States
  const [showDetails, setShowDetails] = useState(true);
  const [showDev, setShowDev] = useState(true);
  const [showAutomation, setShowAutomation] = useState(true);

  // Modal / Toast States
  const [showTimeLog, setShowTimeLog] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Work log is server-owned: derive everything from the issue payload so the
  // numbers stay correct after router.refresh() revalidates the page.
  const workLogs: any[] = issue.workLogs || [];
  const loggedHours = workLogs.reduce((sum, w) => sum + Number(w.hours || 0), 0);
  const estimatedHours = issue.originalEstimate ?? (issue.storyPoints ? issue.storyPoints * 1.5 : 8);

  // Quick Action Handlers
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveTitle = async () => {
    if (!title.trim()) return;
    setIsEditingTitle(false);
    showToast("Task title updated!");
    await updateIssueFieldAction(issue.id, "summary", title.trim());
  };

  const handleSaveDesc = async () => {
    setIsEditingDesc(false);
    showToast("Description updated!");
    await updateIssueFieldAction(issue.id, "description", description.trim());
  };

  const handleStatusChange = (newStatus: IssueStatus) => {
    setStatus(newStatus);
    showToast(`Status updated to ${newStatus.replace("_", " ")}`);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "status", newStatus);
    });
  };

  const handlePriorityChange = (newPriority: IssuePriority) => {
    setPriority(newPriority);
    showToast(`Priority updated to ${newPriority}`);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "priority", newPriority);
    });
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!");
    }
  };

  const toggleWatch = () => {
    // Optimistic, then reconciled with whatever the server reports.
    const next = !isWatching;
    setIsWatching(next);
    setWatchers((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));

    startTransition(async () => {
      const res = await toggleWatcherAction(issue.id);
      if (res?.error) {
        setIsWatching(!next);
        setWatchers((prev) => (next ? Math.max(0, prev - 1) : prev + 1));
        showToast(res.error);
        return;
      }
      showToast(next ? "Watching ticket updates" : "Stopped watching ticket");
      router.refresh();
    });
  };

  // Every sidebar field goes through here so state, toast, persistence and
  // revalidation stay in lockstep instead of drifting per-field.
  const persistField = (
    field: Parameters<typeof updateIssueFieldAction>[1],
    value: string,
    successMessage: string
  ) => {
    startTransition(async () => {
      const res = await updateIssueFieldAction(issue.id, field, value);
      if (res?.error) {
        showToast(res.error);
        return;
      }
      showToast(successMessage);
      router.refresh();
    });
  };

  const handleAssigneeChange = (newAssigneeId: string) => {
    setAssigneeId(newAssigneeId);
    const name = members.find((m) => m.id === newAssigneeId)?.name;
    persistField("assigneeId", newAssigneeId, name ? `Assigned to ${name}` : "Set to Unassigned");
  };

  const handleStoryPointsChange = (value: string) => {
    setStoryPoints(value ? Number(value) : null);
    persistField("storyPoints", value, value ? `Story points set to ${value}` : "Story points cleared");
  };

  const handleSprintChange = (newSprintId: string) => {
    setSprintId(newSprintId);
    const name = sprints.find((s) => s.id === newSprintId)?.name;
    persistField("sprintId", newSprintId, name ? `Moved to ${name}` : "Removed from sprint");
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    persistField("startDate", value, value ? "Start date updated" : "Start date cleared");
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    persistField("dueDate", value, value ? "Due date updated" : "Due date cleared");
  };

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const label = labelDraft.trim();
    if (!label || labels.includes(label)) {
      setLabelDraft("");
      return;
    }
    const next = [...labels, label];
    setLabels(next);
    setLabelDraft("");
    persistField("labels", next.join(","), `Added label “${label}”`);
  };

  const handleRemoveLabel = (label: string) => {
    const next = labels.filter((l) => l !== label);
    setLabels(next);
    persistField("labels", next.join(","), `Removed label “${label}”`);
  };

  const handleAddComment = (text: string) => {
    startTransition(async () => {
      await postCommentAction(issue.id, text);
      showToast("Comment posted!");
    });
  };

  // Returns an error message on failure, null on success, so the modal can
  // surface the problem instead of silently closing.
  const handleLogWork = async (hours: number, description: string, startedAt: string) => {
    const res = await logWorkAction(issue.id, hours, description, startedAt);
    if (res?.error) return res.error;
    showToast(`Logged ${hours}h on ${issue.key}`);
    router.refresh();
    return null;
  };

  const handleDeleteWorkLog = (workLogId: string) => {
    startTransition(async () => {
      const res = await deleteWorkLogAction(workLogId);
      if (res?.error) {
        showToast(res.error);
        return;
      }
      showToast("Work log deleted");
      router.refresh();
    });
  };

  // Conventional branch name derived from the ticket, e.g. "feature/DEMO-1-set-up-repo".
  const suggestedBranch = `feature/${issue.key}-${(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)}`;

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-in fade-in duration-200 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Time Tracking Modal */}
      {showTimeLog && (
        <TimeLogModal
          isOpen={showTimeLog}
          onClose={() => setShowTimeLog(false)}
          issueKey={issue.key}
          issueSummary={title}
          currentLoggedHours={loggedHours}
          estimatedHours={estimatedHours}
          onLogTime={handleLogWork}
        />
      )}

      {/* 1. Breadcrumbs & Top Bar Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-3">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-2 text-xs font-semibold text-text-subtle">
          <Link href="/projects" className="hover:text-text transition-colors">Spaces</Link>
          <span>/</span>
          <Link href={`/projects/${issue.project?.key || "project"}`} className="hover:text-text transition-colors flex items-center gap-1">
            <span className="font-bold text-text">{issue.project?.name || "Project"}</span>
          </Link>
          <span>/</span>
          <span className="flex items-center gap-1 text-text font-bold">
            <TypeIcon type={issue.type || "TASK"} size={14} />
            <span>{issue.key}</span>
          </span>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWatch}
            className={`flex h-8 items-center gap-1.5 rounded border px-3 text-xs font-semibold transition-colors ${
              isWatching ? "border-brand/40 bg-brand/10 text-brand" : "border-border bg-surface text-text hover:bg-neutral"
            }`}
            title="Watch this task for updates"
          >
            <Eye size={13} />
            <span>{watchers}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex h-8 items-center gap-1.5 rounded border border-border bg-surface px-3 text-xs font-semibold text-text hover:bg-neutral transition-colors"
            title="Share ticket link"
          >
            <Share2 size={13} /> Share
          </button>

          <button
            onClick={() => showToast("More options menu opened")}
            className="flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-text-subtle hover:bg-neutral transition-colors"
            title="More actions"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* 2. Main Master-Detail Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Main Task Canvas (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Task Title (Inline Editable) */}
          <div className="flex flex-col gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 text-2xl font-extrabold text-text bg-background border border-brand rounded px-3 py-1 outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                />
                <Button appearance="primary" onClick={handleSaveTitle} className="bg-brand text-white text-xs">
                  <Check size={14} />
                </Button>
                <Button appearance="subtle" onClick={() => setIsEditingTitle(false)}>
                  <X size={14} />
                </Button>
              </div>
            ) : (
              <div className="group flex items-start justify-between gap-3 cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text leading-tight group-hover:text-brand transition-colors">
                  {title}
                </h1>
                <button className="opacity-0 group-hover:opacity-100 p-1 text-text-subtle hover:text-text transition-opacity" title="Edit title">
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Task Description & Work Summary Section */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <FileText size={16} className="text-brand" /> Description & Work Summary
              </h3>
              {!isEditingDesc && (
                <button
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}
            </div>

            {isEditingDesc ? (
              <div className="flex flex-col gap-3">
                <textarea
                  rows={8}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-brand bg-background p-3 text-xs outline-none font-mono leading-relaxed"
                />
                <div className="flex justify-end gap-2">
                  <Button appearance="subtle" onClick={() => setIsEditingDesc(false)} className="text-xs">
                    Cancel
                  </Button>
                  <Button appearance="primary" onClick={handleSaveDesc} className="bg-brand text-white text-xs font-bold">
                    Save Description
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-text leading-relaxed whitespace-pre-wrap font-sans space-y-2">
                {description.split("\n\n").map((chunk, idx) => {
                  if (chunk.startsWith("Date:")) {
                    const lines = chunk.split("\n");
                    return (
                      <div key={idx} className="p-3 rounded-md bg-neutral/30 border border-border/60 mb-2">
                        <span className="font-bold text-text block mb-1.5">{lines[0]}</span>
                        <div className="pl-2 space-y-1 text-text-subtle">
                          {lines.slice(1).map((l, i) => (
                            <p key={i}>{l}</p>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return <p key={idx}>{chunk}</p>;
                })}
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <SubtasksChecklist
            issueId={issue.id}
            projectKey={issue.project?.key}
            items={issue.subtasks || []}
          />

          {/* Attachments Section */}
          <AttachmentsDropzone
            issueId={issue.id}
            attachments={issue.attachments || []}
            currentUserId={currentUserId}
          />

          {/* Linked Work Items Section */}
          <LinkedWorkItems
            issueId={issue.id}
            projectKey={issue.project?.key || "DEMO"}
            links={issue.linksOut || []}
          />

          {/* Activity Section (Comments, History, Work Log) */}
          <ActivitySection
            comments={issue.comments || []}
            history={issue.history || []}
            workLogs={workLogs}
            loggedHours={loggedHours}
            estimatedHours={estimatedHours}
            currentUserId={currentUserId}
            onAddComment={handleAddComment}
            onLogWork={() => setShowTimeLog(true)}
            onDeleteWorkLog={handleDeleteWorkLog}
          />

          {/* Timestamps Footer */}
          <div className="flex items-center justify-between text-[11px] text-text-subtle pt-3 border-t border-border">
            <span>Created: {new Date(issue.createdAt || Date.now()).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span>Updated: {new Date(issue.updatedAt || Date.now()).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Metadata & Workflow Sidebar (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="lg:sticky lg:top-4 flex flex-col gap-4">
            {/* Primary Workflow Header Controls */}
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">Workflow Status</span>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
                  className="h-8 rounded border border-border bg-neutral px-3 text-xs font-bold text-text outline-none cursor-pointer hover:bg-neutral-hovered transition-colors"
                >
                  <option value="TO_DO">Idea / To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle">Priority</span>
                <div className="flex items-center gap-1.5">
                  <PriorityIcon priority={priority} size={14} />
                  <select
                    value={priority}
                    onChange={(e) => handlePriorityChange(e.target.value as IssuePriority)}
                    className="h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text outline-none cursor-pointer"
                  >
                    <option value="HIGHEST">Highest</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Accordion 1: Details Panel */}
            <div className="rounded-lg border border-border bg-surface shadow-xs overflow-hidden">
              <button
                onClick={() => setShowDetails((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-text border-b border-border bg-neutral/30 hover:bg-neutral/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Layers size={14} className="text-brand" /> Details
                </span>
                {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDetails && (
                <div className="p-4 flex flex-col gap-3.5 text-xs">
                  {/* Assignee */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <User size={13} /> Assignee
                    </span>
                    <select
                      value={assigneeId}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      className="h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text outline-none"
                    >
                      <option value="">Unassigned</option>
                      {members.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reporter */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <User size={13} /> Reporter
                    </span>
                    {issue.reporter ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={issue.reporter.name} src={issue.reporter.avatarUrl} size={20} />
                        <span className="font-bold text-text">{issue.reporter.name}</span>
                      </div>
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )}
                  </div>

                  {/* Parent */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Layers size={13} /> Parent
                    </span>
                    {issue.parent ? (
                      <Link
                        href={`/projects/${issue.project?.key}/issues/${issue.parent.key}`}
                        className="font-bold text-brand hover:underline"
                      >
                        {issue.parent.key}
                      </Link>
                    ) : (
                      <span className="text-text-subtle">None</span>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Calendar size={13} /> Due date
                    </span>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      className="h-6 rounded border border-border bg-surface px-1.5 text-xs text-text outline-none"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Calendar size={13} /> Start date
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="h-6 rounded border border-border bg-surface px-1.5 text-xs text-text outline-none"
                    />
                  </div>

                  {/* Labels */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <TagIcon size={13} /> Labels
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {labels.length === 0 && <span className="text-text-subtle">None</span>}
                      {labels.map((l) => (
                        <span
                          key={l}
                          className="group flex items-center gap-1 px-2 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold"
                        >
                          {l}
                          <button
                            type="button"
                            onClick={() => handleRemoveLabel(l)}
                            title={`Remove ${l}`}
                            className="opacity-60 hover:opacity-100"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <form onSubmit={handleAddLabel}>
                      <input
                        type="text"
                        value={labelDraft}
                        onChange={(e) => setLabelDraft(e.target.value)}
                        placeholder="+ Add label (press Enter)"
                        className="w-full h-6 rounded border border-border bg-surface px-1.5 text-[11px] text-text outline-none focus:border-brand"
                      />
                    </form>
                  </div>

                  {/* Sprint */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Award size={13} /> Sprint
                    </span>
                    <select
                      value={sprintId}
                      onChange={(e) => handleSprintChange(e.target.value)}
                      className="h-6 rounded border border-border bg-surface px-2 text-xs font-bold text-text outline-none"
                    >
                      <option value="">Backlog</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.status === "ACTIVE" ? " (Active)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Story Points */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Award size={13} /> Story Points
                    </span>
                    <select
                      value={storyPoints ?? ""}
                      onChange={(e) => handleStoryPointsChange(e.target.value)}
                      className="h-6 rounded border border-border bg-surface px-2 text-xs font-bold text-text outline-none"
                    >
                      <option value="">—</option>
                      <option value={1}>1 pt</option>
                      <option value={2}>2 pts</option>
                      <option value={3}>3 pts</option>
                      <option value={5}>5 pts</option>
                      <option value={8}>8 pts</option>
                    </select>
                  </div>

                  {/* Time Tracking Progress Bar */}
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
                      onClick={() => setShowTimeLog(true)}
                      className="text-right text-[11px] font-bold text-brand hover:underline cursor-pointer pt-0.5"
                    >
                      + Log work
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 2: Development Panel */}
            <div className="rounded-lg border border-border bg-surface shadow-xs overflow-hidden">
              <button
                onClick={() => setShowDev((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-text border-b border-border bg-neutral/30 hover:bg-neutral/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <GitBranch size={14} className="text-brand" /> Development
                </span>
                {showDev ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showDev && (
                <div className="p-4 flex flex-col gap-2 text-xs">
                  {/* No VCS provider is connected yet, so show the suggested
                      branch name rather than inventing commits and PRs. */}
                  <p className="text-text-subtle">
                    No source control provider is connected to this project.
                  </p>
                  <div className="flex items-center justify-between p-2 rounded bg-neutral/30 border border-border/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch size={14} className="text-brand shrink-0" />
                      <span className="font-mono font-bold text-text text-[11px] truncate">
                        {suggestedBranch}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(suggestedBranch);
                        showToast("Branch name copied");
                      }}
                      className="text-[10px] font-bold text-brand hover:underline shrink-0 ml-2"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 3: Automation Panel */}
            <div className="rounded-lg border border-border bg-surface shadow-xs overflow-hidden">
              <button
                onClick={() => setShowAutomation((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-text border-b border-border bg-neutral/30 hover:bg-neutral/60 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Zap size={14} className="text-brand" /> Automation
                </span>
                {showAutomation ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAutomation && (
                <div className="p-4 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text">Project rules</span>
                    <button
                      onClick={() => {
                        router.refresh();
                        showToast("Automation rules refreshed");
                      }}
                      className="text-text-subtle hover:text-brand flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </div>

                  {automationRules.length === 0 ? (
                    <p className="text-text-subtle italic">No automation rules for this project yet.</p>
                  ) : (
                    automationRules.map((r) => (
                      <div
                        key={r.id}
                        className="p-2.5 rounded bg-neutral/30 border border-border/60 text-[11px] text-text-subtle flex flex-col gap-1"
                      >
                        <span className="font-bold text-text">{r.name}</span>
                        <span>
                          {String(r.trigger).replace(/_/g, " ").toLowerCase()} •{" "}
                          {r.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                    ))
                  )}

                  <Link
                    href="/settings/automation"
                    className="w-full py-2 rounded border border-brand/40 bg-brand/5 text-brand text-xs font-bold hover:bg-brand/10 transition-colors text-center"
                  >
                    Manage automation rules
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
