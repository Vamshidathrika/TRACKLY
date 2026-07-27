import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export async function updateProjectDetails(
  projectId: string,
  data: { name?: string; key?: string; leadId?: string }
) {
  return prisma.project.update({
    where: { id: projectId },
    data,
  });
}

export async function createCustomField(input: {
  projectId: string;
  name: string;
  fieldType?: string;
  required?: boolean;
}) {
  return prisma.customField.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      fieldType: input.fieldType ?? "STRING",
      required: input.required ?? false,
    },
  });
}

export async function getCustomFields(projectId: string) {
  return prisma.customField.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

export async function deleteCustomField(fieldId: string) {
  return prisma.customField.delete({
    where: { id: fieldId },
  });
}

export async function updateMemberRole(membershipId: string, role: Role) {
  return prisma.membership.update({
    where: { id: membershipId },
    data: { role },
  });
}

import { delCache } from "./redis";

export async function removeWorkspaceMember(siteId: string, userId: string) {
  // 1. Unassign all issues assigned to this user across all projects in the site so they disappear from board issues
  await prisma.issue.updateMany({
    where: {
      project: { siteId },
      assigneeId: userId,
    },
    data: { assigneeId: null },
  });

  // 2. If user is Project Lead on any project in the site, reassign to an existing Admin
  const adminMembership = await prisma.membership.findFirst({
    where: { siteId, role: "ADMIN", userId: { not: userId } },
    select: { userId: true },
  });

  if (adminMembership) {
    await prisma.project.updateMany({
      where: { siteId, leadId: userId },
      data: { leadId: adminMembership.userId },
    });
  }

  // 3. Delete Watchers for this user in this site
  await prisma.watcher.deleteMany({
    where: {
      userId,
      issue: { project: { siteId } },
    },
  });

  // 4. Delete ProjectMember records & Membership
  await prisma.projectMember.deleteMany({
    where: {
      userId,
      project: { siteId },
    },
  });

  const res = await prisma.membership.deleteMany({
    where: { siteId, userId },
  });

  // 5. Cache invalidation
  await delCache(`site:projects:${siteId}`).catch(() => {});
  await delCache(`user:chrome:${userId}`).catch(() => {});

  return res;
}

