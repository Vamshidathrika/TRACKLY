import { prisma } from "./prisma";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

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
        labels: input.labels ?? [],
      },
    });
  });
}

export async function updateIssue(
  issueId: string,
  userId: string,
  data: {
    summary?: string;
    description?: string;
    type?: IssueType;
    status?: IssueStatus;
    priority?: IssuePriority;
    storyPoints?: number | null;
    assigneeId?: string | null;
  }
) {
  const current = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!current) throw new Error("ISSUE_NOT_FOUND");

  const updated = await prisma.issue.update({
    where: { id: issueId },
    data,
  });

  // Log history changes
  const historyCreates = [];
  if (data.status && data.status !== current.status) {
    historyCreates.push(
      prisma.issueHistory.create({
        data: { issueId, authorId: userId, field: "status", oldValue: current.status, newValue: data.status },
      })
    );
  }
  if (data.priority && data.priority !== current.priority) {
    historyCreates.push(
      prisma.issueHistory.create({
        data: { issueId, authorId: userId, field: "priority", oldValue: current.priority, newValue: data.priority },
      })
    );
  }
  if (data.assigneeId !== undefined && data.assigneeId !== current.assigneeId) {
    historyCreates.push(
      prisma.issueHistory.create({
        data: { issueId, authorId: userId, field: "assignee", oldValue: current.assigneeId ?? "Unassigned", newValue: data.assigneeId ?? "Unassigned" },
      })
    );
  }

  if (historyCreates.length > 0) {
    await Promise.all(historyCreates);
  }

  return updated;
}

export async function getIssuesByProject(projectId: string) {
  return prisma.issue.findMany({
    where: { projectId },
    include: {
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getIssueByKey(siteId: string, key: string) {
  return prisma.issue.findFirst({
    where: {
      key: key.toUpperCase(),
      project: { siteId },
    },
    include: {
      project: true,
      reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      parent: { select: { id: true, key: true, summary: true, type: true } },
      subtasks: {
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      history: {
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function addComment(input: { issueId: string; authorId: string; body: string }) {
  return prisma.comment.create({
    data: {
      issueId: input.issueId,
      authorId: input.authorId,
      body: input.body,
    },
  });
}
