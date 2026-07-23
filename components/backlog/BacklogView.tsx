"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Play,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Calendar,
  X,
  Target,
  GripVertical,
  Trash2,
  User,
  Zap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { IssueFilterToolbar, type TeammateUser } from "@/components/issues/IssueFilterToolbar";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import {
  createSprintAction,
  updateSprintAction,
  startSprintAction,
  completeSprintAction,
  moveIssueToSprintAction,
  quickCreateIssueAction,
  bulkUpdateIssuesAction,
  bulkDeleteIssuesAction,
} from "@/app/(app)/projects/[key]/backlog/actions";
import type { IssueType, IssueStatus, IssuePriority, SprintStatus } from "@prisma/client";

export type BacklogIssue = {
  id: string;
  key: string;
  summary: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  storyPoints?: number | null;
  sprintId?: string | null;
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
  projectKey: string;
};

export type SprintData = {
  id: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  issues: BacklogIssue[];
};

const statusColors: Record<IssueStatus, string> = {
  TO_DO: "bg-neutral text-subtle border-border-default",
  IN_PROGRESS: "bg-brand/10 text-brand border-brand/20 font-semibold",
  IN_REVIEW: "bg-purple/10 text-purple border-purple/20 font-semibold",
  DONE: "bg-success/10 text-success border-success/20 font-semibold",
};

