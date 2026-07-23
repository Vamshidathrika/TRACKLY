/**
 * Central tenant guard — the SINGLE source of truth for workspace & project access control.
 *
 * Every server action and page that touches tenant data MUST call one of these functions
 * instead of writing inline membership lookups or using prisma.site.findFirst() fallbacks.
 */
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getAuthUser } from "./auth";
import type { Role, ProjectRole } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TenantContext = {
  userId: string;
  siteId: string;
  role: Role;
  siteName: string;
};

export type ProjectContext = {
  projectId: string;
  projectKey: string;
  projectName: string;
  siteId: string;
  projectRole: ProjectRole | "WORKSPACE_ADMIN";
};

// ─── Workspace-Level Guard ──────────────────────────────────────────────────

/**
 * Returns the authenticated user's workspace context.
 * Guarantees a valid membership: if the user has no workspace membership,
 * connects them to the primary workspace or provisions a default workspace.
 */
export const requireMembership = cache(async (): Promise<TenantContext> => {
  const user = await getAuthUser();

  let membership = await prisma.membership.findFirst({
    where: { userId: user.id },
    include: { site: true },
    orderBy: { createdAt: "asc" }, // oldest = primary workspace
  });

  if (!membership) {
    // Auto-heal: If user has no membership, associate them with the primary site or create one
    const existingSite = await prisma.site.findFirst();
    if (existingSite) {
      membership = await prisma.membership.create({
        data: { userId: user.id, siteId: existingSite.id, role: "ADMIN" },
        include: { site: true },
      });
    } else {
      const { makeSlug } = await import("./slug");
      const siteName = `${user.name || "Main"}'s Workspace`;
      const newSite = await prisma.site.create({
        data: { name: siteName, slug: makeSlug(siteName) },
      });
      membership = await prisma.membership.create({
        data: { userId: user.id, siteId: newSite.id, role: "ADMIN" },
        include: { site: true },
      });
    }

    const { delCache } = await import("./redis");
    await delCache(`user:chrome:${user.id}`);
  }

  return {
    userId: user.id,
    siteId: membership.siteId,
    role: membership.role,
    siteName: membership.site.name,
  };
});

/**
 * Requires ADMIN role in the user's workspace.
 * Redirects to /your-work if user is not an admin.
 */
export const requireAdmin = cache(async (): Promise<TenantContext> => {
  const ctx = await requireMembership();
  if (ctx.role !== "ADMIN") {
    redirect("/your-work");
  }
  return ctx;
});

// ─── Project-Level Guard ────────────────────────────────────────────────────

/**
 * Checks if the user has access to a specific project.
 *
 * Access is granted if:
 *   1. User is a workspace ADMIN (bypass — sees all projects), OR
 *   2. User has a ProjectMember record for this project
 *
 * Returns null if no access (does NOT redirect — let caller decide).
 */
export const checkProjectAccess = cache(
  async (userId: string, projectId: string, siteId: string): Promise<ProjectContext | null> => {
    // Check workspace-level admin first
    const membership = await prisma.membership.findUnique({
      where: { userId_siteId: { userId, siteId } },
    });

    if (!membership) return null;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, key: true, name: true, siteId: true },
    });

    if (!project || project.siteId !== siteId) return null;

    // Workspace ADMINs have full access to all projects
    if (membership.role === "ADMIN") {
      return {
        projectId: project.id,
        projectKey: project.key,
        projectName: project.name,
        siteId: project.siteId,
        projectRole: "WORKSPACE_ADMIN",
      };
    }

    // Check per-project membership
    const projectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!projectMember) return null;

    return {
      projectId: project.id,
      projectKey: project.key,
      projectName: project.name,
      siteId: project.siteId,
      projectRole: projectMember.role,
    };
  }
);

/**
 * Like checkProjectAccess but redirects to /your-work on failure.
 */
export const requireProjectAccess = cache(
  async (userId: string, projectId: string, siteId: string): Promise<ProjectContext> => {
    const access = await checkProjectAccess(userId, projectId, siteId);
    if (!access) {
      redirect("/your-work");
    }
    return access;
  }
);

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Grant a user access to a specific project.
 * Idempotent — upserts the ProjectMember record.
 */
export async function grantProjectAccess(
  projectId: string,
  userId: string,
  role: ProjectRole = "MEMBER"
) {
  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: { role },
  });
}

/**
 * Revoke a user's access to a specific project.
 */
export async function revokeProjectAccess(projectId: string, userId: string) {
  return prisma.projectMember.deleteMany({
    where: { projectId, userId },
  });
}

/**
 * Auto-migrate: Grant a user access to ALL projects in their workspace.
 * Used during invite acceptance for workspace-wide invites (no projectId).
 */
export async function grantAllProjectAccess(siteId: string, userId: string, role: ProjectRole = "MEMBER") {
  const projects = await prisma.project.findMany({
    where: { siteId },
    select: { id: true },
  });

  if (projects.length === 0) return;

  // Use createMany with skipDuplicates for efficiency
  await prisma.projectMember.createMany({
    data: projects.map((p) => ({ projectId: p.id, userId, role })),
    skipDuplicates: true,
  });
}
