import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type UserOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
};

// Strict Multi-Tenant Scoped User Fetching

/**
 * Fetch team members belonging strictly to a specific Site / Tenant ID.
 */
export const getUsersForSite = cache(async (siteId: string): Promise<UserOption[]> => {
  if (!siteId) return [];
  try {
    const memberships = await prisma.membership.findMany({
      where: { siteId },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email || "Teammate",
      avatarUrl: m.user.avatarUrl,
      email: m.user.email,
    }));
  } catch (e) {
    console.error("Failed to fetch site users:", e);
    return [];
  }
});

/**
 * Fetch team members belonging strictly to the Site / Tenant that owns a given Project.
 */
export const getUsersForProject = cache(async (projectId: string): Promise<UserOption[]> => {
  if (!projectId) return [];
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { siteId: true },
    });
    if (!project?.siteId) return [];
    return getUsersForSite(project.siteId);
  } catch (e) {
    console.error("Failed to fetch project team members:", e);
    return [];
  }
});

/**
 * Fetch team members belonging to all Sites / Tenants where the logged-in user is a member.
 */
export const getUsersForAuthUser = cache(async (userId: string): Promise<UserOption[]> => {
  if (!userId) return [];
  try {
    const userMemberships = await prisma.membership.findMany({
      where: { userId },
      select: { siteId: true },
    });

    const siteIds = userMemberships.map((m) => m.siteId);
    if (siteIds.length === 0) return [];

    const siteMemberships = await prisma.membership.findMany({
      where: { siteId: { in: siteIds } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    const userMap = new Map<string, UserOption>();
    siteMemberships.forEach((m) => {
      userMap.set(m.user.id, {
        id: m.user.id,
        name: m.user.name || m.user.email || "Teammate",
        avatarUrl: m.user.avatarUrl,
        email: m.user.email,
      });
    });

    return Array.from(userMap.values());
  } catch (e) {
    console.error("Failed to fetch auth user's tenant team members:", e);
    return [];
  }
});

/**
 * Helper to fetch tenant-isolated users for a given site or user, falling back safely.
 */
export const getAllUsers = cache(
  async (siteId?: string, userId?: string): Promise<UserOption[]> => {
    if (siteId) {
      return getUsersForSite(siteId);
    }
    if (userId) {
      return getUsersForAuthUser(userId);
    }
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          email: true,
        },
        orderBy: { name: "asc" },
      });
      return users.map((u) => ({
        id: u.id,
        name: u.name || u.email || "Teammate",
        avatarUrl: u.avatarUrl,
        email: u.email,
      }));
    } catch (e) {
      console.error("Failed to fetch users:", e);
      return [];
    }
  }
);
