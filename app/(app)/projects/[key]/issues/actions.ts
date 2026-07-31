"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { getAuthUser } from "@/lib/auth";
import { updateIssue, addComment, deleteIssue, deleteComment } from "@/lib/issues";
import { extractMentions, createNotification, toggleWatcher } from "@/lib/notifications";
import { evaluateAutomationTriggers } from "@/lib/automation";
import { prisma } from "@/lib/prisma";
import { getBoardIssues } from "@/lib/dal";
import { checkProjectAccess } from "@/lib/tenant";
import type { IssueStatus, IssuePriority, IssueType, LinkRelation, Prisma } from "@prisma/client";
import { validateRichDoc } from "@/components/editor/validate";
import { richDocToPlainText, extractMentionUserIds } from "@/components/editor/text";

export async function updateIssueFieldAction(
  issueId: string,
  field:
    | "status"
    | "priority"
    | "type"
    | "summary"
    | "description"
    | "storyPoints"
    | "originalEstimate"
    | "assigneeId"
    | "reporterId"
    | "sprintId"
    | "releaseId"
    | "startDate"
    | "dueDate"
    | "labels",
  value: string | number | null
) {
  const user = await getAuthUser();

  try {
    // updateIssue() only gates the `status` field (assignee/admin-only); every
    // other field was writable on any issue in any workspace by cuid. Resolve
    // the issue's project and require membership before trusting any field write.
    const target = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });
    if (!target) return { error: "Issue not found" };

    const access = await checkProjectAccess(user.id, target.projectId);
    if (!access) return { error: "You do not have access to this issue" };

    const data: Record<string, any> = {};
    const strVal = value !== null ? String(value) : "";
    if (field === "status") data.status = value as IssueStatus;
    if (field === "priority") data.priority = value as IssuePriority;
    if (field === "type") data.type = value as IssueType;
    if (field === "summary") data.summary = strVal;
    if (field === "description") data.description = strVal;
    if (field === "storyPoints") data.storyPoints = value !== null && value !== "" ? Number(value) : null;
    if (field === "originalEstimate") data.originalEstimate = value !== null && value !== "" ? Number(value) : null;
    if (field === "assigneeId") {
      if (strVal) {
        const isMember = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: target.projectId, userId: strVal } },
        });
        const proj = await prisma.project.findUnique({
          where: { id: target.projectId },
          select: { siteId: true },
        });
        const isWorkspaceAdmin = proj
          ? await prisma.membership.findFirst({
              where: { userId: strVal, siteId: proj.siteId, role: "ADMIN" },
            })
          : null;
        if (!isMember && !isWorkspaceAdmin) {
          return { error: "Assigned user is not a member of this board" };
        }
      }
      data.assigneeId = strVal || null;
    }
    if (field === "reporterId") data.reporterId = strVal || null;
    if (field === "sprintId") data.sprintId = strVal || null;
    if (field === "releaseId") data.releaseId = strVal || null;
    if (field === "startDate") data.startDate = strVal ? new Date(strVal) : null;
    if (field === "dueDate") data.dueDate = strVal ? new Date(strVal) : null;
    if (field === "labels") {
      data.labels = strVal
        .split(",")
        .map((l: string) => l.trim())
        .filter(Boolean);
    }

    await updateIssue(issueId, user.id, data);

    revalidatePath("/projects");

    // Fire-and-forget: notifications & automation run in background
    // without blocking the client response for minimum latency.
    const sideEffects = async () => {
      try {
        if (field === "assigneeId" && strVal) {
          const issue = await prisma.issue.findUnique({
            where: { id: issueId },
            include: { project: true },
          });
          if (issue && strVal !== user.id) {
            await createNotification({
              userId: strVal,
              actorId: user.id,
              type: "ASSIGNMENT",
              title: `Assigned to ${issue.key}`,
              message: `${user.name ?? "A teammate"} assigned ${issue.key} to you`,
              link: `/projects/${issue.project.key}/issues/${issue.key}`,
            });
          }
        }

        if (field === "status") {
          const issue = await prisma.issue.findUnique({
            where: { id: issueId },
            include: { watchers: true, project: true },
          });
          if (issue) {
            await Promise.all(
              issue.watchers.map((w) =>
                createNotification({
                  userId: w.userId,
                  actorId: user.id,
                  type: "STATUS_CHANGE",
                  title: `Status changed to ${value}`,
                  message: `${user.name} changed status of ${issue.key} to ${value}`,
                  link: `/projects/${issue.project.key}/issues/${issue.key}`,
                })
              )
            );

            await evaluateAutomationTriggers("STATUS_CHANGED", {
              issueId: issue.id,
              projectId: issue.projectId,
              authorId: user.id,
            });
          }
        }
      } catch { /* best-effort side effects */ }
    };
    // Don't await — let it run in the background
    void sideEffects();

    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

