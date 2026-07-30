"use server";

import { requireMembership } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function exportWorkspaceDataAction() {
  try {
    const { siteId } = await requireMembership();

    const [site, projects, issues, members, customFields, integrations] = await Promise.all([
      prisma.site.findUnique({ where: { id: siteId }, select: { name: true, slug: true } }),
      prisma.project.findMany({ where: { siteId }, select: { id: true, name: true, key: true, type: true } }),
      prisma.issue.findMany({
        where: { project: { siteId } },
        select: {
          id: true,
          key: true,
          summary: true,
          description: true,
          status: true,
          priority: true,
          type: true,
          storyPoints: true,
          createdAt: true,
        },
      }),
      prisma.membership.findMany({
        where: { siteId },
        select: { id: true, role: true, user: { select: { name: true, email: true } } },
      }),
      prisma.customField.findMany({ where: { project: { siteId } } }),
      prisma.siteIntegration.findMany({ where: { siteId }, select: { provider: true, status: true } }),
    ]);

    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      workspace: {
        id: siteId,
        name: site?.name || "Trackly Workspace",
        slug: site?.slug || "workspace",
      },
      entityCounts: {
        projects: projects.length,
        issues: issues.length,
        members: members.length,
        customFields: customFields.length,
        integrations: integrations.length,
      },
      projects,
      issues,
      members: members.map((m) => ({ role: m.role, name: m.user.name, email: m.user.email })),
      customFields,
      integrations,
    };

    return { success: true, backupData };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Export failed" };
  }
}

