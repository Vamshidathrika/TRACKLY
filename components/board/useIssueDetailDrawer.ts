import { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { getIssueDevelopmentDataAction } from "@/app/(app)/projects/[key]/issues/actions";
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
import { getReleasesAction } from "@/app/(app)/projects/[key]/releases/actions";
import type { BoardIssue, BoardUserOption } from "./IssueCard";
import type { IssueStatus, IssuePriority, IssueType, LinkRelation } from "@prisma/client";
import { ISSUE_TYPES as issueTypes, PRIORITY_CONFIG as priorityIcons, ISSUE_STATUSES as statuses } from "@/lib/issues-config";

// Include mapLinks helper
function mapLinks(
  linksOut: any[] | undefined,
  linksIn: any[] | undefined
): any[] {
  const out = (linksOut ?? []).flatMap((l) =>
    l.targetIssue
      ? [{ id: l.id, relation: l.relation, key: l.targetIssue.key, summary: l.targetIssue.summary, status: l.targetIssue.status }]
      : []
  );
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

export function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    const d = new Date(date);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function getDueDateStatus(dueDateStr: string, currentStatus: string) {
  if (!dueDateStr || currentStatus === "DONE") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { type: "overdue", label: `Overdue by ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? "day" : "days"}`, bg: "bg-danger/10 text-danger border-danger/30" };
  } else if (diffDays === 0) {
    return { type: "today", label: "Due today", bg: "bg-warning/20 text-warning-text border-warning/40" };
  } else if (diffDays <= 3) {
    return { type: "soon", label: `Due in ${diffDays} ${diffDays === 1 ? "day" : "days"}`, bg: "bg-brand/10 text-brand border-brand/30" };
  }
  return null;
}

export function useIssueDetailDrawer({ issue, onClose, onUpdateIssue, onDeleteIssue, availableUsers }: { issue: any, onClose: any, onUpdateIssue: any, onDeleteIssue: any, availableUsers: any[] }) {
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
  const [releaseId, setReleaseId] = useState<string>("");
  const [availableReleases, setAvailableReleases] = useState<{ id: string; name: string }[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelDraft, setLabelDraft] = useState<string>("");
  const lastIssueIdRef = useRef<string | null>(null);

  // Superpower State: Active Presence & Collaboration
  const activePresenceUsers = useMemo<BoardUserOption[]>(() => {
    return availableUsers.slice(0, 3);
  }, [availableUsers]);

  // Superpower State: Engagement & Voting
  const [watchersCount, setWatchersCount] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [viewsCount, setViewsCount] = useState<number>((issue as any)?.viewsCount ?? 1);
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
      const isNewIssue = lastIssueIdRef.current !== issue.id;
      lastIssueIdRef.current = issue.id;

      setSummary(issue.summary);
      setDescription(issue.description || "");
      setPoints(typeof issue.storyPoints === "number" && issue.storyPoints > 0 ? issue.storyPoints : (issue.storyPoints === 0 ? 0 : ""));
      // The Prisma field is `originalEstimate`; the detail payload also maps it.
      // Check all possible field names to be resilient across card vs detail payload shapes.
      const rawEstimate =
        (typeof issue.estimatedHours === "number" && issue.estimatedHours > 0 ? issue.estimatedHours : null) ??
        (typeof issue.originalEstimate === "number" && issue.originalEstimate > 0 ? issue.originalEstimate : null) ??
        (typeof issue.estimate === "number" && issue.estimate > 0 ? issue.estimate : null);
      setEstimateHours(rawEstimate !== null ? rawEstimate : "");
      setReporterId(issue.reporterId || issue.reporter?.id || "");
      setReleaseId(issue.releaseId || "");
      setStartDate(toDateInput(issue.startDate));
      setDueDate(toDateInput(issue.dueDate));
      setLabels(issue.labels || []);

      if (isNewIssue) {
        setIsEditingSummary(false);
        setIsEditingDescription(false);
        setCommentInput("");

        setWatchersCount(issue.watchers?.length ?? 0);
        setIsWatching(issue.isWatching ?? false);
        setIsLoadingDetail(false);

        setSubtasks(issue.subtasks || []);
        setPullRequests(issue.devContext?.pullRequests || []);
        setCommits(issue.devContext?.commits || []);
        setLinkedIssues(mapLinks(issue.linksOut, issue.linksIn));
        setAttachments(issue.attachments || []);

        const logs = issue.workLogs || [];
        setWorkLogsList(logs);
        setCommentsList(issue.comments || []);
        setHistoryList(issue.history || []);
        const totalLogged = issue.loggedHours ?? logs.reduce((sum: number, w: any) => sum + Number(w.hours || 0), 0);
        setLoggedHours(totalLogged);
      } else {
        if (issue.workLogs && issue.workLogs.length > 0) setWorkLogsList(issue.workLogs);
        if (issue.comments && issue.comments.length > 0) setCommentsList(issue.comments);
        if (issue.history && issue.history.length > 0) setHistoryList(issue.history);
        if (typeof issue.loggedHours === "number") setLoggedHours(issue.loggedHours);
      }

      if (issue.id && !issue.id.startsWith("demo-")) {
        if (isNewIssue) setIsLoadingDetail(true);
        getIssueDevelopmentDataAction(issue.id).then((res) => {
          if (res) {
            setDevData(res);
            if (res.pullRequests && res.pullRequests.length > 0) {
              setPullRequests(res.pullRequests.map((p) => ({ number: p.prNumber, title: p.title, status: p.status as any, url: p.url ?? undefined })));
            }
            if (res.commits && res.commits.length > 0) {
              setCommits(res.commits.map((c) => ({ hash: c.hash, message: c.message, url: c.url ?? undefined })));
            }
          }
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
    // Show loading state immediately so the UI can display a skeleton
    // for work logs and other detail-only data instead of stale empty state.
    setIsLoadingDetail(true);

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
        if (typeof detail.viewsCount === "number") setViewsCount(detail.viewsCount);
        setReleaseId(detail.releaseId || "");
        // Sync estimate from authoritative DB payload — the board card projection
        // omits originalEstimate, so the progress bar stays at 0% until this runs.
        const detailEstimate =
          (typeof (detail as any).estimatedHours === "number" && (detail as any).estimatedHours > 0
            ? (detail as any).estimatedHours
            : null) ??
          (typeof detail.originalEstimate === "number" && detail.originalEstimate > 0
            ? detail.originalEstimate
            : null);
        if (detailEstimate !== null) setEstimateHours(detailEstimate);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    const projectId = issue.projectId || issue.project?.id;
    if (projectId) {
      getReleasesAction(projectId).then((res) => {
        if (!cancelled && res.success) setAvailableReleases(res.releases);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [issue?.id]);

  if (!issue) return null;

  const currentType = issueTypes.find((t) => t.value === issue.type) || issueTypes[1];
  const currentPriority = priorityIcons[issue.priority as keyof typeof priorityIcons] || priorityIcons.MEDIUM;
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

  const handleReleaseSelect = (newReleaseId: string) => {
    if (newReleaseId === releaseId) return;
    setReleaseId(newReleaseId);
    startTransition(async () => {
      await updateIssueFieldAction(issue.id, "releaseId", newReleaseId || null);
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
    showToast("AI generated Acceptance Criteria template!");
  };

  // Superpower Action: AI Executive Summary Recap
  const handleAiSummarize = () => {
    const prCount = pullRequests.filter((p) => p.status === "MERGED").length;
    const prText = prCount === 1 ? "1 PR merged" : `${prCount} PRs merged`;
    showToast(`AI Recap: ${issue.key} is an active ${issue.type.toLowerCase()} with ${completedSubtasks}/${subtasks.length} subtasks completed and ${prText}.`);
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

  const handleAddSubtask = (title: string) => {
    if (!title.trim()) return;
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

  const handlePostComment = (text: string) => {
    if (!text.trim()) return;
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

  const actionChips = ["Approved", "Please review", "Needs info", "In progress"];

  // Copy Menu Actions
  const copyToClipboard = (text: string, msg: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      showToast(msg);
      setShowShareMenu(false);
    }
  };

 // dummy replace so we don't break JS

  return {
    isWideMode, setIsWideMode,
    summary, setSummary,
    description, setDescription,
    isEditingSummary, setIsEditingSummary,
    isEditingDescription, setIsEditingDescription,
    points, setPoints,
    estimateHours, setEstimateHours,
    reporterId, setReporterId,
    releaseId, setReleaseId,
    availableReleases, setAvailableReleases,
    startDate, setStartDate,
    dueDate, setDueDate,
    labels, setLabels,
    activePresenceUsers,
    watchersCount, setWatchersCount,
    isWatching, setIsWatching,
    viewsCount, setViewsCount,
    isLoadingDetail, setIsLoadingDetail,
    subtasks, setSubtasks,
    pullRequests, setPullRequests,
    commits, setCommits,
    showAddPrModal, setShowAddPrModal,
    newPrInput, setNewPrInput,
    linkedIssues, setLinkedIssues,
    showAddLinkModal, setShowAddLinkModal,
    linkKeyInput, setLinkKeyInput,
    linkRelationInput, setLinkRelationInput,
    attachments, setAttachments,
    isDraggingFile, setIsDraggingFile,
    isUploading, setIsUploading,
    activeTab, setActiveTab,
    commentsList, setCommentsList,
    historyList, setHistoryList,
    workLogsList, setWorkLogsList,
    loggedHours, setLoggedHours,
    showTimeModal, setShowTimeModal,
    toastMessage, setToastMessage,
    devData, setDevData,
    showToast,
    handleSummaryBlur,
    handleDescriptionSave,
    handleStatusSelect,
    handleWorkflowTransition,
    handlePrioritySelect,
    handleTypeSelect,
    handleReleaseSelect,
    handleAssigneeSelect,
    handleReporterSelect,
    handlePointsBlur,
    handleEstimateBlur,
    handleStartDateChange,
    handleDueDateChange,
    handleAddLabel,
    handleRemoveLabel,
    handleAiGenerateAcceptanceCriteria,
    handleAiSummarize,
    handlePasteImage,
    refreshDetail,
    handleToggleSubtask,
    handleDeleteSubtask,
    handleAddSubtask,
    handleToggleWatch,
    handleAddPr,
    handleAddLink,
    handleRemoveLink,
    uploadFiles,
    handleFileUpload,
    handleDeleteAttachment,
    handleDelete,
    handlePostComment,
    handleToggleCommentReaction,
    currentType: issueTypes.find((t) => t.value === issue?.type) || issueTypes[1],
    currentPriority: (issue?.priority && priorityIcons[issue.priority as keyof typeof priorityIcons]) || priorityIcons.MEDIUM,
    currentStatus: statuses.find((s) => s.value === issue?.status) || statuses[0],
    dueDateStatus: getDueDateStatus(dueDate, issue?.status),
    completedSubtasks: subtasks.filter((s: any) => s.status === "DONE").length,
    activeBlockers: linkedIssues.filter((lk: any) => lk.relation === "IS_BLOCKED_BY" && lk.status !== "DONE"),
  };
}
