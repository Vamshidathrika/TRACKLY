import { prisma } from "./prisma";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export async function canUserChangeStatus(issueId: string, userId: string): Promise<boolean> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { assigneeId: true, projectId: true },
  });

  if (!issue) return false;
  if (issue.assigneeId === userId) return true; // Assignee can always update status

  const membership = await prisma.membership.findFirst({
    where: { userId, role: "ADMIN" },
  });

  return !!membership; // Admin can update status
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
  authorId: string,
  data: {
    summary?: string;
    description?: string;
    type?: IssueType;
    status?: IssueStatus;
    priority?: IssuePriority;
    storyPoints?: number | null;
    assigneeId?: string | null;
    sprintId?: string | null;
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
    data,
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

  return updated;
}

export async function getIssuesByProject(projectId: string) {
  return prisma.issue.findMany({
    where: { projectId },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getIssueByKey(siteId: string, key: string) {
  const issue = await prisma.issue.findFirst({
    where: { key, project: { siteId } },
    include: {
      project: { select: { id: true, name: true, key: true } },
      reporter: { select: { id: true, name: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      comments: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      history: {
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return issue;
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