/**
 * Rich-text counterpart to `updateIssueFieldAction(issueId, "description", text)`.
 * Separate from the generic field setter (rather than adding "descriptionJson"
 * to its `field` union) so a multi-KB document never runs through that
 * function's `String(oldVal ?? "")` history-diff loop — history keeps logging
 * the plaintext mirror, exactly as it did before rich text existed.
 */
export async function updateIssueDescriptionAction(issueId: string, doc: unknown) {
  const user = await getAuthUser();

  try {
    const target = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });
    if (!target) return { error: "Issue not found" };

    const access = await checkProjectAccess(user.id, target.projectId);
    if (!access) return { error: "You do not have access to this issue" };

    const result = validateRichDoc(doc);
    if (!result.ok) return { error: result.error };

    await updateIssue(issueId, user.id, {
      description: richDocToPlainText(result.doc),
      descriptionJson: result.doc as unknown as Prisma.InputJsonValue,
    });

    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

/**
 * Confirms the caller can reach the board that owns `issueId`.
 *
 * Server actions are addressed by global action id, not by route, so every one
 * of these is a public endpoint that receives a client-chosen cuid. Reading the
 * issue is not authorization — the issue must be resolved to its project and
 * that project checked against the caller.
 */
async function resolveAccessibleIssue(userId: string, issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    select: { id: true, key: true, projectId: true, project: { select: { key: true } } },
  });
  if (!issue) return { error: "Issue not found" as const };
  if (!(await checkProjectAccess(userId, issue.projectId))) {
    return { error: "You don't have access to this board" as const };
  }
  return { issue };
}

