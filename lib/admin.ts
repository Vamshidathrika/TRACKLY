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

export async function removeWorkspaceMember(siteId: string, userId: string) {
  await prisma.projectMember.deleteMany({
    where: { userId },
  });
  return prisma.membership.deleteMany({
    where: { siteId, userId },
  });
}
