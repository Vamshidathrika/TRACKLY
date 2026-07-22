"use client";

import { useState } from "react";
import Link from "next/link";
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

export function SubtasksChecklist({ initialItems = [] }: { initialItems?: SubtaskItem[] }) {
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>(
    initialItems.length > 0
      ? initialItems
      : [
          { id: "st-1", title: "Design poster layout for Coordinators Intro", completed: true },
          { id: "st-2", title: "Create Google Form with brand aesthetics & theme", completed: true },
          { id: "st-3", title: "Design WhatsApp cover image poster & Google Form banner", completed: false },
          { id: "st-4", title: "Review typography & color hierarchy with design lead", completed: false },
        ]
  );
  const [newTitle, setNewTitle] = useState("");

  const completedCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const toggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { id: `st-${Date.now()}`, title: newTitle.trim(), completed: false },
    ]);
    setNewTitle("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
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

      {/* Subtasks List */}
      <div className="flex flex-col gap-1.5 my-1">
        {subtasks.map((st) => (
          <div
            key={st.id}
            className="flex items-center justify-between group p-2 rounded-md hover:bg-neutral/50 transition-colors"
          >
            <button
              onClick={() => toggleSubtask(st.id)}
              className="flex items-center gap-2.5 text-left text-xs text-text font-medium flex-1 cursor-pointer"
            >
              {st.completed ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={16} className="text-text-subtle shrink-0 group-hover:text-brand" />
              )}
              <span className={st.completed ? "line-through text-text-subtle" : ""}>{st.title}</span>
            </button>
            <button
              onClick={() => removeSubtask(st.id)}
              className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-red-500 transition-opacity p-1"
              title="Delete subtask"
            >
              <Trash2 size={13} />
            </button>
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

export function AttachmentsDropzone() {
  const [files, setFiles] = useState<AttachmentFile[]>([
    { id: "att-1", name: "vbn_jade_poster_banner.png", size: "2.4 MB", type: "image", uploadedAt: "30 Jun 2026" },
    { id: "att-2", name: "google_form_theme_specs.pdf", size: "1.1 MB", type: "pdf", uploadedAt: "1 Jul 2026" },
  ]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: AttachmentFile[] = Array.from(e.target.files).map((f, i) => ({
        id: `att-${Date.now()}-${i}`,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: f.type.includes("image") ? "image" : f.type.includes("pdf") ? "pdf" : "doc",
        uploadedAt: "Just now",
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
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

      {/* File List Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2.5 rounded-md border border-border bg-neutral/30 hover:bg-neutral/60 transition-colors group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-brand/10 text-brand font-bold text-xs">
                  {file.type === "image" ? <ImageIcon size={18} /> : <FileText size={18} />}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-text truncate">{file.name}</p>
                  <span className="text-[10px] text-text-subtle">{file.size} • {file.uploadedAt}</span>
                </div>
              </div>
              <button
                onClick={() => removeAttachment(file.id)}
                className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-red-500 p-1 transition-opacity"
                title="Remove attachment"
              >
                <Trash2 size={13} />
              </button>
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
          if (e.dataTransfer.files.length > 0) {
            const dropped: AttachmentFile[] = Array.from(e.dataTransfer.files).map((f, i) => ({
              id: `att-${Date.now()}-${i}`,
              name: f.name,
              size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
              type: f.type.includes("image") ? "image" : "pdf",
              uploadedAt: "Just now",
            }));
            setFiles((prev) => [...prev, ...dropped]);
          }
        }}
        className={`flex items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed transition-all cursor-pointer ${
          isDragOver ? "border-brand bg-brand/5 scale-[1.01]" : "border-border bg-neutral/20 hover:bg-neutral/50"
        }`}
      >
        <UploadCloud size={16} className="text-text-subtle" />
        <span className="text-xs font-semibold text-text-subtle">
          Drag & drop files here or <span className="text-brand font-bold">browse</span>
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

export function LinkedWorkItems({ projectKey }: { projectKey: string }) {
  const [links, setLinks] = useState<LinkedItem[]>([
    { id: "l-1", relation: "Relates to", key: `${projectKey}-100`, summary: "Jira Product Discovery Poster Initiative", status: "IN_PROGRESS", type: "EPIC" },
    { id: "l-2", relation: "Blocks", key: `${projectKey}-158`, summary: "Publish poster assets to social channels", status: "TO_DO", type: "TASK" },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [linkKey, setLinkKey] = useState("");
  const [relation, setRelation] = useState<LinkedItem["relation"]>("Relates to");

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkKey.trim()) return;
    setLinks((prev) => [
      ...prev,
      {
        id: `l-${Date.now()}`,
        relation,
        key: linkKey.toUpperCase(),
        summary: "Linked project deliverable",
        status: "TO_DO",
        type: "STORY",
      },
    ]);
    setLinkKey("");
    setShowAddModal(false);
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

      {/* Linked Items List */}
      <div className="flex flex-col gap-2">
        {links.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2.5 rounded-md border border-border/70 bg-neutral/30 hover:bg-neutral/60 transition-colors"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle px-1.5 py-0.5 rounded bg-neutral">
                {item.relation}
              </span>
              <TypeIcon type={item.type} size={14} />
              <Link href={`/projects/${projectKey}/issues/${item.key}`} className="font-mono text-xs font-bold text-brand hover:underline">
                {item.key}
              </Link>
              <span className="text-xs font-medium text-text truncate max-w-xs">{item.summary}</span>
            </div>
            <StatusTag color={item.status === "DONE" ? "green" : item.status === "IN_PROGRESS" ? "blue" : "gray"}>
              {item.status.replace("_", " ")}
            </StatusTag>
          </div>
        ))}
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
                onChange={(e) => setRelation(e.target.value as LinkedItem["relation"])}
                className="w-full h-8 rounded border border-border bg-surface px-2 outline-none"
              >
                <option value="Relates to">Relates to</option>
                <option value="Blocks">Blocks</option>
                <option value="Is blocked by">Is blocked by</option>
                <option value="Duplicates">Duplicates</option>
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
