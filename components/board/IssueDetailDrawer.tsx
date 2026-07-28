"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import { DevelopmentPanel } from "@/components/issues/DevelopmentPanel";
import { getIssueDevelopmentDataAction } from "@/app/(app)/projects/[key]/issues/actions";
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
  Maximize2,
  Minimize2,
  ThumbsUp,
  Eye,
  GitBranch,
  GitPullRequest,
  GitCommit,
  Link2,
  Paperclip,
  AlertCircle,
  CheckSquare,
  Square,
  Copy,
  ChevronDown,
  Sparkles,
  Zap,
  ShieldAlert,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TimeLogModal } from "@/components/issues/TimeLogModal";
import {
  updateIssueFieldAction,
  deleteIssueAction,
  logWorkAction,
  postCommentAction,
  createSubtaskAction,
  toggleSubtaskAction,
  deleteSubtaskAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
  linkIssueAction,
  unlinkIssueAction,
  toggleWatcherAction,
} from "@/app/(app)/projects/[key]/issues/actions";
import { getIssueDetailAction } from "@/app/(app)/projects/[key]/issues/detail-actions";
import type { BoardIssue, BoardUserOption } from "./IssueCard";
import type { IssueStatus, IssuePriority, IssueType, LinkRelation } from "@prisma/client";
import {
  ISSUE_TYPES as issueTypes,
  PRIORITY_CONFIG as priorityIcons,
  ISSUE_STATUSES as statuses,
} from "@/lib/issues-config";

type LinkedIssueRow = {
  id: string;
  relation: string;
  key: string;
  summary: string;
  status: IssueStatus;
};

/**
 * Flattens both link directions into one list the UI can render.
 *
 * A row is dropped when its counterpart issue is absent rather than being
 * given a placeholder key — an invented IS_BLOCKED_BY row disables the
 * "Mark Complete" transition on a blocker that does not exist.
 */
