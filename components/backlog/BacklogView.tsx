"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Play, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { PriorityIcon } from "@/components/ui/PriorityIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
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

export function BacklogView({
  projectId,
  projectKey,
  sprints: initialSprints,
  backlogIssues: initialBacklog,
}: {
  projectId: string;
  projectKey: string;
  sprints: SprintData[];
  backlogIssues: BacklogIssue[];
}) {
  const [sprints, setSprints] = useState<SprintData[]>(initialSprints);
  const [backlog, setBacklog] = useState<BacklogIssue[]>(initialBacklog);
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);

  const handleCreateSprint = async () => {
    setIsCreatingSprint(true);
    const sprintName = `Sprint ${sprints.length + 1}`;
    await createSprintAction(projectId, sprintName);
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
    // Optimistic UI move
    await moveIssueToSprintAction(issueId, targetSprintId);
    window.location.reload();
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

      {/* Sprints Section */}
      <div className="flex flex-col gap-6">
        {sprints.map((sprint) => {
          const totalPoints = sprint.issues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
          return (
            <div key={sprint.id} className="rounded-ds border border-border bg-surface p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base text-text">{sprint.name}</span>
                  <Tag color={sprint.status === "ACTIVE" ? "blue" : sprint.status === "CLOSED" ? "green" : "gray"}>
                    {sprint.status}
                  </Tag>
                  <span className="text-xs text-text-subtle">
                    ({sprint.issues.length} issues • {totalPoints} pts)
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
                      className="h-7 text-xs border border-border bg-[#F4F5F7]"
                      onClick={() => handleCompleteSprint(sprint.id)}
                    >
                      <CheckCircle2 size={12} className="text-success" /> Complete sprint
                    </Button>
                  )}
                </div>
              </div>

              {/* Sprint Issue List */}
              <div className="flex flex-col gap-1.5">
                {sprint.issues.length === 0 ? (
                  <div className="py-4 text-center text-xs text-text-subtle italic">
                    Plan a sprint by dragging or moving issues into this section.
                  </div>
                ) : (
                  sprint.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between rounded-ds border border-border/60 bg-background px-3 py-2 text-sm hover:border-brand/40"
                    >
                      <div className="flex items-center gap-3">
                        <TypeIcon type={issue.type} size={14} />
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.key}`}
                          className="font-mono text-xs font-semibold text-text-subtle hover:text-brand"
                        >
                          {issue.key}
                        </Link>
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.key}`}
                          className="font-medium text-text hover:underline"
                        >
                          {issue.summary}
                        </Link>
                      </div>

                      <div className="flex items-center gap-3">
                        <PriorityIcon priority={issue.priority} size={14} />
                        {issue.storyPoints != null && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DFE1E6] px-1.5 font-mono text-[11px] font-bold">
                            {issue.storyPoints}
                          </span>
                        )}
                        <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={22} />
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
            <span className="font-semibold text-base text-text">Backlog ({backlog.length} issues)</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {backlog.length === 0 ? (
              <div className="py-4 text-center text-xs text-text-subtle italic">
                Backlog is empty. Create issues using the top navigation bar.
              </div>
            ) : (
              backlog.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between rounded-ds border border-border/60 bg-background px-3 py-2 text-sm hover:border-brand/40"
                >
                  <div className="flex items-center gap-3">
                    <TypeIcon type={issue.type} size={14} />
                    <Link
                      href={`/projects/${projectKey}/issues/${issue.key}`}
                      className="font-mono text-xs font-semibold text-text-subtle hover:text-brand"
                    >
                      {issue.key}
                    </Link>
                    <Link
                      href={`/projects/${projectKey}/issues/${issue.key}`}
                      className="font-medium text-text hover:underline"
                    >
                      {issue.summary}
                    </Link>
                  </div>

                  <div className="flex items-center gap-3">
                    <PriorityIcon priority={issue.priority} size={14} />
                    {issue.storyPoints != null && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DFE1E6] px-1.5 font-mono text-[11px] font-bold">
                        {issue.storyPoints}
                      </span>
                    )}
                    <Avatar name={issue.assignee?.name ?? "Unassigned"} src={issue.assignee?.avatarUrl} size={22} />
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
