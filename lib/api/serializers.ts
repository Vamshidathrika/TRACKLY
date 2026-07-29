/**
 * Wire representations for `/api/v1`.
 *
 * Nothing is spread straight from a Prisma row onto the wire. An explicit
 * mapping is the only reliable way to stop a column added next month —
 * `passwordHash`, `accessToken`, an internal score — from being published to
 * every integrator the moment it exists. It also fixes the public field names
 * so an internal rename is not a breaking API change.
 *
 * Note what is deliberately absent: `siteId` on every object, `rank`,
 * `viewsCount`, and user `email`. Site ids are internal routing detail, and
 * email is personal data that a read-only integration has no need for.
 */

type UserRow = { id: string; name: string | null; avatarUrl: string | null } | null;

export type ApiUser = { id: string; name: string | null; avatarUrl: string | null } | null;

export function serialiseUser(user: UserRow): ApiUser {
  if (!user) return null;
  return { id: user.id, name: user.name, avatarUrl: user.avatarUrl };
}

// ─── Project ────────────────────────────────────────────────────────────────

export type ProjectRow = {
  id: string;
  key: string;
  name: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  lead?: UserRow;
  _count?: { issues: number };
};

export function serialiseProject(project: ProjectRow) {
  return {
    id: project.id,
    key: project.key,
    name: project.name,
    type: project.type,
    lead: serialiseUser(project.lead ?? null),
    issueCount: project._count?.issues,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

// ─── Issue ──────────────────────────────────────────────────────────────────

export type IssueRow = {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  storyPoints: number | null;
  originalEstimate: number | null;
  labels: string[];
  startDate: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  projectId: string;
  sprintId: string | null;
  parentId: string | null;
  project?: { key: string; name: string } | null;
  reporter?: UserRow;
  assignee?: UserRow;
};

export function serialiseIssue(issue: IssueRow) {
  return {
    id: issue.id,
    key: issue.key,
    summary: issue.summary,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    priority: issue.priority,
    storyPoints: issue.storyPoints,
    originalEstimate: issue.originalEstimate,
    labels: issue.labels,
    project: issue.project
      ? { id: issue.projectId, key: issue.project.key, name: issue.project.name }
      : { id: issue.projectId },
    sprintId: issue.sprintId,
    parentId: issue.parentId,
    reporter: serialiseUser(issue.reporter ?? null),
    assignee: serialiseUser(issue.assignee ?? null),
    startDate: issue.startDate?.toISOString() ?? null,
    dueDate: issue.dueDate?.toISOString() ?? null,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

/** Prisma `select` producing exactly what `serialiseIssue` consumes. */
export const ISSUE_SELECT = {
  id: true,
  key: true,
  summary: true,
  description: true,
  type: true,
  status: true,
  priority: true,
  storyPoints: true,
  originalEstimate: true,
  labels: true,
  startDate: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  projectId: true,
  sprintId: true,
  parentId: true,
  project: { select: { key: true, name: true } },
  reporter: { select: { id: true, name: true, avatarUrl: true } },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
} as const;

// ─── Comment ────────────────────────────────────────────────────────────────

export type CommentRow = {
  id: string;
  issueId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author?: UserRow;
};

export function serialiseComment(comment: CommentRow) {
  return {
    id: comment.id,
    issueId: comment.issueId,
    body: comment.body,
    author: serialiseUser(comment.author ?? null),
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  };
}

export const COMMENT_SELECT = {
  id: true,
  issueId: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} as const;

// ─── Work log ───────────────────────────────────────────────────────────────

export type WorkLogRow = {
  id: string;
  issueId: string;
  hours: number;
  description: string | null;
  startedAt: Date;
  createdAt: Date;
  author?: UserRow;
};

export function serialiseWorkLog(workLog: WorkLogRow) {
  return {
    id: workLog.id,
    issueId: workLog.issueId,
    hours: workLog.hours,
    description: workLog.description,
    author: serialiseUser(workLog.author ?? null),
    startedAt: workLog.startedAt.toISOString(),
    createdAt: workLog.createdAt.toISOString(),
  };
}

export const WORKLOG_SELECT = {
  id: true,
  issueId: true,
  hours: true,
  description: true,
  startedAt: true,
  createdAt: true,
  author: { select: { id: true, name: true, avatarUrl: true } },
} as const;

// ─── Sprint ─────────────────────────────────────────────────────────────────

export type SprintRow = {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serialiseSprint(sprint: SprintRow) {
  return {
    id: sprint.id,
    projectId: sprint.projectId,
    name: sprint.name,
    goal: sprint.goal,
    status: sprint.status,
    startDate: sprint.startDate?.toISOString() ?? null,
    endDate: sprint.endDate?.toISOString() ?? null,
    createdAt: sprint.createdAt.toISOString(),
    updatedAt: sprint.updatedAt.toISOString(),
  };
}

export const SPRINT_SELECT = {
  id: true,
  projectId: true,
  name: true,
  goal: true,
  status: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  updatedAt: true,
} as const;
