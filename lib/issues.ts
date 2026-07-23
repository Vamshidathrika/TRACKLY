import { cache } from "react";
import { prisma } from "./prisma";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export async function canUserChangeStatus(issueId: string, userId: string): Promise<boolean> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { assigneeId: true, projectId: true },
  });

  if (!issue) return false;
  if (!issue.assigneeId || issue.assigneeId === userId) return true; // Assignee or unassigned issue can update status

  const membership = await prisma.membership.findFirst({
    where: { userId, role: "ADMIN" },
  });

  return !!membership; // Only Admin or Assignee can update status
}

export async function createIssue(input: {
  projectId: string;
  summary: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
  priority?: IssuePriority;
  storyPoints?: number;
  reporterId: string;
  assigneeId?: string;
  parentId?: string;
  sprintId?: string;
  labels?: string[];
}) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: input.projectId },
    });
    if (!project) throw new Error("PROJECT_NOT_FOUND");

    const number = project.issueCounter + 1;
    const key = `${project.key}-${number}`;

    await tx.project.update({
      where: { id: input.projectId },
      data: { issueCounter: number },
    });

    return tx.issue.create({
      data: {
        projectId: input.projectId,
        number,
        key,
        summary: input.summary,
        description: input.description,
        type: input.type ?? "STORY",
        status: input.status ?? "TO_DO",
        priority: input.priority ?? "MEDIUM",
        storyPoints: input.storyPoints,
        reporterId: input.reporterId,
        assigneeId: input.assigneeId,
        parentId: input.parentId,
        sprintId: input.sprintId,
        labels: input.labels ?? [],
      },
    });
  });
}

export async function updateIssue(
  issueId: string,
  authorId: string,
  data: {
    summary?: string;
    description?: string;
    type?: IssueType;
    status?: IssueStatus;
    priority?: IssuePriority;
    storyPoints?: number | null;
    assigneeId?: string | null;
    reporterId?: string | null;
    sprintId?: string | null;
    startDate?: Date | null;
    dueDate?: Date | null;
    labels?: string[];
  }
) {
  const current = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!current) throw new Error("ISSUE_NOT_FOUND");

  // Enforce status change restriction: only assignee or ADMIN can change status
  if (data.status && data.status !== current.status) {
    const allowed = await canUserChangeStatus(issueId, authorId);
    if (!allowed) {
      throw new Error("PERMISSION_DENIED_ASSIGNEE_ONLY");
    }
  }

  const historyEntries: { field: string; oldValue?: string; newValue?: string }[] = [];

  for (const [key, value] of Object.entries(data)) {
    const oldVal = (current as any)[key];
    if (value !== undefined && String(oldVal ?? "") !== String(value ?? "")) {
      historyEntries.push({
        field: key,
        oldValue: oldVal != null ? String(oldVal) : undefined,
        newValue: value != null ? String(value) : undefined,
      });
    }
  }

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data: data as any,
  });

  if (historyEntries.length > 0) {
    await prisma.issueHistory.createMany({
      data: historyEntries.map((h) => ({
        issueId,
        authorId,
        field: h.field,
        oldValue: h.oldValue || undefined,
        newValue: h.newValue || undefined,
      })),
    });
  }

  if (current?.key) {
    await delCache(`issue:${current.key.toUpperCase()}`);
  }

  return updated;
}

export const getIssuesByProject = cache(async (projectId: string) => {
  return prisma.issue.findMany({
    where: { projectId },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
});

import { getCache, setCache, delCache } from "./redis";

export async function getIssueByKey(siteId: string, key: string) {
  const upperKey = key.toUpperCase();
  const cacheKey = `issue:${upperKey}`;
  const cached = await getCache<any>(cacheKey);
  if (cached && cached.project?.siteId) return cached;

  const issue = await prisma.issue.findFirst({
    where: {
      OR: [{ key: upperKey }, { key }],
    },
    include: {
      project: { select: { id: true, name: true, key: true, siteId: true } },
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
      sprint: { select: { id: true, name: true, status: true } },
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
    },
  });

  if (issue) {
    await setCache(cacheKey, issue, 180); // 3 minutes cache
  }

  return issue;
}

export async function addComment(input: { issueId: string; authorId: string; body: string }) {
  const comment = await prisma.comment.create({
    data: {
      issueId: input.issueId,
      authorId: input.authorId,
      body: input.body,
    },
    include: { issue: { select: { key: true } } },
  });

  if (comment.issue?.key) {
    await delCache(`issue:${comment.issue.key.toUpperCase()}`);
  }

  return comment;
}
