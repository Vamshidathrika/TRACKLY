"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createSubtaskAction,
  toggleSubtaskAction,
  deleteSubtaskAction,
  linkIssueAction,
  unlinkIssueAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
} from "@/app/(app)/projects/[key]/issues/actions";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Paperclip,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Link2,
  Clock,
  MessageSquare,
  History as HistoryIcon,
  Send,
  RefreshCw,
  Zap,
  GitBranch,
  GitCommit,
  GitPullRequest,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Tag,
  Users,
  Award,
  Smile,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Tag as StatusTag } from "@/components/ui/Tag";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { Button } from "@/components/ui/Button";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

// 1. Subtasks Checklist Component
export type SubtaskItem = {
  id: string;
  title: string;
  completed: boolean;
};

export function SubtasksChecklist({
  issueId,
  projectKey,
  items = [],
}: {
  issueId: string;
  projectKey?: string;
  items?: { id: string; key: string; summary: string; status: IssueStatus }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const subtasks = items.map((s) => ({
    id: s.id,
    key: s.key,
    title: s.summary,
    completed: s.status === "DONE",
  }));

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const run = (fn: () => Promise<{ error?: string } | undefined>) => {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  const toggleSubtask = (id: string) => run(() => toggleSubtaskAction(id));
  const removeSubtask = (id: string) => run(() => deleteSubtaskAction(id));

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    run(() => createSubtaskAction(issueId, title));
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-brand" />
          <h3 className="text-sm font-bold text-text">Subtasks</h3>
        </div>
        <span className="text-xs font-semibold text-text-subtle">
          {completedCount} of {subtasks.length} completed ({progressPercent}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-neutral overflow-hidden">
        <div style={{ width: `${progressPercent}%` }} className="h-full bg-emerald-500 transition-all duration-300" />
      </div>

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Subtasks List */}
      <div className="flex flex-col gap-1.5 my-1">
        {subtasks.length === 0 && (
          <p className="text-xs text-text-subtle italic py-1">No subtasks yet.</p>
        )}
        {subtasks.map((st) => (
          <div
            key={st.id}
            className="flex items-center justify-between group p-2 rounded-md hover:bg-neutral/50 transition-colors"
          >
            <button
              onClick={() => toggleSubtask(st.id)}
              className="flex items-center gap-2.5 text-left text-xs text-text font-medium flex-1 cursor-pointer min-w-0"
            >
              {st.completed ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={16} className="text-text-subtle shrink-0 group-hover:text-brand" />
              )}
              <span className={st.completed ? "line-through text-text-subtle" : ""}>{st.title}</span>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {projectKey && (
                <Link
                  href={`/projects/${projectKey}/issues/${st.key}`}
                  className="font-mono text-[10px] font-bold text-text-subtle hover:text-brand"
                >
                  {st.key}
                </Link>
              )}
              <button
                onClick={() => removeSubtask(st.id)}
                className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-red-500 transition-opacity p-1"
                title="Delete subtask"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Subtask Input */}
      <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1 border-t border-border/40">
        <input
          type="text"
          placeholder="+ Add a subtask (press Enter)..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 h-8 rounded border border-border bg-background px-3 text-xs outline-none focus:border-brand"
        />
        <Button appearance="subtle" type="submit" className="h-8 text-xs font-semibold">
          Add
        </Button>
      </form>
    </div>
  );
}

// 2. Attachments Drag & Drop Component
export type AttachmentFile = {
  id: string;
  name: string;
  size: string;
  type: "image" | "pdf" | "figma" | "doc";
  uploadedAt: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsDropzone({
  issueId,
  attachments = [],
  currentUserId,
}: {
  issueId: string;
  attachments?: any[];
  currentUserId?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const files = attachments;

  const upload = async (fileList: FileList) => {
    if (fileList.length === 0) return;
    const formData = new FormData();
    Array.from(fileList).forEach((f) => formData.append("files", f));

    setIsUploading(true);
    const res = await uploadAttachmentAction(issueId, formData);
    setIsUploading(false);

    if (res?.error) {
      setError(res.error);
      return;
    }
    setError(null);
    router.refresh();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void upload(e.target.files);
    // Reset so picking the same file twice in a row still fires onChange.
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    startTransition(async () => {
      const res = await deleteAttachmentAction(id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={16} className="text-brand" />
          <h3 className="text-sm font-bold text-text">Attachments ({files.length})</h3>
        </div>
        <label className="cursor-pointer text-xs font-bold text-brand hover:underline flex items-center gap-1">
          <Plus size={13} /> Add attachment
          <input type="file" multiple onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* File List Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2.5 rounded-md border border-border bg-neutral/30 hover:bg-neutral/60 transition-colors group"
            >
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 overflow-hidden min-w-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand/10 text-brand font-bold text-xs">
                  {String(file.mimeType).startsWith("image/") ? <ImageIcon size={18} /> : <FileText size={18} />}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-text truncate">{file.filename}</p>
                  <span className="text-[10px] text-text-subtle">
                    {formatBytes(file.sizeBytes)} •{" "}
                    {new Date(file.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </a>
              {(!currentUserId || file.uploaderId === currentUserId) && (
                <button
                  onClick={() => removeAttachment(file.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-red-500 p-1 transition-opacity shrink-0"
                  title="Remove attachment"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drag & Drop Zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files.length > 0) void upload(e.dataTransfer.files);
        }}
        className={`flex items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed transition-all cursor-pointer ${
          isDragOver ? "border-brand bg-brand/5 scale-[1.01]" : "border-border bg-neutral/20 hover:bg-neutral/50"
        }`}
      >
        <UploadCloud size={16} className="text-text-subtle" />
        <span className="text-xs font-semibold text-text-subtle">
          {isUploading ? (
            "Uploading..."
          ) : (
            <>Drag &amp; drop files here or <span className="text-brand font-bold">browse</span></>
          )}
        </span>
        <input type="file" multiple onChange={handleFileUpload} className="hidden" />
      </label>
    </div>
  );
}

// 3. Linked Work Items Component
export type LinkedItem = {
  id: string;
  relation: "Blocks" | "Is blocked by" | "Relates to" | "Duplicates";
  key: string;
  summary: string;
  status: IssueStatus;
  type: IssueType;
};

const RELATION_LABELS: Record<string, string> = {
  RELATES_TO: "Relates to",
  BLOCKS: "Blocks",
  IS_BLOCKED_BY: "Is blocked by",
  DUPLICATES: "Duplicates",
};

export function LinkedWorkItems({
  issueId,
  projectKey,
  links = [],
}: {
  issueId: string;
  projectKey: string;
  links?: any[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);
  const [linkKey, setLinkKey] = useState("");
  const [relation, setRelation] = useState("RELATES_TO");
  const [error, setError] = useState<string | null>(null);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkKey.trim()) return;
    startTransition(async () => {
      const res = await linkIssueAction(issueId, linkKey, relation as any);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setLinkKey("");
      setShowAddModal(false);
      router.refresh();
    });
  };

  const handleUnlink = (linkId: string) => {
    startTransition(async () => {
      const res = await unlinkIssueAction(linkId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setError(null);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-brand" />
          <h3 className="text-sm font-bold text-text">Linked Work Items ({links.length})</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} /> Link item
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Linked Items List */}
      <div className="flex flex-col gap-2">
        {links.length === 0 && (
          <p className="text-xs text-text-subtle italic">No linked work items yet.</p>
        )}
        {links.map((link) => {
          const item = link.targetIssue;
          return (
            <div
              key={link.id}
              className="flex items-center justify-between p-2.5 rounded-md border border-border/70 bg-neutral/30 hover:bg-neutral/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle px-1.5 py-0.5 rounded bg-neutral shrink-0">
                  {RELATION_LABELS[link.relation] || link.relation}
                </span>
                <TypeIcon type={item.type} size={14} />
                <Link
                  href={`/projects/${projectKey}/issues/${item.key}`}
                  className="font-mono text-xs font-bold text-brand hover:underline shrink-0"
                >
                  {item.key}
                </Link>
                <span className="text-xs font-medium text-text truncate">{item.summary}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusTag color={item.status === "DONE" ? "green" : item.status === "IN_PROGRESS" ? "blue" : "gray"}>
                  {item.status.replace("_", " ")}
                </StatusTag>
                <button
                  onClick={() => handleUnlink(link.id)}
                  title="Remove link"
                  className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-red-500 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Link Modal */}
      {showAddModal && (
        <div className="absolute top-12 left-0 right-0 z-30 p-4 rounded-lg border border-border bg-surface shadow-xl text-xs flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex justify-between items-center font-bold text-text">
            <span>Link Work Item</span>
            <button onClick={() => setShowAddModal(false)} className="text-text-subtle hover:text-text">✕</button>
          </div>
          <form onSubmit={handleAddLink} className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-bold text-text-subtle uppercase mb-1">Relationship</label>
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full h-8 rounded border border-border bg-surface px-2 outline-none"
              >
                <option value="RELATES_TO">Relates to</option>
                <option value="BLOCKS">Blocks</option>
                <option value="IS_BLOCKED_BY">Is blocked by</option>
                <option value="DUPLICATES">Duplicates</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-subtle uppercase mb-1">Issue Key (e.g. WSM-158)</label>
              <input
                required
                type="text"
                value={linkKey}
                onChange={(e) => setLinkKey(e.target.value)}
                placeholder="WSM-158"
                className="w-full h-8 rounded border border-border bg-surface px-2 outline-none font-mono uppercase"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button appearance="subtle" onClick={() => setShowAddModal(false)} type="button">Cancel</Button>
              <Button appearance="primary" type="submit" className="bg-brand text-white font-bold">Link Item</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// 4. Activity Section (Comments, History, Work Log)
export function ActivitySection({
  comments: initialComments,
  history: initialHistory,
  workLogs = [],
  loggedHours = 0,
  estimatedHours = 8,
  currentUserId,
  onAddComment,
  onLogWork,
  onDeleteWorkLog,
}: {
  comments: any[];
  history: any[];
  workLogs?: any[];
  loggedHours?: number;
  estimatedHours?: number;
  currentUserId?: string;
  onAddComment: (text: string) => void;
  onLogWork?: () => void;
  onDeleteWorkLog?: (workLogId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"comments" | "history" | "worklog">("comments");
  const [commentText, setCommentText] = useState("");
  const [commentsList, setCommentsList] = useState(initialComments);

  const actionChips = ["Approved 👍", "Please review 🔍", "Needs info ❓", "In progress 🚀"];

  const handleChipClick = (chip: string) => {
    setCommentText((prev) => (prev ? `${prev} ${chip}` : chip));
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const newComm = {
      id: `c-${Date.now()}`,
      body: commentText.trim(),
      createdAt: new Date(),
      author: { name: "Current User", avatarUrl: null },
    };
    setCommentsList((prev) => [newComm, ...prev]);
    onAddComment(commentText.trim());
    setCommentText("");
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs">
      {/* Activity Tabs */}
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
            <HistoryIcon size={14} /> History ({initialHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("worklog")}
            className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
              activeTab === "worklog" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
            }`}
          >
            <Clock size={14} /> Work Log ({workLogs.length})
          </button>
        </div>
      </div>

      {/* Tab: Comments */}
      {activeTab === "comments" && (
        <div className="flex flex-col gap-4">
          {/* Comment Composer */}
          <form onSubmit={submitComment} className="flex flex-col gap-2 rounded-lg border border-border p-3 bg-neutral/20">
            <div className="flex items-center gap-2 mb-1">
              <Avatar name="Current User" size={24} />
              <span className="text-xs font-bold text-text">Add a collaboration comment...</span>
            </div>

            <textarea
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your comment or update..."
              className="w-full rounded border border-border bg-surface p-2.5 text-xs outline-none focus:border-brand"
            />

            {/* Quick Action Chips */}
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
                <Send size={12} /> Post Comment
              </Button>
            </div>
          </form>

          {/* Comments Feed */}
          <div className="flex flex-col gap-3 divide-y divide-border/60">
            {commentsList.map((c) => (
              <div key={c.id} className="pt-3 flex items-start gap-3">
                <Avatar name={c.author.name} src={c.author.avatarUrl} size={30} />
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-text">{c.author.name}</span>
                    <span className="text-[11px] text-text-subtle">
                      {typeof c.createdAt === "string" ? c.createdAt : new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-text whitespace-pre-wrap leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: History */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-2 divide-y divide-border/40">
          {initialHistory.length === 0 ? (
            <p className="text-xs text-text-subtle italic py-2">No history recorded yet.</p>
          ) : (
            initialHistory.map((h) => (
              <div key={h.id} className="py-2 flex items-center gap-2 text-xs text-text-subtle">
                <Avatar name={h.author.name} src={h.author.avatarUrl} size={20} />
                <span className="font-bold text-text">{h.author.name}</span>
                <span>updated</span>
                <span className="font-semibold text-text">{h.field}</span>
                {h.oldValue && <span>from <strong className="font-mono bg-neutral px-1.5 rounded text-text">{h.oldValue}</strong></span>}
                {h.newValue && <span>to <strong className="font-mono bg-selected text-selected-text px-1.5 rounded">{h.newValue}</strong></span>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Work Log */}
      {activeTab === "worklog" && (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-md bg-neutral/30 border border-border flex items-center justify-between text-xs font-semibold">
            <span>
              Total Logged Time:{" "}
              <strong className="text-brand font-bold">{loggedHours.toFixed(1)} hours</strong>
            </span>
            <span>
              Original Estimate:{" "}
              <strong className="text-text font-bold">{estimatedHours.toFixed(1)} hours</strong>
            </span>
          </div>

          {onLogWork && (
            <div>
              <Button
                appearance="primary"
                type="button"
                onClick={onLogWork}
                className="bg-brand text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Plus size={12} /> Log work
              </Button>
            </div>
          )}

          {workLogs.length === 0 ? (
            <p className="text-xs text-text-subtle italic py-2">
              No work logged yet. Use “Log work” to record time against this ticket.
            </p>
          ) : (
            <div className="divide-y divide-border/40 text-xs">
              {workLogs.map((w) => (
                <div key={w.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={w.author?.name || "User"} src={w.author?.avatarUrl} size={22} />
                    <span className="font-bold text-text shrink-0">{w.author?.name || "User"}</span>
                    <span className="text-text-subtle truncate">
                      logged <strong className="text-brand">{Number(w.hours).toFixed(1)}h</strong>
                      {w.description ? ` — "${w.description}"` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-text-subtle">
                      {new Date(w.startedAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {onDeleteWorkLog && currentUserId && w.authorId === currentUserId && (
                      <button
                        type="button"
                        onClick={() => onDeleteWorkLog(w.id)}
                        title="Delete work log"
                        className="text-text-subtle hover:text-danger transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
