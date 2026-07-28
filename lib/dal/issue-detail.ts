import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/tenant";

/**
 * Full issue payload for the detail view.
 *
 * `getBoardIssues` deliberately returns a thin card projection — pulling
 * comments, history, links and attachments for every card on a board is a
 * per-card fan-out nobody looks at. The detail view therefore has to fetch the
 * rest itself when it opens, the same split Jira uses between its board cards
 * and `GET /rest/api/3/issue/{key}`.
 *
 * Anything missing from this payload must render as empty in the UI. It must
 * never be substituted with a placeholder: a fabricated `IS_BLOCKED_BY` link
 * silently blocks a real status transition.
 */
export const getIssueDetail = cache(async (userId: string, issueId: string) => {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      project: { select: { id: true, key: true, name: true, siteId: true } },
      release: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      watchers: { select: { userId: true } },
      comments: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      history: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
      workLogs: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { startedAt: "desc" },
      },
      subtasks: {
        select: { id: true, key: true, summary: true, status: true },
        orderBy: { number: "asc" },
      },
      parent: { select: { id: true, key: true, summary: true, type: true } },
      attachments: {
        include: { uploader: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      linksOut: {
        include: {
          targetIssue: { select: { id: true, key: true, summary: true, status: true, type: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      // Inbound links are what produce "is blocked by". Omitting them is why the
      // drawer never saw a real blocker and invented one instead.
      linksIn: {
        include: {
          sourceIssue: { select: { id: true, key: true, summary: true, status: true, type: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!issue) return null;

  const access = await checkProjectAccess(userId, issue.projectId);
  if (!access) return null;

  const loggedHours = issue.workLogs.reduce((sum, w) => sum + Number(w.hours ?? 0), 0);

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
    startDate: issue.startDate,
    dueDate: issue.dueDate,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    projectId: issue.projectId,
    projectKey: issue.project.key,
    project: { id: issue.project.id, key: issue.project.key, name: issue.project.name },
    sprintId: issue.sprintId,
    releaseId: issue.releaseId,
    release: issue.release,
    reporterId: issue.reporterId,
    reporter: issue.reporter,
    assignee: issue.assignee,
    parent: issue.parent,
    comments: issue.comments,
    history: issue.history,
    workLogs: issue.workLogs,
    loggedHours,
    subtasks: issue.subtasks,
    attachments: issue.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      url: a.url,
      sizeBytes: a.sizeBytes,
      mimeType: a.mimeType,
      uploaderId: a.uploaderId,
      uploaderName: a.uploader?.name ?? null,
      createdAt: a.createdAt,
    })),
    linksOut: issue.linksOut.map((l) => ({
      id: l.id,
      relation: l.relation,
      targetIssue: l.targetIssue,
    })),
    linksIn: issue.linksIn.map((l) => ({
      id: l.id,
      relation: l.relation,
      sourceIssue: l.sourceIssue,
    })),
    watchers: issue.watchers,
    isWatching: issue.watchers.some((w) => w.userId === userId),
  };
});

export type IssueDetail = NonNullable<Awaited<ReturnType<typeof getIssueDetail>>>;
