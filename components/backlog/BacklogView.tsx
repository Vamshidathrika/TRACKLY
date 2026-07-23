"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Plus, Play, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { IssueFilterToolbar, type TeammateUser } from "@/components/issues/IssueFilterToolbar";
import { updateIssueFieldAction } from "@/app/(app)/projects/[key]/issues/actions";
import {
  createSprintAction,
  startSprintAction,
  completeSprintAction,
  moveIssueToSprintAction,
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
  TO_DO: "bg-slate-100 text-slate-700 border-slate-300",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

  // Filters state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

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

  const filteredBacklog = useMemo(() => backlog.filter(filterSingleIssue), [backlog, searchQuery, filterUnassigned, selectedUserId, statusFilter, priorityFilter, typeFilter]);

  const handleCreateSprint = async () => {
    setIsCreatingSprint(true);
    const sprintName = `Sprint ${sprints.length + 1}`;
    const res = await createSprintAction(projectId, sprintName);
    if (res && res.sprint) {
      setSprints((prev) => [...prev, res.sprint as SprintData]);
    }
    setIsCreatingSprint(false);
  };

  const handleStartSprint = async (sprintId: string) => {
    await startSprintAction(sprintId);
    setSprints((prev) =>
      prev.map((s) => (s.id === sprintId ? { ...s, status: "ACTIVE" } : s))
    );
  };

  const handleCompleteSprint = async (sprintId: string) => {
    await completeSprintAction(sprintId);
    setSprints((prev) =>
      prev.map((s) => (s.id === sprintId ? { ...s, status: "CLOSED" } : s))
    );
  };

  const handleMoveIssue = async (issueId: string, targetSprintId: string | null) => {
    await moveIssueToSprintAction(issueId, targetSprintId);
    window.location.reload();
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Sprint Planning & Backlog</h2>
        <Button appearance="default" onClick={handleCreateSprint} disabled={isCreatingSprint}>
          <Plus size={14} /> Create sprint
        </Button>
      </div>

      {/* Top Profile Circles Filter Toolbar */}
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
      <div className="flex flex-col gap-6">
        {sprints.map((sprint) => {
          const sprintFilteredIssues = sprint.issues.filter(filterSingleIssue);
          const totalPoints = sprintFilteredIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

          return (
            <div key={sprint.id} className="rounded-ds border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base text-text">{sprint.name}</span>
                  <Tag color={sprint.status === "ACTIVE" ? "blue" : sprint.status === "CLOSED" ? "green" : "gray"}>
                    {sprint.status}
                  </Tag>
                  <span className="text-xs text-text-subtle">
                    ({sprintFilteredIssues.length} issues • {totalPoints} pts)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {sprint.status === "FUTURE" && (
                    <Button
                      appearance="primary"
                      className="h-7 text-xs"
                      onClick={() => handleStartSprint(sprint.id)}
                    >
                      <Play size={12} /> Start sprint
                    </Button>
                  )}
                  {sprint.status === "ACTIVE" && (
                    <Button
                      appearance="subtle"
                      className="h-7 text-xs border border-border-default bg-neutral"
                      onClick={() => handleCompleteSprint(sprint.id)}
                    >
                      <CheckCircle2 size={12} className="text-success" /> Complete sprint
                    </Button>
                  )}
                </div>
              </div>

              {/* Sprint Issue List */}
              <div className="flex flex-col gap-1.5">
                {sprintFilteredIssues.length === 0 ? (
                  <div className="py-4 text-center text-xs text-text-subtle italic">
                    No issues matching criteria in this sprint.
                  </div>
                ) : (
                  sprintFilteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between rounded-ds border border-border/60 bg-background px-3 py-2 text-sm hover:border-brand/40 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <TypeIcon type={issue.type} size={14} />
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.key}`}
                          className="font-mono text-xs font-semibold text-text-subtle hover:text-brand shrink-0"
                        >
                          {issue.key}
                        </Link>
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.key}`}
                          className="font-medium text-text hover:underline truncate"
                        >
                          {issue.summary}
                        </Link>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Status Select */}
                        <div className="relative">
                          <select
                            value={issue.status}
                            onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                            className={`h-6 px-1.5 pr-5 rounded text-[11px] font-bold border outline-none cursor-pointer appearance-none ${statusColors[issue.status]}`}
                          >
                            <option value="TO_DO">TO DO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="IN_REVIEW">IN REVIEW</option>
                            <option value="DONE">DONE</option>
                          </select>
                          <ChevronDown size={10} className="absolute right-1 top-2 pointer-events-none opacity-70" />
                        </div>

                        {/* Priority Select */}
                        <div className="flex items-center gap-1">
                          <PriorityIcon priority={issue.priority} size={14} />
                          <select
                            value={issue.priority}
                            onChange={(e) => handlePriorityChange(issue.id, e.target.value as IssuePriority)}
                            className="h-6 rounded border border-transparent bg-transparent hover:border-border px-1 text-xs text-text-subtle cursor-pointer"
                          >
                            <option value="HIGHEST">Highest</option>
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                            <option value="LOWEST">Lowest</option>
                          </select>
                        </div>

                        {/* Assignee Select */}
                        <div className="flex items-center gap-1">
                          <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={20} />
                          <select
                            value={issue.assignee?.id ?? ""}
                            onChange={(e) => handleAssigneeChange(issue.id, e.target.value || null)}
                            className="h-6 max-w-[100px] rounded border border-transparent bg-transparent hover:border-border px-1 text-xs text-text-subtle cursor-pointer truncate"
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

                        <select
                          value={sprint.id}
                          onChange={(e) => handleMoveIssue(issue.id, e.target.value || null)}
                          className="h-6 rounded-ds border border-border bg-surface px-1 text-xs text-text-subtle"
                        >
                          <option value={sprint.id}>{sprint.name}</option>
                          <option value="">Move to Backlog</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}

        {/* Unassigned Backlog Section */}
        <div className="rounded-ds border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
            <span className="font-semibold text-base text-text">Backlog ({filteredBacklog.length} issues)</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {filteredBacklog.length === 0 ? (
              <div className="py-4 text-center text-xs text-text-subtle italic">
                Backlog is empty or no issues match filters.
              </div>
            ) : (
              filteredBacklog.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between rounded-ds border border-border/60 bg-background px-3 py-2 text-sm hover:border-brand/40 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TypeIcon type={issue.type} size={14} />
                    <Link
                      href={`/projects/${projectKey}/issues/${issue.key}`}
                      className="font-mono text-xs font-semibold text-text-subtle hover:text-brand shrink-0"
                    >
                      {issue.key}
                    </Link>
                    <Link
                      href={`/projects/${projectKey}/issues/${issue.key}`}
                      className="font-medium text-text hover:underline truncate"
                    >
                      {issue.summary}
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Status Select */}
                    <div className="relative">
                      <select
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.id, e.target.value as IssueStatus)}
                        className={`h-6 px-1.5 pr-5 rounded text-[11px] font-bold border outline-none cursor-pointer appearance-none ${statusColors[issue.status]}`}
                      >
                        <option value="TO_DO">TO DO</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="IN_REVIEW">IN REVIEW</option>
                        <option value="DONE">DONE</option>
                      </select>
                      <ChevronDown size={10} className="absolute right-1 top-2 pointer-events-none opacity-70" />
                    </div>

                    {/* Priority Select */}
                    <div className="flex items-center gap-1">
                      <PriorityIcon priority={issue.priority} size={14} />
                      <select
                        value={issue.priority}
                        onChange={(e) => handlePriorityChange(issue.id, e.target.value as IssuePriority)}
                        className="h-6 rounded border border-transparent bg-transparent hover:border-border px-1 text-xs text-text-subtle cursor-pointer"
                      >
                        <option value="HIGHEST">Highest</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                        <option value="LOWEST">Lowest</option>
                      </select>
                    </div>

                    {/* Assignee Select */}
                    <div className="flex items-center gap-1">
                      <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={20} />
                      <select
                        value={issue.assignee?.id ?? ""}
                        onChange={(e) => handleAssigneeChange(issue.id, e.target.value || null)}
                        className="h-6 max-w-[100px] rounded border border-transparent bg-transparent hover:border-border px-1 text-xs text-text-subtle cursor-pointer truncate"
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
                        onChange={(e) => handleMoveIssue(issue.id, e.target.value || null)}
                        className="h-6 rounded-ds border border-border bg-surface px-1 text-xs text-text-subtle"
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
          </div>
        </div>
      </div>
    </div>
  );
}