function mapLinks(
  linksOut: { id: string; relation: string; targetIssue?: { key: string; summary: string; status: IssueStatus } | null }[] | undefined,
  linksIn: { id: string; relation: string; sourceIssue?: { key: string; summary: string; status: IssueStatus } | null }[] | undefined
): LinkedIssueRow[] {
  const out = (linksOut ?? []).flatMap((l) =>
    l.targetIssue
      ? [{ id: l.id, relation: l.relation, key: l.targetIssue.key, summary: l.targetIssue.summary, status: l.targetIssue.status }]
      : []
  );
  // An inbound BLOCKS link reads as "is blocked by" from this issue's side;
  // every other relation is symmetric and keeps its own name.
  const incoming = (linksIn ?? []).flatMap((l) =>
    l.sourceIssue
      ? [
          {
            id: l.id,
            relation: l.relation === "BLOCKS" ? "IS_BLOCKED_BY" : l.relation,
            key: l.sourceIssue.key,
            summary: l.sourceIssue.summary,
            status: l.sourceIssue.status,
          },
        ]
      : []
  );
  return [...out, ...incoming];
}

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
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  // Drawer Ergonomics & Layout
  const [isWideMode, setIsWideMode] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Issue Fields
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

  // Superpower State: Active Presence & Collaboration
  const [activePresenceUsers] = useState<BoardUserOption[]>([
    availableUsers[0] || { id: "u-1", name: "Alex Chen", avatarUrl: null },
    availableUsers[1] || { id: "u-2", name: "Sarah Connor", avatarUrl: null },
  ]);

  // Superpower State: Engagement & Voting
  const [watchersCount, setWatchersCount] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Superpower State: Subtasks & AI Decomposer
  const [subtasks, setSubtasks] = useState<
    { id: string; key: string; summary: string; status: IssueStatus }[]
  >([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  // Superpower State: Developer Context (PRs & Commits)
  const [pullRequests, setPullRequests] = useState<
    { number: number; title: string; status: "OPEN" | "MERGED" | "CLOSED"; url?: string }[]
  >([]);
  const [commits, setCommits] = useState<{ hash: string; message: string; url?: string }[]>([]);
  const [showAddPrModal, setShowAddPrModal] = useState(false);
  const [newPrInput, setNewPrInput] = useState("");

  // Superpower State: Linked Issues & Dependency Blockers
  const [linkedIssues, setLinkedIssues] = useState<
    { id: string; relation: string; key: string; summary: string; status: IssueStatus }[]
  >([]);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [linkKeyInput, setLinkKeyInput] = useState("");
  const [linkRelationInput, setLinkRelationInput] = useState("BLOCKS");

  // Superpower State: Attachments & Clipboard Paste
  const [attachments, setAttachments] = useState<
    { id: string; filename: string; url: string; sizeBytes: number; mimeType: string }[]
  >([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Activity Section
  const [activeTab, setActiveTab] = useState<"comments" | "history" | "worklog" | "development">("comments");
  const [commentInput, setCommentInput] = useState("");
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [workLogsList, setWorkLogsList] = useState<any[]>([]);
  const [loggedHours, setLoggedHours] = useState<number>(0);

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [devData, setDevData] = useState<{ commits?: any[]; pullRequests?: any[]; branches?: any[] }>({});

  // Keyboard Shortcuts: Global Escape key & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputActive =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      if (e.key === "Escape" && !showTimeModal) {
        onClose();
        return;
      }

      if (!isInputActive) {
        if (e.key === "c" || e.key === "C") {
          e.preventDefault();
          commentInputRef.current?.focus();
        } else if (e.key === "e" || e.key === "E") {
          e.preventDefault();
          setIsEditingDescription(true);
        } else if ((e.key === "m" || e.key === "M") && availableUsers.length > 0) {
          e.preventDefault();
          const me = availableUsers[0];
          handleAssigneeSelect(me.id);
          showToast(`Assigned task to ${me.name}`);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showTimeModal, availableUsers]);

  // Sync issue prop to state
  useEffect(() => {
    if (issue) {
      setSummary(issue.summary);
      setDescription(issue.description || "");
      setPoints(typeof issue.storyPoints === "number" && issue.storyPoints > 0 ? issue.storyPoints : (issue.storyPoints === 0 ? 0 : ""));
      setEstimateHours(
        typeof issue.estimatedHours === "number" && issue.estimatedHours > 0
          ? issue.estimatedHours
          : typeof issue.originalEstimate === "number" && issue.originalEstimate > 0
          ? issue.originalEstimate
          : ""
      );
      setReporterId(issue.reporterId || issue.reporter?.id || "");
      setStartDate(toDateInput(issue.startDate));
      setDueDate(toDateInput(issue.dueDate));
      setLabels(issue.labels || []);
      setIsEditingSummary(false);
      setIsEditingDescription(false);
      setCommentInput("");

      setWatchersCount(issue.watchers?.length ?? 0);
      setIsWatching(issue.isWatching ?? false);
      setIsLoadingDetail(false);

      // The board query is a thin card projection — it carries no subtasks,
      // attachments, links, comments or history. Seed from whatever the card
      // happened to include, then let the detail fetch below replace it.
      // Nothing here may fall back to invented data: a placeholder
      // IS_BLOCKED_BY link blocks a real transition on a nonexistent issue.
      setSubtasks(issue.subtasks || []);
      setPullRequests(issue.devContext?.pullRequests || []);
      setCommits(issue.devContext?.commits || []);
      setLinkedIssues(mapLinks(issue.linksOut, issue.linksIn));
      setAttachments(issue.attachments || []);

      const logs = issue.workLogs || [];
      setWorkLogsList(logs);
      setCommentsList(issue.comments || []);
      setHistoryList(issue.history || []);
      const totalLogged = issue.loggedHours ?? logs.reduce((sum, w) => sum + Number(w.hours || 0), 0);
      setLoggedHours(totalLogged);

      if (issue.id && !issue.id.startsWith("demo-")) {
        setIsLoadingDetail(true);
        getIssueDevelopmentDataAction(issue.id).then((res) => {
          if (res) setDevData(res);
        });
      } else {
        setIsLoadingDetail(false);
      }
    }
  }, [issue]);

  // Detail fetch, mirroring how Jira loads a board card's full issue only when
  // the detail view opens. Guarded against a stale response overwriting a
  // newer selection when the user clicks through cards quickly.
  useEffect(() => {
    if (!issue?.id || issue.id.startsWith("demo-")) return;
    let cancelled = false;
    const requestedId = issue.id;

    getIssueDetailAction(requestedId)
      .then((detail) => {
        if (cancelled || !detail || detail.id !== requestedId) return;
        setSubtasks(detail.subtasks);
        setAttachments(detail.attachments);
        setLinkedIssues(mapLinks(detail.linksOut, detail.linksIn));
        setCommentsList(detail.comments);
        setHistoryList(detail.history);
        setWorkLogsList(detail.workLogs);
        setLoggedHours(detail.loggedHours);
        setWatchersCount(detail.watchers.length);
        setIsWatching(detail.isWatching);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [issue?.id]);

  if (!issue) return null;

  const currentType = issueTypes.find((t) => t.value === issue.type) || issueTypes[1];
  const currentPriority = priorityIcons[issue.priority] || priorityIcons.MEDIUM;
  const currentStatus = statuses.find((s) => s.value === issue.status) || statuses[0];
  const estimatedHours = typeof estimateHours === "number" ? estimateHours : parseFloat(String(estimateHours)) || 0;
  const dueDateStatus = getDueDateStatus(dueDate, issue.status);

  // Subtask progress calculation
  const completedSubtasks = subtasks.filter((s) => s.status === "DONE").length;
  const subtaskProgressPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  // Blocker Guard calculation
  const activeBlockers = linkedIssues.filter((lk) => lk.relation === "IS_BLOCKED_BY" && lk.status !== "DONE");
  const isBlocked = activeBlockers.length > 0;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
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

  // Smart Workflow Transition Action Handler
  const handleWorkflowTransition = () => {
    let nextStatus: IssueStatus = "IN_PROGRESS";
    if (issue.status === "TO_DO") nextStatus = "IN_PROGRESS";
    else if (issue.status === "IN_PROGRESS") nextStatus = "IN_REVIEW";
    else if (issue.status === "IN_REVIEW") nextStatus = "DONE";
    else if (issue.status === "DONE") nextStatus = "IN_PROGRESS";

    if (nextStatus === "DONE" && isBlocked) {
      showToast(`⚠️ Blocked by ${activeBlockers[0].key}. Resolve blockers first!`);
      return;
    }

    handleStatusSelect(nextStatus);
    showToast(`Status updated to ${nextStatus.replace("_", " ")}`);
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


  // Superpower Action: AI Acceptance Criteria Generator
  const handleAiGenerateAcceptanceCriteria = () => {
    const acTemplate = `\n\n### Acceptance Criteria (Definition of Done)\n- [ ] **Given** the user inspects ${issue.key}, **When** they edit any field, **Then** state updates instantly (<10ms).\n- [ ] **Given** a blocker issue is unresolved, **When** user attempts resolution, **Then** a blocker alert prevents invalid transition.\n- [ ] **Given** screenshot image is copied to clipboard, **When** user presses Cmd+V, **Then** file attaches automatically.`;
    
    const newDesc = description ? `${description}${acTemplate}` : acTemplate.trim();
    setDescription(newDesc);
    setIsEditingDescription(true);
    showToast("✨ AI generated Acceptance Criteria template!");
  };

  // Superpower Action: AI Executive Summary Recap
  const handleAiSummarize = () => {
    showToast(`✨ AI Recap: ${issue.key} is an active ${issue.type.toLowerCase()} with ${completedSubtasks}/${subtasks.length} subtasks completed and 1 PR merged.`);
  };

  // Clipboard Image Paste Handler (`Cmd+V` / `Ctrl+V`)
  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pasted: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // Clipboard images arrive as "image.png" or unnamed; give each one a
          // distinct name so the blob store doesn't collide them.
          const ext = (file.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "");
          pasted.push(new File([file], `pasted-${Date.now()}-${i}.${ext}`, { type: file.type }));
        }
      }
    }
    if (pasted.length > 0) uploadFiles(pasted);
  };

  /**
   * Re-reads the issue from the server after a mutation.
   *
   * Subtasks, links and attachments are all server-allocated (keys, blob URLs,
   * link ids), so the drawer cannot construct the resulting row itself — it has
   * to ask. Optimistic UI is applied by each caller first and reconciled here.
   */
  const refreshDetail = async () => {
    if (!issue?.id || issue.id.startsWith("demo-")) return;
    const detail = await getIssueDetailAction(issue.id);
    if (!detail || detail.id !== issue.id) return;
    setSubtasks(detail.subtasks);
    setAttachments(detail.attachments);
    setLinkedIssues(mapLinks(detail.linksOut, detail.linksIn));
    setWatchersCount(detail.watchers.length);
    setIsWatching(detail.isWatching);
  };

  // Subtask handlers
  const handleToggleSubtask = (stId: string) => {
    const previous = subtasks;
    setSubtasks((prev) =>
      prev.map((st) =>
        st.id === stId ? { ...st, status: (st.status === "DONE" ? "TO_DO" : "DONE") as IssueStatus } : st
      )
    );
    startTransition(async () => {
      const res = await toggleSubtaskAction(stId);
      if (res?.error) {
        setSubtasks(previous);
        showToast(`Could not update subtask: ${res.error}`);
        return;
      }
      await refreshDetail();
    });
  };

  const handleDeleteSubtask = (stId: string) => {
    const previous = subtasks;
    setSubtasks((prev) => prev.filter((st) => st.id !== stId));
    startTransition(async () => {
      const res = await deleteSubtaskAction(stId);
      if (res?.error) {
        setSubtasks(previous);
        showToast(`Could not delete subtask: ${res.error}`);
        return;
      }
      await refreshDetail();
    });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setNewSubtaskTitle("");
    startTransition(async () => {
      const res = await createSubtaskAction(issue.id, title);
      if (res?.error) {
        setNewSubtaskTitle(title);
        showToast(`Could not add subtask: ${res.error}`);
        return;
      }
      await refreshDetail();
      showToast("Subtask created");
    });
  };

  const handleToggleWatch = () => {
    const wasWatching = isWatching;
    setIsWatching(!wasWatching);
    setWatchersCount((w) => (wasWatching ? Math.max(0, w - 1) : w + 1));
    startTransition(async () => {
      const res = await toggleWatcherAction(issue.id);
      if (res?.error) {
        setIsWatching(wasWatching);
        setWatchersCount((w) => (wasWatching ? w + 1 : Math.max(0, w - 1)));
        showToast(`Could not update watchers: ${res.error}`);
        return;
      }
      showToast(res?.isWatching ? "Watching this issue" : "Stopped watching");
    });
  };

  // Git / Link / Attachment Add Handlers
  const handleAddPr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrInput.trim()) return;
    const num = parseInt(newPrInput.replace(/\D/g, "")) || Math.floor(Math.random() * 100) + 10;
    setPullRequests((prev) => [
      ...prev,
      { number: num, title: newPrInput.trim(), status: "OPEN", url: "#" },
    ]);
    setNewPrInput("");
    setShowAddPrModal(false);
    showToast(`Linked PR #${num}`);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const targetKey = linkKeyInput.trim().toUpperCase();
    if (!targetKey) return;
    setLinkKeyInput("");
    setShowAddLinkModal(false);
    startTransition(async () => {
      // The server resolves the key, rejects unknown or cross-tenant targets,
      // and owns the link id — so the row is only rendered after it confirms.
      const res = await linkIssueAction(issue.id, targetKey, linkRelationInput as LinkRelation);
      if (res?.error) {
        showToast(`Could not link ${targetKey}: ${res.error}`);
        return;
      }
      await refreshDetail();
      showToast(`Linked ${targetKey}`);
    });
  };

  const handleRemoveLink = (linkId: string) => {
    const previous = linkedIssues;
    setLinkedIssues((prev) => prev.filter((lk) => lk.id !== linkId));
    startTransition(async () => {
      const res = await unlinkIssueAction(linkId);
      if (res?.error) {
        setLinkedIssues(previous);
        showToast(`Could not remove link: ${res.error}`);
        return;
      }
      await refreshDetail();
    });
  };

  const uploadFiles = (files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    setIsUploading(true);
    startTransition(async () => {
      try {
        const res = await uploadAttachmentAction(issue.id, formData);
        if (res?.error) {
          showToast(`Upload failed: ${res.error}`);
          return;
        }
        await refreshDetail();
        showToast(`Attached ${files.length} file${files.length > 1 ? "s" : ""}`);
      } finally {
        setIsUploading(false);
      }
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFiles(Array.from(files));
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    const previous = attachments;
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    startTransition(async () => {
      const res = await deleteAttachmentAction(attachmentId);
      if (res?.error) {
        setAttachments(previous);
        showToast(`Could not delete attachment: ${res.error}`);
        return;
      }
      await refreshDetail();
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task?")) {
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
      reactions: {},
    };
    setCommentsList((prev) => [newComm, ...prev]);
    setCommentInput("");

    startTransition(async () => {
      await postCommentAction(issue.id, text);
    });
  };

  const handleToggleCommentReaction = (commentId: string, emoji: string) => {
    setCommentsList((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const reactions = { ...(c.reactions || {}) };
          reactions[emoji] = (reactions[emoji] || 0) + 1;
          return { ...c, reactions };
        }
        return c;
      })
    );
  };

  const handleChipClick = (chip: string) => {
    setCommentInput((prev) => (prev ? `${prev} ${chip}` : chip));
  };

  const actionChips = ["Approved 👍", "Please review 🔍", "Needs info ❓", "In progress 🚀"];

  // Copy Menu Actions
  const copyToClipboard = (text: string, msg: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      showToast(msg);
      setShowShareMenu(false);
    }
  };

  const issueUrl = typeof window !== "undefined" ? `${window.location.origin}/projects/${issue.projectKey}/issues/${issue.key}` : "";

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
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          handleFileUpload(e.dataTransfer.files);
        }}
      >
        <div
          className={`relative w-full bg-surface border-l border-border h-full shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-slide-in-right ${
            isWideMode ? "max-w-4xl" : "max-w-2xl"
          }`}
        >
          {/* File Dragging Visual Dropzone Overlay */}
          {isDraggingFile && (
            <div className="absolute inset-0 z-50 bg-brand/20 backdrop-blur-xs border-2 border-dashed border-brand flex flex-col items-center justify-center text-brand font-bold gap-2">
              <Paperclip size={32} className="animate-bounce" />
              <span>Drop files here to attach to {issue.key}</span>
            </div>
          )}

          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute top-16 left-6 z-50 rounded-lg bg-text text-surface px-3.5 py-2 text-xs font-semibold shadow-xl border border-brand/30 animate-bounce flex items-center gap-2">
              <Sparkles size={14} className="text-brand" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Top Action Bar */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-surface shrink-0">
            {/* Breadcrumb, Key & Epic Badge */}
            <div className="flex items-center gap-2 text-xs font-semibold text-text-subtle flex-wrap">
              <span className={`p-1 rounded ${currentType.color}`}>{currentType.icon}</span>
              <span className="font-mono text-text font-bold">{issue.key}</span>
              <span className="text-text-subtle/40">•</span>
              <span className="text-[11px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {issue.projectKey}
              </span>
              <span className="text-text-subtle/40">•</span>
              {/* Epic Context Badge */}
              <span className="text-[11px] font-bold text-purple-600 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Layers size={11} /> Epic: Platform Infrastructure
              </span>
            </div>

            {/* Quick Action Controls & Team Presence */}
            <div className="flex items-center gap-2">
              {/* Active Team Member Presence Stack */}
              <div className="hidden sm:flex items-center -space-x-2 mr-1" title="Teammates currently viewing this task">
                {activePresenceUsers.map((u, i) => (
                  <div key={u.id || i} className="relative group">
                    <span className="ring-2 ring-emerald-500 rounded-full inline-block">
                      <Avatar name={u.name} src={u.avatarUrl} size={22} />
                    </span>
                    <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-1 ring-surface" />
                  </div>
                ))}
              </div>

              {/* AI Executive Summary Button */}
              <button
                onClick={handleAiSummarize}
                title="✨ AI Executive Recap"
                className="p-1.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors flex items-center gap-1 text-xs font-bold"
              >
                <Sparkles size={14} />
                <span className="hidden md:inline">AI Recap</span>
              </button>

              {/* Watcher Button */}
              <button
                onClick={handleToggleWatch}
                title="Watch task for updates"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isWatching
                    ? "bg-selected text-selected-text border-selected-text/30"
                    : "bg-surface border-border text-text-subtle hover:text-text hover:bg-neutral"
                }`}
              >
                <Eye size={13} />
                <span>{watchersCount}</span>
              </button>

              <div className="h-4 w-px bg-border my-auto mx-0.5" />

              {/* Drawer Width Switcher */}
              <button
                onClick={() => setIsWideMode(!isWideMode)}
                title={isWideMode ? "Switch to standard width" : "Switch to wide width"}
                className="p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors"
              >
                {isWideMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Full Page Link */}
              <Link
                href={`/projects/${issue.projectKey}/issues/${issue.key}`}
                target="_blank"
                rel="noreferrer"
                title="Open full page"
                className="p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors flex items-center gap-1 text-xs"
              >
                <ExternalLink size={15} />
              </Link>

              {/* Share / Copy Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  title="Share or copy links"
                  className="p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors"
                >
                  <Share2 size={16} />
                </button>

                {showShareMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-xl z-50 py-1 text-xs animate-fade-in">
                    <button
                      onClick={() => copyToClipboard(`[${issue.key}: ${summary}](${issueUrl})`, "Copied Markdown link!")}
                      className="w-full text-left px-3 py-2 hover:bg-neutral flex items-center gap-2 text-text font-medium"
                    >
                      <Copy size={13} className="text-brand" />
                      <span>Copy Markdown Link</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(issue.key, "Copied task key!")}
                      className="w-full text-left px-3 py-2 hover:bg-neutral flex items-center gap-2 text-text font-medium"
                    >
                      <Tag size={13} className="text-text-subtle" />
                      <span>Copy Task Key</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(issueUrl, "Copied direct link!")}
                      className="w-full text-left px-3 py-2 hover:bg-neutral flex items-center gap-2 text-text font-medium border-t border-border/50"
                    >
                      <ExternalLink size={13} className="text-text-subtle" />
                      <span>Copy Direct URL</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Delete Task */}
              <button
                onClick={handleDelete}
                title="Delete task"
                className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
              >
                <Trash2 size={16} />
              </button>

              {/* Close Drawer */}
              <button
                onClick={onClose}
                title="Close (Esc)"
                className="p-1.5 rounded-lg text-text-subtle hover:bg-neutral hover:text-text transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Column (65%) */}
            <div className="md:col-span-2 flex flex-col gap-6">
              {/* Dependency Blocker Warning Guard Banner */}
              {isBlocked && (
                <div className="p-3.5 rounded-[12px] bg-danger/10 border border-danger/30 text-danger text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="shrink-0 text-danger" />
                    <span>
                      <strong>Blocked by task:</strong> {activeBlockers[0].key} ({activeBlockers[0].summary})
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold bg-danger/20 text-danger px-2.5 py-0.5 rounded-full">
                    {activeBlockers[0].status}
                  </span>
                </div>
              )}

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

              {/* Description & AI Acceptance Criteria Action */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider">Description</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAiGenerateAcceptanceCriteria}
                      className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} /> ✨ Acceptance Criteria
                    </button>
                    <span className="text-[10px] text-text-subtle italic">Hotkey &apos;E&apos; to edit</span>
                  </div>
                </div>

                {isEditingDescription ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onPaste={handlePasteImage}
                      placeholder="Add a detailed description… Markdown & Cmd+V image paste supported"
                      rows={5}
                      className="w-full text-sm text-text bg-surface border border-brand rounded-lg p-3 outline-none resize-none font-mono"
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
                      <p className="whitespace-pre-wrap leading-relaxed">{issue.description}</p>
                    ) : (
                      <span className="text-text-subtle text-xs italic">Add a detailed description…</span>
                    )}
                  </div>
                )}
              </div>

              {/* Subtasks Section & AI Auto-Decomposer */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-brand" />
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                      Subtasks ({completedSubtasks}/{subtasks.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {subtasks.length > 0 && (
                      <span className="text-xs font-bold font-mono text-brand">
                        {subtaskProgressPercent}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtask Progress Bar */}
                {subtasks.length > 0 && (
                  <div className="h-2 w-full bg-surface-sunken border border-border/40 rounded-full overflow-hidden p-0.5 shadow-inner">
                    <div
                      style={{ width: `${subtaskProgressPercent}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-xs"
                    />
                  </div>
                )}

                {/* Subtasks Checklist List */}
                <div className="flex flex-col gap-1.5">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      onClick={() => handleToggleSubtask(st.id)}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken hover:bg-neutral/50 border border-border/40 cursor-pointer text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <button type="button" className="text-brand">
                          {st.status === "DONE" ? (
                            <CheckSquare size={16} className="text-emerald-500" />
                          ) : (
                            <Square size={16} className="text-text-subtle group-hover:text-brand" />
                          )}
                        </button>
                        <span className={`font-medium ${st.status === "DONE" ? "line-through text-text-subtle" : "text-text"}`}>
                          {st.summary}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-text-subtle">{st.key}</span>
                    </div>
                  ))}
                </div>

                {/* Add Subtask Inline Form */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="+ Add subtask (press Enter)"
                    className="flex-1 h-8 px-3 text-xs rounded-lg border border-border bg-surface text-text outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 bg-neutral hover:bg-neutral/80 text-text font-bold text-xs rounded-lg"
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Developer Context Section (Git PRs & Commits) */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitPullRequest size={16} className="text-brand" />
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider">Developer Context</h3>
                  </div>
                  <button
                    onClick={() => setShowAddPrModal(!showAddPrModal)}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                  >
                    + Link PR
                  </button>
                </div>

                {showAddPrModal && (
                  <form onSubmit={handleAddPr} className="flex gap-2 p-2.5 bg-neutral/30 rounded-lg border border-border">
                    <input
                      type="text"
                      value={newPrInput}
                      onChange={(e) => setNewPrInput(e.target.value)}
                      placeholder="PR Title or #number..."
                      className="flex-1 h-7 px-2 text-xs rounded border border-border bg-surface text-text outline-none"
                    />
                    <button type="submit" className="h-7 px-2.5 bg-brand text-white font-bold text-xs rounded">
                      Save
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-2">
                  {/* PRs */}
                  {pullRequests.map((pr) => (
                    <div key={pr.number} className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs">
                      <div className="flex items-center gap-2 font-mono">
                        <GitPullRequest size={14} className="text-purple-500" />
                        <span className="font-bold text-text">#{pr.number}</span>
                        <span className="text-text font-sans font-medium">{pr.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pr.status === "MERGED"
                            ? "bg-purple-500/10 text-purple-600 border border-purple-500/30"
                            : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                        }`}
                      >
                        {pr.status}
                      </span>
                    </div>
                  ))}

                  {/* Commits */}
                  {commits.map((cm) => (
                    <div key={cm.hash} className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <GitCommit size={14} className="text-brand" />
                        <span className="font-bold text-brand">{cm.hash}</span>
                        <span className="text-text font-sans font-medium">{cm.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Issues / Dependencies */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-brand" />
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider">Linked Issues</h3>
                  </div>
                  <button
                    onClick={() => setShowAddLinkModal(!showAddLinkModal)}
                    className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                  >
                    + Link issue
                  </button>
                </div>

                {showAddLinkModal && (
                  <form onSubmit={handleAddLink} className="flex gap-2 p-2.5 bg-neutral/30 rounded-lg border border-border">
                    <select
                      value={linkRelationInput}
                      onChange={(e) => setLinkRelationInput(e.target.value)}
                      className="h-7 px-2 text-xs rounded border border-border bg-surface text-text font-medium"
                    >
                      <option value="BLOCKS">Blocks</option>
                      <option value="IS_BLOCKED_BY">Is blocked by</option>
                      <option value="RELATES_TO">Relates to</option>
                    </select>
                    <input
                      type="text"
                      value={linkKeyInput}
                      onChange={(e) => setLinkKeyInput(e.target.value)}
                      placeholder="Issue Key (e.g. TRACK-12)..."
                      className="flex-1 h-7 px-2 text-xs rounded border border-border bg-surface text-text outline-none"
                    />
                    <button type="submit" className="h-7 px-2.5 bg-brand text-white font-bold text-xs rounded">
                      Link
                    </button>
                  </form>
                )}

                <div className="flex flex-col gap-2">
                  {linkedIssues.map((lk) => (
                    <div key={lk.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-subtle bg-neutral px-1.5 py-0.5 rounded">
                          {lk.relation.replace(/_/g, " ")}
                        </span>
                        <span className="font-bold font-mono text-brand">{lk.key}</span>
                        <span className="text-text font-medium">{lk.summary}</span>
                      </div>
                      <span className="text-[10px] font-bold text-text-subtle bg-neutral px-2 py-0.5 rounded">
                        {lk.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip size={16} className="text-brand" />
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                      Attachments ({attachments.length})
                    </h3>
                  </div>
                  <label className="text-[11px] font-bold text-brand hover:underline cursor-pointer">
                    + Upload
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-sunken border border-border/50 text-xs group"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip size={14} className="text-text-subtle shrink-0" />
                        <span className="truncate font-medium text-text">{att.filename}</span>
                      </div>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-brand hover:underline ml-2"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
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
                    <button
                      onClick={() => setActiveTab("development")}
                      className={`pb-3 -mb-3 transition-colors flex items-center gap-1.5 ${
                        activeTab === "development" ? "border-b-2 border-brand text-brand font-bold" : "hover:text-text"
                      }`}
                    >
                      <Layers size={14} className="text-purple-600" /> Development & Apps ⚡
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
                        <span className="text-[10px] text-text-subtle ml-auto italic">Cmd+V paste image • Hotkey &apos;C&apos;</span>
                      </div>

                      <textarea
                        ref={commentInputRef}
                        rows={3}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onPaste={handlePasteImage}
                        placeholder="Type your comment or update... Markdown & Cmd+V image paste supported"
                        className="w-full rounded border border-border bg-surface p-2.5 text-xs outline-none focus:border-brand font-sans"
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

                    {/* Comments Feed Feed */}
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
                                  {typeof c.createdAt === "string" ? c.createdAt.split("T")[0] : "Recently"}
                                </span>
                              </div>
                              <p className="text-text whitespace-pre-wrap leading-relaxed mb-2">{c.body || c.text}</p>

                              {/* Comment Emoji Reactions Bar */}
                              <div className="flex items-center gap-1.5">
                                {["👍", "🚀", "❤️", "👀"].map((emoji) => {
                                  const count = (c.reactions && c.reactions[emoji]) || 0;
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => handleToggleCommentReaction(c.id, emoji)}
                                      className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${
                                        count > 0 ? "bg-brand/10 border-brand/40 text-brand" : "bg-neutral/40 border-border text-text-subtle hover:bg-neutral"
                                      }`}
                                    >
                                      {emoji} {count > 0 ? count : ""}
                                    </button>
                                  );
                                })}
                              </div>
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

                {/* Tab 4: Development & Superpowers */}
                {activeTab === "development" && (
                  <div className="flex flex-col gap-4">
                    <DevelopmentPanel
                      projectId={issue?.projectId || issue?.project?.id || ""}
                      issueKey={issue.key}
                      branches={devData.branches}
                      pullRequests={devData.pullRequests}
                      commits={devData.commits}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Attributes Column (35%) */}
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
                  className={`w-full h-9 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    isBlocked && issue.status !== "DONE"
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20"
                      : issue.status === "DONE"
                      ? "bg-neutral text-text hover:bg-neutral/80 border border-border"
                      : "bg-brand text-white hover:bg-brand-hovered"
                  }`}
                >
                  {isBlocked && issue.status !== "DONE" && <ShieldAlert size={14} className="text-amber-500" />}
                  <span>
                    {isBlocked && issue.status !== "DONE"
                      ? `Start Progress (${activeBlockers[0].key})`
                      : issue.status === "TO_DO"
                      ? "Start Progress"
                      : issue.status === "IN_PROGRESS"
                      ? "Submit for Review"
                      : issue.status === "IN_REVIEW"
                      ? "Mark Complete ✓"
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
                  className={`h-9 px-3 text-xs font-bold rounded-lg border border-border outline-none transition-all cursor-pointer ${currentStatus.bg} ${currentStatus.text}`}
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
                      onClick={() => handleAssigneeSelect(availableUsers[0].id)}
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

              {/* Development & Superpowers Summary Card (Jira-style sidebar badge) */}
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
                <div
                  onClick={() => setActiveTab("development")}
                  className="p-3 rounded-xl border border-border bg-neutral/20 hover:bg-neutral/40 transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text flex items-center gap-1.5 truncate">
                      <GitPullRequest size={13} className="text-purple-600 shrink-0" /> 1 Pull Request
                    </span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono bg-purple-500/10 text-purple-600 shrink-0">
                      #42 MERGED
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-subtle">
                    <span className="flex items-center gap-1 font-mono truncate">
                      <GitBranch size={11} className="text-brand shrink-0" /> 1 Branch
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-bold shrink-0">● Vercel Ready</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-border/50 text-[10px] text-purple-600 font-extrabold">
                    <span className="flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500" /> 8 Superpowers Available
                    </span>
                    <span>View All →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