export function BacklogView({
  projectId,
  projectKey,
  sprints: initialSprints,
  backlogIssues: initialBacklog,
  availableUsers: passedUsers = [],
}: {
  projectId: string;
  projectKey: string;
  sprints: SprintData[];
  backlogIssues: BacklogIssue[];
  availableUsers?: TeammateUser[];
}) {
  const [, startTransition] = useTransition();
  const [sprints, setSprints] = useState<SprintData[]>(initialSprints);
  const [backlog, setBacklog] = useState<BacklogIssue[]>(initialBacklog);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  // Quick Inline Issue creation states per block (sprintId or 'backlog')
  const [quickInputTarget, setQuickInputTarget] = useState<string | null>(null);
  const [quickSummary, setQuickSummary] = useState("");

  // Filters state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Multi-select bulk state
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);

  // Extract all available team users dynamically
  const allUsers = useMemo(() => {
    const userMap = new Map<string, TeammateUser>();
    passedUsers.forEach((u) => userMap.set(u.id, u));

    const collectIssueUsers = (i: BacklogIssue) => {
      if (i.assignee) {
        userMap.set(i.assignee.id, {
          id: i.assignee.id,
          name: i.assignee.name,
          avatarUrl: i.assignee.avatarUrl,
        });
      }
    };

    backlog.forEach(collectIssueUsers);
    sprints.forEach((s) => s.issues.forEach(collectIssueUsers));

    return Array.from(userMap.values());
  }, [backlog, sprints, passedUsers]);

  // Helper filter function
  const filterSingleIssue = (i: BacklogIssue) => {
    const matchesSearch =
      !searchQuery ||
      i.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.key.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesUser = true;
    if (filterUnassigned) {
      matchesUser = !i.assignee;
    } else if (selectedUserId) {
      matchesUser = i.assignee?.id === selectedUserId;
    }

    const matchesStatus = statusFilter === "ALL" || i.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || i.priority === priorityFilter;
    const matchesType = typeFilter === "ALL" || i.type === typeFilter;

    return matchesSearch && matchesUser && matchesStatus && matchesPriority && matchesType;
  };

  const filteredBacklog = useMemo(
    () => backlog.filter(filterSingleIssue),
    [backlog, searchQuery, filterUnassigned, selectedUserId, statusFilter, priorityFilter, typeFilter]
  );

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<SprintData | null>(null);

  const handleOpenCreateSprint = () => {
    setEditingSprint(null);
    setIsSprintModalOpen(true);
  };

  const handleOpenEditSprint = (sprint: SprintData) => {
    setEditingSprint(sprint);
    setIsSprintModalOpen(true);
  };

  const handleSaveSprintModal = async (data: {
    id?: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
  }) => {
    setIsCreatingSprint(true);
    if (data.id) {
      await updateSprintAction(data.id, {
        name: data.name,
        goal: data.goal,
        startDate: data.startDate,
        endDate: data.endDate,
      });
      setSprints((prev) =>
        prev.map((s) =>
          s.id === data.id
            ? {
                ...s,
                name: data.name,
                goal: data.goal,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
              }
            : s
        )
      );
    } else {
      const res = await createSprintAction(projectId, data.name, data.goal, data.startDate, data.endDate);
      if (res && res.sprint) {
        setSprints((prev) => [...prev, res.sprint as SprintData]);
      }
    }
    setIsCreatingSprint(false);
    setIsSprintModalOpen(false);
  };

  const handleStartSprint = async (sprintId: string) => {
    await startSprintAction(sprintId);
    setSprints((prev) => prev.map((s) => (s.id === sprintId ? { ...s, status: "ACTIVE" } : s)));
  };

  const handleCompleteSprint = async (sprintId: string) => {
    await completeSprintAction(sprintId);
    setSprints((prev) =>
      prev.map((s) => {
        if (s.id === sprintId) {
          // move incomplete to backlog optimistically
          const unDone = s.issues.filter((i) => i.status !== "DONE");
          const done = s.issues.filter((i) => i.status === "DONE");
          setBacklog((b) => [...b, ...unDone.map((i) => ({ ...i, sprintId: null }))]);
          return { ...s, status: "CLOSED", issues: done };
        }
        return s;
      })
    );
  };

  // Drag and drop movement handler (optimistic & instant)
  const handleMoveIssueToTarget = async (issueId: string, targetSprintId: string | null) => {
    // 1. Locate issue
    let movedIssue: BacklogIssue | null = null;
    let fromSprintId: string | null = null;

    const inBacklog = backlog.find((i) => i.id === issueId);
    if (inBacklog) {
      movedIssue = inBacklog;
      fromSprintId = null;
    } else {
      for (const s of sprints) {
        const found = s.issues.find((i) => i.id === issueId);
        if (found) {
          movedIssue = found;
          fromSprintId = s.id;
          break;
        }
      }
    }

    if (!movedIssue || fromSprintId === targetSprintId) return;

    const updatedIssue = { ...movedIssue, sprintId: targetSprintId };

    // Optimistically update UI
    if (fromSprintId === null) {
      setBacklog((prev) => prev.filter((i) => i.id !== issueId));
    } else {
      setSprints((prev) =>
        prev.map((s) => (s.id === fromSprintId ? { ...s, issues: s.issues.filter((i) => i.id !== issueId) } : s))
      );
    }

    if (targetSprintId === null) {
      setBacklog((prev) => [updatedIssue, ...prev]);
    } else {
      setSprints((prev) =>
        prev.map((s) => (s.id === targetSprintId ? { ...s, issues: [updatedIssue, ...s.issues] } : s))
      );
    }

    // Persist to server
    startTransition(async () => {
      await moveIssueToSprintAction(issueId, targetSprintId);
    });
  };

  // Quick inline creation submit
  const handleQuickCreateSubmit = async (targetSprintId: string | null) => {
    if (!quickSummary.trim()) return;
    const summaryText = quickSummary.trim();
    setQuickSummary("");
    setQuickInputTarget(null);

    const tempId = `temp-${Date.now()}`;
    const newTempIssue: BacklogIssue = {
      id: tempId,
      key: `${projectKey}-…`,
      summary: summaryText,
      type: "TASK",
      status: "TO_DO",
      priority: "MEDIUM",
      sprintId: targetSprintId,
      projectKey,
    };

    if (targetSprintId === null) {
      setBacklog((prev) => [newTempIssue, ...prev]);
    } else {
      setSprints((prev) =>
        prev.map((s) => (s.id === targetSprintId ? { ...s, issues: [newTempIssue, ...s.issues] } : s))
      );
    }

    const res = await quickCreateIssueAction({
      projectId,
      summary: summaryText,
      sprintId: targetSprintId,
    });

    if (res?.success && res.issue) {
      const created = { ...res.issue, projectKey } as BacklogIssue;
      if (targetSprintId === null) {
        setBacklog((prev) => prev.map((i) => (i.id === tempId ? created : i)));
      } else {
        setSprints((prev) =>
          prev.map((s) =>
            s.id === targetSprintId ? { ...s, issues: s.issues.map((i) => (i.id === tempId ? created : i)) } : s
          )
        );
      }
    }
  };

  const handleStatusChange = (issueId: string, newStatus: IssueStatus) => {
    setBacklog((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)));
    setSprints((prev) =>
      prev.map((s) => ({
        ...s,
        issues: s.issues.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)),
      }))
    );
    startTransition(async () => {
      await updateIssueFieldAction(issueId, "status", newStatus);
    });
  };

  const handlePriorityChange = (issueId: string, newPriority: IssuePriority) => {
    setBacklog((prev) => prev.map((i) => (i.id === issueId ? { ...i, priority: newPriority } : i)));
    setSprints((prev) =>
      prev.map((s) => ({
        ...s,
        issues: s.issues.map((i) => (i.id === issueId ? { ...i, priority: newPriority } : i)),
      }))
    );
    startTransition(async () => {
      await updateIssueFieldAction(issueId, "priority", newPriority);
    });
  };

  const handleAssigneeChange = (issueId: string, assigneeId: string | null) => {
    const targetUser = allUsers.find((u) => u.id === assigneeId);
    const updatedAssignee = targetUser ? { id: targetUser.id, name: targetUser.name, avatarUrl: targetUser.avatarUrl } : null;

    setBacklog((prev) => prev.map((i) => (i.id === issueId ? { ...i, assignee: updatedAssignee } : i)));
    setSprints((prev) =>
      prev.map((s) => ({
        ...s,
        issues: s.issues.map((i) => (i.id === issueId ? { ...i, assignee: updatedAssignee } : i)),
      }))
    );
    startTransition(async () => {
      await updateIssueFieldAction(issueId, "assigneeId", assigneeId || "");
    });
  };

  const handleClearFilters = () => {
    setSelectedUserId(null);
    setFilterUnassigned(false);
    setSearchQuery("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
  };

  const handleToggleSelectIssue = (id: string) => {
    setSelectedIssueIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkStatusChange = (newStatus: IssueStatus) => {
    setBacklog((prev) => prev.map((i) => (selectedIssueIds.includes(i.id) ? { ...i, status: newStatus } : i)));
    setSprints((prev) =>
      prev.map((s) => ({
        ...s,
        issues: s.issues.map((i) => (selectedIssueIds.includes(i.id) ? { ...i, status: newStatus } : i)),
      }))
    );
    startTransition(async () => {
      await bulkUpdateIssuesAction(selectedIssueIds, { status: newStatus });
    });
  };

  const handleBulkPriorityChange = (newPriority: IssuePriority) => {
    setBacklog((prev) => prev.map((i) => (selectedIssueIds.includes(i.id) ? { ...i, priority: newPriority } : i)));
    setSprints((prev) =>
      prev.map((s) => ({
        ...s,
        issues: s.issues.map((i) => (selectedIssueIds.includes(i.id) ? { ...i, priority: newPriority } : i)),
      }))
    );
    startTransition(async () => {
      await bulkUpdateIssuesAction(selectedIssueIds, { priority: newPriority });
    });
  };

  const handleBulkAssigneeChange = (assigneeId: string | null) => {
    const targetUser = allUsers.find((u) => u.id === assigneeId);
    const updatedAssignee = targetUser ? { id: targetUser.id, name: targetUser.name, avatarUrl: targetUser.avatarUrl } : null;

    setBacklog((prev) => prev.map((i) => (selectedIssueIds.includes(i.id) ? { ...i, assignee: updatedAssignee } : i)));
    setSprints((prev) =>
      prev.map((s) => ({
        ...s,
        issues: s.issues.map((i) => (selectedIssueIds.includes(i.id) ? { ...i, assignee: updatedAssignee } : i)),
      }))
    );
    startTransition(async () => {
      await bulkUpdateIssuesAction(selectedIssueIds, { assigneeId });
    });
  };

  const handleBulkDelete = () => {
    setBacklog((prev) => prev.filter((i) => !selectedIssueIds.includes(i.id)));
    setSprints((prev) =>
      prev.map((s) => ({
        ...s,
        issues: s.issues.filter((i) => !selectedIssueIds.includes(i.id)),
      }))
    );
    const idsToDelete = [...selectedIssueIds];
    setSelectedIssueIds([]);
    startTransition(async () => {
      await bulkDeleteIssuesAction(idsToDelete);
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl relative pb-20">
      {/* Floating Apple-Style Multi-Select Bulk Actions Toolbar */}
      {selectedIssueIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border-default bg-surface-overlay backdrop-blur-xl p-2 px-5 shadow-xl animate-fade-in-up">
          <span className="text-[12px] font-bold text-brand font-mono">
            {selectedIssueIds.length} selected
          </span>
          <div className="h-4 w-px bg-border-default" />

          {/* Bulk Status */}
          <select
            onChange={(e) => e.target.value && handleBulkStatusChange(e.target.value as IssueStatus)}
            defaultValue=""
            className="h-8 rounded-[8px] border border-border-default bg-surface px-2.5 text-[12px] font-semibold text-default outline-none hover:bg-neutral transition-colors cursor-pointer"
          >
            <option value="" disabled>Status…</option>
            <option value="TO_DO">TO DO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="IN_REVIEW">IN REVIEW</option>
            <option value="DONE">DONE</option>
          </select>

          {/* Bulk Priority */}
          <select
            onChange={(e) => e.target.value && handleBulkPriorityChange(e.target.value as IssuePriority)}
            defaultValue=""
            className="h-8 rounded-[8px] border border-border-default bg-surface px-2.5 text-[12px] font-semibold text-default outline-none hover:bg-neutral transition-colors cursor-pointer"
          >
            <option value="" disabled>Priority…</option>
            <option value="HIGHEST">Highest</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="LOWEST">Lowest</option>
          </select>

          {/* Bulk Assignee */}
          <select
            onChange={(e) => handleBulkAssigneeChange(e.target.value || null)}
            defaultValue=""
            className="h-8 rounded-[8px] border border-border-default bg-surface px-2.5 text-[12px] font-semibold text-default outline-none hover:bg-neutral transition-colors cursor-pointer"
          >
            <option value="" disabled>Assignee…</option>
            <option value="">Unassigned</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Delete */}
          <button
            onClick={handleBulkDelete}
            className="flex h-8 items-center gap-1 px-3 rounded-[8px] bg-danger/10 text-danger hover:bg-danger/20 text-[12px] font-semibold transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setSelectedIssueIds([])}
            className="text-[12px] font-medium text-subtlest hover:text-default px-2"
          >
            Clear
          </button>
        </div>
      )}

      <SprintModal
        isOpen={isSprintModalOpen}
        onClose={() => setIsSprintModalOpen(false)}
        onSave={handleSaveSprintModal}
        initialData={editingSprint}
        defaultSprintNumber={sprints.length + 1}
      />

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-default tracking-tight">Sprint Planning & Backlog</h2>
          <p className="text-[12px] text-subtle mt-0.5">Drag items between sprints, plan iterations, and organize work.</p>
        </div>
        <Button appearance="primary" onClick={handleOpenCreateSprint} disabled={isCreatingSprint}>
          <Plus size={14} /> Create sprint
        </Button>
      </div>

      {/* Profile Circles Filter Toolbar */}
      <IssueFilterToolbar
        users={allUsers}
        selectedUserId={selectedUserId}
        onSelectUser={(id) => {
          setFilterUnassigned(false);
          setSelectedUserId(id);
        }}
        filterUnassigned={filterUnassigned}
        onToggleUnassigned={() => {
          setSelectedUserId(null);
          setFilterUnassigned((prev) => !prev);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onClearFilters={handleClearFilters}
      />

      {/* Sprints Section */}
      <div className="flex flex-col gap-5">
        {sprints.map((sprint) => {
          const sprintFilteredIssues = sprint.issues.filter(filterSingleIssue);
          const totalPoints = sprintFilteredIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
          const donePoints = sprintFilteredIssues
            .filter((i) => i.status === "DONE")
            .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
          const isDragTarget = dragOverTargetId === sprint.id;

          return (
            <div
              key={sprint.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTargetId(sprint.id);
              }}
              onDragLeave={() => setDragOverTargetId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverTargetId(null);
                const issueId = e.dataTransfer.getData("text/plain");
                if (issueId) handleMoveIssueToTarget(issueId, sprint.id);
              }}
              className={`rounded-[14px] border bg-surface p-4 shadow-xs transition-all ${
                isDragTarget
                  ? "border-brand bg-brand/5 ring-2 ring-brand/30"
                  : "border-border-default hover:border-border-strong"
              }`}
            >
              {/* Sprint Card Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-default">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[15px] text-default tracking-tight">{sprint.name}</span>
                    <button
                      onClick={() => handleOpenEditSprint(sprint)}
                      className="p-1 text-subtlest hover:text-brand rounded-[4px] hover:bg-neutral transition-colors"
                      title="Edit sprint details & goal"
                    >
                      <Edit2 size={13} />
                    </button>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase ${
                        sprint.status === "ACTIVE"
                          ? "bg-brand/10 text-brand"
                          : sprint.status === "CLOSED"
                          ? "bg-success/10 text-success"
                          : "bg-neutral text-subtle"
                      }`}
                    >
                      {sprint.status}
                    </span>
                    <span className="text-[12px] font-medium text-subtlest">
                      • {sprintFilteredIssues.length} issues • {donePoints}/{totalPoints} pts
                    </span>
                  </div>

                  {sprint.goal && (
                    <p className="text-[12px] text-subtle flex items-center gap-1.5 font-medium italic">
                      <Target size={12} className="text-brand shrink-0" /> Goal: {sprint.goal}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditSprint(sprint)}
                    className="h-8 px-3 rounded-[8px] border border-border-default bg-surface text-[12px] font-medium text-subtle hover:bg-neutral hover:text-default transition-all"
                  >
                    Edit
                  </button>

                  {sprint.status === "FUTURE" && (
                    <button
                      onClick={() => handleStartSprint(sprint.id)}
                      className="h-8 px-3 rounded-[8px] bg-brand text-white text-[12px] font-semibold hover:bg-brand-hovered transition-all flex items-center gap-1 shadow-sm active:scale-[0.97]"
                    >
                      <Play size={12} /> Start sprint
                    </button>
                  )}

                  {sprint.status === "ACTIVE" && (
                    <button
                      onClick={() => handleCompleteSprint(sprint.id)}
                      className="h-8 px-3 rounded-[8px] border border-border-default bg-surface text-[12px] font-semibold text-success hover:bg-success/10 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 size={13} className="text-success" /> Complete sprint
                    </button>
                  )}
                </div>
              </div>

              {/* Sprint Issue List */}
              <div className="flex flex-col gap-1.5">
                {sprintFilteredIssues.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-subtlest border border-dashed border-border-default rounded-[10px] bg-neutral/30">
                    Drag issues here to plan this sprint.
                  </div>
                ) : (
                  sprintFilteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", issue.id);
                        setDraggedIssueId(issue.id);
                      }}
                      onDragEnd={() => setDraggedIssueId(null)}
                      className={`flex items-center justify-between rounded-[10px] border px-3 py-2 text-[13px] transition-all gap-3 cursor-grab active:cursor-grabbing ${
                        selectedIssueIds.includes(issue.id)
                          ? "border-brand bg-brand/8 ring-1 ring-brand/30"
                          : "border-border-default bg-surface hover:border-brand/40 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <GripVertical size={13} className="text-subtlest shrink-0 opacity-40 hover:opacity-100" />
                        <input
                          type="checkbox"
                          checked={selectedIssueIds.includes(issue.id)}
                          onChange={() => handleToggleSelectIssue(issue.id)}
                          className="h-4 w-4 accent-brand cursor-pointer rounded-[4px]"
                        />
                        <TypeIcon type={issue.type} size={14} />
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.key}`}
                          className="font-mono text-[11px] font-bold text-subtlest hover:text-brand shrink-0"
                        >
                          {issue.key}
                        </Link>
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.key}`}
                          className="font-medium text-default hover:text-brand hover:underline truncate"
                        >
                          {issue.summary}
                        </Link>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Status Select */}
                        <div className="relative">
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                            className={`h-6 px-2 pr-5 rounded-[6px] text-[11px] font-bold border outline-none cursor-pointer appearance-none ${statusColors[issue.status]}`}
                          >
                            <option value="TO_DO">TO DO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="IN_REVIEW">IN REVIEW</option>
                            <option value="DONE">DONE</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-1.5 top-2 pointer-events-none opacity-60" />
                        </div>

                        {/* Priority */}
                        <div className="flex items-center gap-1">
                          <PriorityIcon priority={issue.priority} size={13} />
                          <select
                            value={issue.priority}
                            onChange={(e) => handlePriorityChange(issue.id, e.target.value as IssuePriority)}
                            className="h-6 rounded-[6px] border border-transparent bg-transparent hover:border-border-default px-1 text-[11px] text-subtle cursor-pointer"
                          >
                            <option value="HIGHEST">Highest</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                            <option value="LOWEST">Lowest</option>
                          </select>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center gap-1">
                          <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={20} />
                          <select
                            value={issue.assignee?.id ?? ""}
                            onChange={(e) => handleAssigneeChange(issue.id, e.target.value || null)}
                            className="h-6 max-w-[100px] rounded-[6px] border border-transparent bg-transparent hover:border-border-default px-1 text-[11px] text-subtle cursor-pointer truncate"
                          >
                            <option value="">Unassigned</option>
                            {allUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {issue.storyPoints != null && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral px-1.5 font-mono text-[11px] font-bold text-default">
                            {issue.storyPoints}
                          </span>
                        )}

                        {/* Move to dropdown */}
                        <select
                          value={sprint.id}
                          onChange={(e) => handleMoveIssueToTarget(issue.id, e.target.value || null)}
                          className="h-6 rounded-[6px] border border-border-default bg-surface px-1 text-[11px] text-subtle cursor-pointer"
                        >
                          <option value={sprint.id}>{sprint.name}</option>
                          <option value="">Move to Backlog</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}

                {/* Inline Quick Create in Sprint */}
                {quickInputTarget === sprint.id ? (
                  <div className="flex items-center gap-2 mt-1.5 p-1">
                    <input
                      type="text"
                      autoFocus
                      placeholder="What needs to be done? Press Enter to save"
                      value={quickSummary}
                      onChange={(e) => setQuickSummary(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickCreateSubmit(sprint.id);
                        if (e.key === "Escape") setQuickInputTarget(null);
                      }}
                      className="h-9 flex-1 rounded-[8px] border border-brand bg-surface px-3 text-[13px] text-default outline-none shadow-xs"
                    />
                    <button
                      onClick={() => handleQuickCreateSubmit(sprint.id)}
                      className="h-9 px-3 rounded-[8px] bg-brand text-white text-[12px] font-semibold hover:bg-brand-hovered"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setQuickInputTarget(null)}
                      className="h-9 px-2 text-subtlest hover:text-default text-[12px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setQuickInputTarget(sprint.id);
                      setQuickSummary("");
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-subtle hover:text-brand hover:bg-neutral rounded-[8px] transition-all mt-1 w-fit"
                  >
                    <Plus size={13} />
                    <span>Create issue in {sprint.name}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Backlog Section */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTargetId("backlog");
          }}
          onDragLeave={() => setDragOverTargetId(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverTargetId(null);
            const issueId = e.dataTransfer.getData("text/plain");
            if (issueId) handleMoveIssueToTarget(issueId, null);
          }}
          className={`rounded-[14px] border bg-surface p-4 shadow-xs transition-all ${
            dragOverTargetId === "backlog"
              ? "border-brand bg-brand/5 ring-2 ring-brand/30"
              : "border-border-default hover:border-border-strong"
          }`}
        >
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-default">
            <span className="font-bold text-[15px] text-default tracking-tight">
              Backlog ({filteredBacklog.length} issues)
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {filteredBacklog.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-subtlest border border-dashed border-border-default rounded-[10px] bg-neutral/30">
                Backlog is empty or no issues match filters.
              </div>
            ) : (
              filteredBacklog.map((issue) => (
                <div
                  key={issue.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", issue.id);
                    setDraggedIssueId(issue.id);
                  }}
                  onDragEnd={() => setDraggedIssueId(null)}
                  className={`flex items-center justify-between rounded-[10px] border px-3 py-2 text-[13px] transition-all gap-3 cursor-grab active:cursor-grabbing ${
                    selectedIssueIds.includes(issue.id)
                      ? "border-brand bg-brand/8 ring-1 ring-brand/30"
                      : "border-border-default bg-surface hover:border-brand/40 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <GripVertical size={13} className="text-subtlest shrink-0 opacity-40 hover:opacity-100" />
                    <input
                      type="checkbox"
                      checked={selectedIssueIds.includes(issue.id)}
                      onChange={() => handleToggleSelectIssue(issue.id)}
                      className="h-4 w-4 accent-brand cursor-pointer rounded-[4px]"
                    />
                    <TypeIcon type={issue.type} size={14} />
                    <Link
                      href={`/projects/${projectKey}/issues/${issue.key}`}
                      className="font-mono text-[11px] font-bold text-subtlest hover:text-brand shrink-0"
                    >
                      {issue.key}
                    </Link>
                    <Link
                      href={`/projects/${projectKey}/issues/${issue.key}`}
                      className="font-medium text-default hover:text-brand hover:underline truncate"
                    >
                      {issue.summary}
                    </Link>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {/* Status Select */}
                    <div className="relative">
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                        className={`h-6 px-2 pr-5 rounded-[6px] text-[11px] font-bold border outline-none cursor-pointer appearance-none ${statusColors[issue.status]}`}
                      >
                        <option value="TO_DO">TO DO</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="IN_REVIEW">IN REVIEW</option>
                        <option value="DONE">DONE</option>
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-2 pointer-events-none opacity-60" />
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-1">
                      <PriorityIcon priority={issue.priority} size={13} />
                      <select
                        value={issue.priority}
                        onChange={(e) => handlePriorityChange(issue.id, e.target.value as IssuePriority)}
                        className="h-6 rounded-[6px] border border-transparent bg-transparent hover:border-border-default px-1 text-[11px] text-subtle cursor-pointer"
                      >
                        <option value="HIGHEST">Highest</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="LOWEST">Lowest</option>
                      </select>
                    </div>

                    {/* Assignee */}
                    <div className="flex items-center gap-1">
                      <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={20} />
                      <select
                        value={issue.assignee?.id ?? ""}
                        onChange={(e) => handleAssigneeChange(issue.id, e.target.value || null)}
                        className="h-6 max-w-[100px] rounded-[6px] border border-transparent bg-transparent hover:border-border-default px-1 text-[11px] text-subtle cursor-pointer truncate"
                      >
                        <option value="">Unassigned</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {issue.storyPoints != null && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral px-1.5 font-mono text-[11px] font-bold text-default">
                        {issue.storyPoints}
                      </span>
                    )}

                    {sprints.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => handleMoveIssueToTarget(issue.id, e.target.value || null)}
                        className="h-6 rounded-[6px] border border-border-default bg-surface px-1 text-[11px] text-subtle cursor-pointer"
                      >
                        <option value="">Backlog</option>
                        {sprints.map((s) => (
                          <option key={s.id} value={s.id}>
                            Move to {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Inline Quick Create in Backlog */}
            {quickInputTarget === "backlog" ? (
              <div className="flex items-center gap-2 mt-1.5 p-1">
                <input
                  type="text"
                  autoFocus
                  placeholder="What needs to be done? Press Enter to save"
                  value={quickSummary}
                  onChange={(e) => setQuickSummary(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickCreateSubmit(null);
                    if (e.key === "Escape") setQuickInputTarget(null);
                  }}
                  className="h-9 flex-1 rounded-[8px] border border-brand bg-surface px-3 text-[13px] text-default outline-none shadow-xs"
                />
                <button
                  onClick={() => handleQuickCreateSubmit(null)}
                  className="h-9 px-3 rounded-[8px] bg-brand text-white text-[12px] font-semibold hover:bg-brand-hovered"
                >
                  Add
                </button>
                <button
                  onClick={() => setQuickInputTarget(null)}
                  className="h-9 px-2 text-subtlest hover:text-default text-[12px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setQuickInputTarget("backlog");
                  setQuickSummary("");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-subtle hover:text-brand hover:bg-neutral rounded-[8px] transition-all mt-1 w-fit"
              >
                <Plus size={13} />
                <span>Create issue in Backlog</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SprintModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultSprintNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id?: string; name: string; goal: string; startDate: string; endDate: string }) => void;
  initialData?: SprintData | null;
  defaultSprintNumber: number;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultEndStr = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [name, setName] = useState(initialData?.name || `Sprint ${defaultSprintNumber}`);
  const [goal, setGoal] = useState(initialData?.goal || "");
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [startDate, setStartDate] = useState(
    initialData?.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : todayStr
  );
  const [endDate, setEndDate] = useState(
    initialData?.endDate ? new Date(initialData.endDate).toISOString().split("T")[0] : defaultEndStr
  );

  if (!isOpen) return null;

  const handleDurationChange = (weeks: number) => {
    setDurationWeeks(weeks);
    if (weeks > 0 && startDate) {
      const start = new Date(startDate);
      const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
      setEndDate(end.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="w-full max-w-lg rounded-[16px] border border-border-default bg-surface p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-subtlest hover:text-default">
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-brand" size={20} />
          <h3 className="text-[16px] font-bold text-default">
            {initialData ? "Edit Sprint Details" : "Create New Sprint"}
          </h3>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              id: initialData?.id,
              name: name.trim() || `Sprint ${defaultSprintNumber}`,
              goal: goal.trim(),
              startDate,
              endDate,
            });
          }}
          className="flex flex-col gap-4 text-[13px]"
        >
          <div>
            <label className="block font-semibold text-default mb-1">Sprint Name *</label>
            <input
              required
              type="text"
              placeholder="e.g. Sprint 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-3 text-[13px] outline-none focus:border-brand"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-default mb-1">Duration</label>
              <select
                value={durationWeeks}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-2 text-[12px] outline-none focus:border-brand cursor-pointer"
              >
                <option value={1}>1 Week</option>
                <option value={2}>2 Weeks (Standard)</option>
                <option value={3}>3 Weeks</option>
                <option value={4}>4 Weeks</option>
                <option value={0}>Custom</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-default mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (durationWeeks > 0 && e.target.value) {
                    const start = new Date(e.target.value);
                    const end = new Date(start.getTime() + durationWeeks * 7 * 24 * 60 * 60 * 1000);
                    setEndDate(end.toISOString().split("T")[0]);
                  }
                }}
                className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-2 text-[12px] outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block font-semibold text-default mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 rounded-[8px] border border-border-default bg-surface px-2 text-[12px] outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-default mb-1">Sprint Goal & Objectives</label>
            <textarea
              rows={3}
              placeholder="What are the key goals for this sprint?"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-[8px] border border-border-default bg-surface p-3 text-[13px] outline-none focus:border-brand resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-default mt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-[8px] text-[13px] font-medium text-subtle hover:bg-neutral"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-[8px] bg-brand text-white font-semibold text-[13px] hover:bg-brand-hovered"
            >
              Save Sprint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