export async function postCommentAction(issueId: string, body: string, doc?: unknown) {
  const user = await getAuthUser();
  if (!body.trim()) return { error: "Comment cannot be empty" };

  let bodyJson: Prisma.InputJsonValue | undefined;
  if (doc !== undefined) {
    const result = validateRichDoc(doc);
    if (!result.ok) return { error: result.error };
    bodyJson = result.doc as unknown as Prisma.InputJsonValue;
  }

  try {
    const guard = await resolveAccessibleIssue(user.id, issueId);
    if ("error" in guard) return { error: guard.error };

    await addComment({ issueId, authorId: user.id, body, bodyJson });

    revalidatePath("/projects");

    // Fire-and-forget: notifications, mentions & automation run in background
    const sideEffects = async () => {
      try {
        const issue = await prisma.issue.findUnique({
          where: { id: issueId },
          include: { project: true },
        });
        if (!issue) return;

        // Notify assignee & reporter if not self
        const notifyUsers = new Set<string>();
        if (issue.assigneeId && issue.assigneeId !== user.id) notifyUsers.add(issue.assigneeId);
        if (issue.reporterId && issue.reporterId !== user.id) notifyUsers.add(issue.reporterId);

        const notificationPromises = Array.from(notifyUsers).map((recipientId) =>
          createNotification({
            userId: recipientId,
            actorId: user.id,
            type: "COMMENT",
            title: `New comment on ${issue.key}`,
            message: `${user.name ?? "Teammate"}: "${body.slice(0, 50)}..."`,
            link: `/projects/${issue.project.key}/issues/${issue.key}`,
          })
        );

        // Rich comments carry exact user ids from the doc (fixes the pre-existing
        // bug where the name-regex below can't match a display name containing a
        // space). Plain-text comments (no doc, e.g. via the public API) keep the
        // legacy name-match path — both are site-scoped so a mention can never
        // resolve to a same-named user in a different workspace.
        if (bodyJson) {
          const mentionedIds = extractMentionUserIds(bodyJson);
          if (mentionedIds.length > 0) {
            const mentionedUsers = await prisma.user.findMany({
              where: {
                id: { in: mentionedIds },
                memberships: { some: { siteId: issue.project.siteId } },
              },
            });
            for (const mentionedUser of mentionedUsers) {
              if (mentionedUser.id === user.id) continue;
              const hasAccess = await checkProjectAccess(mentionedUser.id, issue.projectId);
              if (!hasAccess) continue;
              notificationPromises.push(
                createNotification({
                  userId: mentionedUser.id,
                  actorId: user.id,
                  type: "MENTION",
                  title: `Mentioned on ${issue.key}`,
                  message: `${user.name} mentioned you: "${body.slice(0, 50)}..."`,
                  link: `/projects/${issue.project.key}/issues/${issue.key}`,
                })
              );
            }
          }
        } else {
          const mentionNames = extractMentions(body);
          for (const name of mentionNames) {
            const mentionedUser = await prisma.user.findFirst({
              where: {
                name: { equals: name, mode: "insensitive" },
                memberships: { some: { siteId: issue.project.siteId } },
              },
            });
            if (mentionedUser && mentionedUser.id !== user.id) {
              const hasAccess = await checkProjectAccess(mentionedUser.id, issue.projectId);
              if (!hasAccess) continue;
              notificationPromises.push(
                createNotification({
                  userId: mentionedUser.id,
                  actorId: user.id,
                  type: "MENTION",
                  title: `Mentioned on ${issue.key}`,
                  message: `${user.name} mentioned you: "${body.slice(0, 50)}..."`,
                  link: `/projects/${issue.project.key}/issues/${issue.key}`,
                })
              );
            }
          }
        }

        await Promise.all(notificationPromises);

        await evaluateAutomationTriggers("COMMENT_ADDED", {
          issueId: issue.id,
          projectId: issue.projectId,
          authorId: user.id,
        });
      } catch { /* best-effort side effects */ }
    };
    void sideEffects();

    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function logWorkAction(
  issueId: string,
  hours: number,
  description: string,
  startedAt?: string
) {
  const user = await getAuthUser();

  if (!Number.isFinite(hours) || hours <= 0) return { error: "Time spent must be greater than 0" };
  if (hours > 24 * 30) return { error: "Time spent is unrealistically large" };

  try {
    const guard = await resolveAccessibleIssue(user.id, issueId);
    if ("error" in guard) return { error: guard.error };

    // Mock/unseeded issues have synthetic ids and no database row to attach to.
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true, watchers: true },
    });
    if (!issue) return { error: "This ticket is not persisted yet, so work cannot be logged." };

    const log = await prisma.workLog.create({
      data: {
        issueId,
        authorId: user.id,
        hours,
        description: description.trim() || null,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });

    await prisma.issueHistory.create({
      data: {
        issueId,
        authorId: user.id,
        field: "worklog",
        newValue: `${hours}h${description.trim() ? ` (${description.trim()})` : ""}`,
      },
    });

    revalidatePath(`/projects/${issue.project.key}/issues/${issue.key}`);
    // Tag-based revalidation is faster than full path revalidation
    const { revalidateTag } = await import("next/cache");
    revalidateTag(`project:${issue.project.id}`);

    // Fire-and-forget: run notifications async (don't block response)
    if (typeof setImmediate !== 'undefined') {
      setImmediate(() =>
        void Promise.all(
          issue.watchers
            .filter((w) => w.userId !== user.id)
            .map((w) =>
              createNotification({
                userId: w.userId,
                actorId: user.id,
                type: "STATUS_CHANGE",
                title: `Work logged on ${issue.key}`,
                message: `${user.name} logged ${hours}h on ${issue.key}`,
                link: `/projects/${issue.project.key}/issues/${issue.key}`,
              })
            )
        ).catch(() => {})
      );
    }

    return { success: true, log };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteWorkLogAction(workLogId: string) {
  const user = await getAuthUser();
  try {
    const log = await prisma.workLog.findUnique({
      where: { id: workLogId },
      include: { issue: { include: { project: true } } },
    });
    if (!log) return { error: "Work log not found" };
    if (log.authorId !== user.id) return { error: "You can only delete your own work logs" };

    await prisma.workLog.delete({ where: { id: workLogId } });

    revalidatePath(`/projects/${log.issue.project.key}/issues/${log.issue.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Subtasks (modelled as child Issues via Issue.parentId)
// ---------------------------------------------------------------------------

export async function createSubtaskAction(parentIssueId: string, title: string) {
  const user = await getAuthUser();
  if (!title.trim()) return { error: "Subtask title cannot be empty" };

  try {
    const parent = await prisma.issue.findUnique({
      where: { id: parentIssueId },
      include: { project: true },
    });
    if (!parent) return { error: "This ticket is not persisted yet, so subtasks cannot be added." };
    if (!(await checkProjectAccess(user.id, parent.projectId))) {
      return { error: "You don't have access to this board" };
    }

    // number/key are unique per project and derived from the current max, so two
    // concurrent creates can pick the same number. Retry on the resulting unique
    // violation rather than surfacing a crash to whoever lost the race.
    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await prisma.issue.findFirst({
        where: { projectId: parent.projectId },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;

      try {
        await prisma.issue.create({
          data: {
            projectId: parent.projectId,
            parentId: parent.id,
            number,
            key: `${parent.project.key}-${number}`,
            summary: title.trim(),
            type: "SUBTASK",
            status: "TO_DO",
            priority: parent.priority,
            reporterId: user.id,
            assigneeId: parent.assigneeId,
          },
        });
        // Allocating from MAX(number) bypasses issueCounter, so the counter is
        // left behind. createIssue allocates from the counter, and would then
        // pick a number this subtask already took — recoverable, but only by
        // burning a failed transaction first. Keep the counter in step instead.
        await prisma.project.updateMany({
          where: { id: parent.projectId, issueCounter: { lt: number } },
          data: { issueCounter: number },
        });
        break;
      } catch (e: any) {
        // P2002 = unique constraint violation; anything else is a real failure.
        if (e?.code !== "P2002") throw e;
        if (attempt === 4) return { error: "Could not allocate a ticket number. Try again." };
      }
    }

    revalidatePath(`/projects/${parent.project.key}/issues/${parent.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function toggleSubtaskAction(subtaskId: string) {
  const user = await getAuthUser();
  try {
    const subtask = await prisma.issue.findUnique({
      where: { id: subtaskId },
      include: { project: true, parent: true },
    });
    if (!subtask) return { error: "Subtask not found" };

    // Deliberately bypasses updateIssue's assignee-only status rule — ticking
    // your own checklist item shouldn't require being the assignee — but a
    // tenant check is still required so any authenticated user can't flip
    // status on a foreign workspace's subtask.
    const access = await checkProjectAccess(user.id, subtask.projectId);
    if (!access) return { error: "You do not have access to this issue" };

    const nextStatus = subtask.status === "DONE" ? "TO_DO" : "DONE";
    await prisma.issue.update({ where: { id: subtaskId }, data: { status: nextStatus } });
    await prisma.issueHistory.create({
      data: {
        issueId: subtaskId,
        authorId: user.id,
        field: "status",
        oldValue: subtask.status,
        newValue: nextStatus,
      },
    });

    if (subtask.parent) {
      revalidatePath(`/projects/${subtask.project.key}/issues/${subtask.parent.key}`);
    }
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteSubtaskAction(subtaskId: string) {
  const user = await getAuthUser();
  try {
    const subtask = await prisma.issue.findUnique({
      where: { id: subtaskId },
      include: { project: true, parent: true },
    });
    if (!subtask) return { error: "Subtask not found" };
    if (!subtask.parentId) return { error: "This ticket is not a subtask" };
    if (!(await checkProjectAccess(user.id, subtask.projectId))) {
      return { error: "You don't have access to this board" };
    }

    await prisma.issue.delete({ where: { id: subtaskId } });

    if (subtask.parent) {
      revalidatePath(`/projects/${subtask.project.key}/issues/${subtask.parent.key}`);
    }
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Linked work items
// ---------------------------------------------------------------------------

export async function linkIssueAction(
  sourceIssueId: string,
  targetKey: string,
  relation: LinkRelation
) {
  const user = await getAuthUser();
  const userMemberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { siteId: true },
  });
  const siteIds = userMemberships.map((m) => m.siteId);

  try {
    const source = await prisma.issue.findUnique({
      where: { id: sourceIssueId },
      include: { project: true },
    });
    if (!source) return { error: "This ticket is not persisted yet, so links cannot be added." };

    // The target lookup below was already scoped by siteIds, but source was
    // trusted by bare id — without this an IssueLink row could be created
    // against a foreign tenant's issue.
    const access = await checkProjectAccess(user.id, source.projectId);
    if (!access) return { error: "You do not have access to this issue" };

    const target = await prisma.issue.findFirst({
      where: {
        key: targetKey.trim().toUpperCase(),
        project: { siteId: { in: siteIds } },
      },
    });
    if (!target) return { error: `No ticket found with key ${targetKey.trim().toUpperCase()}` };
    if (target.id === source.id) return { error: "A ticket cannot be linked to itself" };

    const existing = await prisma.issueLink.findFirst({
      where: { sourceIssueId: source.id, targetIssueId: target.id, relation },
    });
    if (existing) return { error: "That link already exists" };

    await prisma.issueLink.create({
      data: { sourceIssueId: source.id, targetIssueId: target.id, relation },
    });

    revalidatePath(`/projects/${source.project.key}/issues/${source.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function unlinkIssueAction(linkId: string) {
  const user = await getAuthUser();
  try {
    const link = await prisma.issueLink.findUnique({
      where: { id: linkId },
      include: { sourceIssue: { include: { project: true } } },
    });
    if (!link) return { error: "Link not found" };
    if (!(await checkProjectAccess(user.id, link.sourceIssue.projectId))) {
      return { error: "You don't have access to this board" };
    }

    await prisma.issueLink.delete({ where: { id: linkId } });

    revalidatePath(
      `/projects/${link.sourceIssue.project.key}/issues/${link.sourceIssue.key}`
    );
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export async function uploadAttachmentAction(issueId: string, formData: FormData) {
  const user = await getAuthUser();

  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    });
    if (!issue) return { error: "This ticket is not persisted yet, so files cannot be attached." };
    if (!(await checkProjectAccess(user.id, issue.projectId))) {
      return { error: "You don't have access to this board" };
    }

    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) return { error: "No files provided" };

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { error: "File storage is not configured. Set BLOB_READ_WRITE_TOKEN." };
    }

    for (const file of files) {
      if (file.size === 0) continue;
      if (file.size > MAX_ATTACHMENT_BYTES) {
        return { error: `${file.name} is larger than the 10 MB limit` };
      }

      // Blob storage, not local disk: serverless filesystems are read-only
      // and wiped between invocations. addRandomSuffix keeps two uploads of
      // the same filename from overwriting each other.
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`attachments/${issueId}/${safeName}`, file, {
        access: "public",
        addRandomSuffix: true,
      });

      await prisma.attachment.create({
        data: {
          issueId,
          uploaderId: user.id,
          filename: file.name,
          url: blob.url,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        },
      });
    }

    revalidatePath(`/projects/${issue.project.key}/issues/${issue.key}`);
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteAttachmentAction(attachmentId: string) {
  const user = await getAuthUser();
  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { issue: { include: { project: true } } },
    });
    if (!attachment) return { error: "Attachment not found" };
    if (!(await checkProjectAccess(user.id, attachment.issue.projectId))) {
      return { error: "You don't have access to this board" };
    }
    if (attachment.uploaderId !== user.id) {
      return { error: "You can only delete attachments you uploaded" };
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });
    // Best-effort blob cleanup: an already-deleted blob must not fail the request.
    await del(attachment.url).catch(() => {});

    revalidatePath(
      `/projects/${attachment.issue.project.key}/issues/${attachment.issue.key}`
    );
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function toggleWatcherAction(issueId: string) {
  const user = await getAuthUser();
  try {
    const guard = await resolveAccessibleIssue(user.id, issueId);
    if ("error" in guard) return { error: guard.error };

    const isWatching = await toggleWatcher(issueId, user.id);
    revalidatePath("/projects");
    return { success: true, isWatching };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteIssueAction(issueId: string) {
  const user = await getAuthUser();
  try {
    // deleteIssue() only checks that the issue exists, not that the caller
    // belongs to its project — verify tenant access before deleting.
    const target = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true },
    });
    if (!target) return { error: "Issue not found" };

    const access = await checkProjectAccess(user.id, target.projectId);
    if (!access) return { error: "You do not have access to this issue" };

    const res = await deleteIssue(issueId, user.id);
    revalidatePath(`/projects/${res.projectKey}`);
    revalidatePath("/projects");
    revalidatePath("/dashboards");
    return res;
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteCommentAction(commentId: string) {
  const user = await getAuthUser();
  try {
    const res = await deleteComment(commentId, user.id);
    revalidatePath("/projects");
    return res;
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function getIssueDevelopmentDataAction(issueId: string) {
  const user = await getAuthUser();
  try {
    // Returns commit hashes, messages, author names and PR titles — board
    // access is required before any of it leaves the server.
    const guard = await resolveAccessibleIssue(user.id, issueId);
    if ("error" in guard) return { commits: [], pullRequests: [], branches: [] };

    const [commits, pullRequests, branches] = await Promise.all([
      prisma.gitCommit.findMany({
        where: { issueId },
        orderBy: { committedAt: "desc" },
        take: 10,
      }),
      prisma.pullRequest.findMany({
        where: { issueId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.gitBranch.findMany({
        where: { issueId },
        take: 10,
      }),
    ]);

    return {
      commits: commits.map((c) => ({
        id: c.id,
        hash: c.hash,
        message: c.message,
        authorName: c.authorName,
        committedAt: c.committedAt.toISOString(),
        url: c.url,
      })),
      pullRequests: pullRequests.map((p) => ({
        id: p.id,
        prNumber: p.prNumber,
        title: p.title,
        status: p.status,
        authorName: p.authorName,
        url: p.url,
      })),
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        lastCommitHash: b.lastCommitHash,
      })),
    };
  } catch (e) {
    return { commits: [], pullRequests: [], branches: [] };
  }
}

export async function bulkUpdateIssuesAction(
  issueIds: string[],
  data: {
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    sprintId?: string | null;
  }
) {
  const user = await getAuthUser();
  if (!issueIds || issueIds.length === 0) {
    return { error: "No issues selected for bulk update" };
  }

  try {
    // Bulk writes take raw ids from the client with no inherent tenant scope —
    // resolve every selected issue's project and require access to all of them
    // before applying the update to any.
    const targets = await prisma.issue.findMany({
      where: { id: { in: issueIds } },
      select: { id: true, projectId: true },
    });
    const projectIds = Array.from(new Set(targets.map((t) => t.projectId)));
    for (const projectId of projectIds) {
      const access = await checkProjectAccess(user.id, projectId);
      if (!access) return { error: "You do not have access to one or more selected issues" };
    }

    const updatePayload: any = {};
    if (data.status) updatePayload.status = data.status;
    if (data.priority) updatePayload.priority = data.priority;
    if (data.assigneeId !== undefined) updatePayload.assigneeId = data.assigneeId;
    if (data.sprintId !== undefined) updatePayload.sprintId = data.sprintId;

    const res = await prisma.issue.updateMany({
      where: { id: { in: targets.map((t) => t.id) } },
      data: updatePayload,
    });

    revalidatePath("/projects");
    return { success: true, count: res.count };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Failed to perform bulk update" };
  }
}

export async function fetchLiveBoardIssuesAction(projectId: string, projectKey: string) {
  const user = await getAuthUser();
  try {
    // The 5-second board poller passes a client-supplied projectId — without
    // this check any authenticated user could read any tenant's full board.
    const access = await checkProjectAccess(user.id, projectId);
    if (!access) return { success: false, issues: [] };

    const issues = await getBoardIssues(projectId);
    return {
      success: true,
      issues: issues.map((i) => ({ ...i, projectKey })),
    };
  } catch (e) {
    return { success: false, issues: [] };
  }
}
