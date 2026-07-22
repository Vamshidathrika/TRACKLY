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

export function IssueDetail({
  issue,
  currentUserId,
  isAdmin = false,
}: {
  issue: any;
  currentUserId: string;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Primary Editable State
  const [title, setTitle] = useState(issue.summary || "vbn jade posters and related work");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState<string>(
    issue.description ||
      `Date: 30th June 2026\n\nTasks:\n1. Designed a poster for Coordinators Intro\n2. Created a Google Form with brand aesthetics\n3. Designed and added a header poster for the Google Form\n\nDate: 1st July 2026\n\nTasks:\n1. Design and create a WhatsApp cover image poster\n2. Design and create a cover poster for Google Form`
  );
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const [status, setStatus] = useState<IssueStatus>(issue.status || "IN_PROGRESS");
  const [priority, setPriority] = useState<IssuePriority>(issue.priority || "HIGH");
  const [assignee, setAssignee] = useState(issue.assignee || { id: "u-1", name: "Vamshi Krishna Dathrika" });
  const [storyPoints, setStoryPoints] = useState<number | null>(issue.storyPoints || 5);
  const [watchers, setWatchers] = useState(1);
  const [isWatching, setIsWatching] = useState(true);

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

  const handleStatusChange = async (newStatus: IssueStatus) => {
    setStatus(newStatus);
    showToast(`Status updated to ${newStatus.replace("_", " ")}`);
    await updateIssueFieldAction(issue.id, "status", newStatus);
  };

  const handlePriorityChange = async (newPriority: IssuePriority) => {
    setPriority(newPriority);
    showToast(`Priority updated to ${newPriority}`);
    await updateIssueFieldAction(issue.id, "priority", newPriority);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!");
    }
  };

  const toggleWatch = () => {
    setIsWatching((prev) => !prev);
    setWatchers((prev) => (isWatching ? prev - 1 : prev + 1));
    showToast(isWatching ? "Stopped watching ticket" : "Watching ticket updates");
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

  const availableUsers = [
    { id: "u-1", name: "Vamshi Krishna Dathrika" },
    { id: "u-2", name: "Vikram Dev" },
    { id: "u-3", name: "Nani Sharma" },
    { id: "u-4", name: "Neha Kumar" },
    { id: "u-5", name: "Swati Sen" },
  ];

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
          <Link href={`/projects/${issue.project?.key || "DEMO"}`} className="hover:text-text transition-colors flex items-center gap-1">
            <span className="font-bold text-text">{issue.project?.name || "Demo Software Project"}</span>
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
          <SubtasksChecklist />

          {/* Attachments Section */}
          <AttachmentsDropzone />

          {/* Linked Work Items Section */}
          <LinkedWorkItems projectKey={issue.project?.key || "DEMO"} />

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
                      value={assignee.name}
                      onChange={(e) => {
                        const u = availableUsers.find((x) => x.name === e.target.value);
                        if (u) {
                          setAssignee(u);
                          showToast(`Assigned to ${u.name}`);
                        }
                      }}
                      className="h-7 rounded border border-border bg-surface px-2 text-xs font-semibold text-text outline-none"
                    >
                      {availableUsers.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reporter */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <User size={13} /> Reporter
                    </span>
                    <div className="flex items-center gap-2">
                      <Avatar name={issue.reporter?.name || "Vamshi Krishna Dathrika"} size={20} />
                      <span className="font-bold text-text">{issue.reporter?.name || "Vamshi Krishna Dathrika"}</span>
                    </div>
                  </div>

                  {/* Parent Epic */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Layers size={13} /> Parent Epic
                    </span>
                    <span className="font-bold text-brand hover:underline cursor-pointer">
                      {issue.epic?.name || "WSM-100 (Idea)"}
                    </span>
                  </div>

                  {/* Due Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Calendar size={13} /> Due date
                    </span>
                    <input
                      type="date"
                      defaultValue="2026-07-30"
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
                      defaultValue="2026-06-30"
                      className="h-6 rounded border border-border bg-surface px-1.5 text-xs text-text outline-none"
                    />
                  </div>

                  {/* Labels */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <TagIcon size={13} /> Labels
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-brand/10 text-brand text-[10px] font-bold">posters</span>
                      <span className="px-2 py-0.5 rounded bg-neutral text-text-subtle text-[10px] font-bold">design</span>
                    </div>
                  </div>

                  {/* Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Users size={13} /> Team
                    </span>
                    <span className="font-bold text-text">Design Core</span>
                  </div>

                  {/* Sprint */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Award size={13} /> Sprint
                    </span>
                    <span className="font-bold text-brand bg-brand/10 px-2 py-0.5 rounded text-[11px]">
                      WSM Sprint 2 (Active)
                    </span>
                  </div>

                  {/* Story Points */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-subtle font-medium flex items-center gap-1.5">
                      <Award size={13} /> Story Points
                    </span>
                    <select
                      value={storyPoints || 5}
                      onChange={(e) => setStoryPoints(Number(e.target.value))}
                      className="h-6 rounded border border-border bg-surface px-2 text-xs font-bold text-text outline-none"
                    >
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
                <div className="p-4 flex flex-col gap-3 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-neutral/30 border border-border/60">
                    <div className="flex items-center gap-2">
                      <GitBranch size={14} className="text-brand" />
                      <span className="font-mono font-bold text-text text-[11px]">feature/wsm-157-posters</span>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Active</span>
                  </div>

                  <div className="flex items-center justify-between text-text-subtle">
                    <span className="flex items-center gap-1.5"><GitCommit size={13} /> Commits</span>
                    <span className="font-bold text-text">3 commits</span>
                  </div>

                  <div className="flex items-center justify-between text-text-subtle">
                    <span className="flex items-center gap-1.5"><GitPullRequest size={13} /> Pull Request</span>
                    <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                      #42 Merged
                    </span>
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
                    <span className="font-bold text-text">Recent rule runs</span>
                    <button
                      onClick={() => showToast("Automation rule status refreshed")}
                      className="text-text-subtle hover:text-brand flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <RefreshCw size={12} /> Refresh
                    </button>
                  </div>

                  <div className="p-2.5 rounded bg-neutral/30 border border-border/60 text-[11px] text-text-subtle flex flex-col gap-1">
                    <span className="font-bold text-text">Auto-assigned ticket to lead</span>
                    <span>Ran 2 hours ago • Success</span>
                  </div>

                  <button
                    onClick={() => showToast("Navigating to Automation Rule Builder")}
                    className="w-full py-2 rounded border border-brand/40 bg-brand/5 text-brand text-xs font-bold hover:bg-brand/10 transition-colors text-center"
                  >
                    + Create new automation rule
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
