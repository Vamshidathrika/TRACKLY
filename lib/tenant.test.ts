import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    membership: { findUnique: vi.fn(), create: vi.fn() },
    projectMember: { findUnique: vi.fn(), create: vi.fn() },
    site: { create: vi.fn() },
  },
}));

vi.mock("./auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User" }),
}));

import { prisma } from "./prisma";
import { checkProjectAccess } from "./tenant";

import { delCachePrefix } from "./redis";

describe("checkProjectAccess DAL guard", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await delCachePrefix("user:");
  });

  it("grants WORKSPACE_ADMIN access when user is workspace ADMIN", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      key: "BOARD1",
      name: "Board One",
      siteId: "site-1",
      leadId: "other-user",
    });

    (prisma.membership.findUnique as any).mockResolvedValue({
      userId: "user-1",
      siteId: "site-1",
      role: "ADMIN",
    });

    const access = await checkProjectAccess("user-1", "proj-1", "site-1");

    expect(access).not.toBeNull();
    expect(access?.projectRole).toBe("WORKSPACE_ADMIN");
    // Should NOT query projectMember at all for admins
    expect(prisma.projectMember.findUnique).not.toHaveBeenCalled();
  });

  it("grants ADMIN access when user is Project Lead", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      key: "BOARD1",
      name: "Board One",
      siteId: "site-1",
      leadId: "user-1", // user IS the lead
    });

    (prisma.membership.findUnique as any).mockResolvedValue({
      userId: "user-1",
      siteId: "site-1",
      role: "MEMBER",
    });

    const access = await checkProjectAccess("user-1", "proj-1", "site-1");

    expect(access).not.toBeNull();
    expect(access?.projectRole).toBe("ADMIN");
  });

  it("grants access with explicit ProjectMember role", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      key: "BOARD1",
      name: "Board One",
      siteId: "site-1",
      leadId: "admin-1",
    });

    (prisma.membership.findUnique as any).mockResolvedValue({
      userId: "user-1",
      siteId: "site-1",
      role: "MEMBER",
    });

    (prisma.projectMember.findUnique as any).mockResolvedValue({
      projectId: "proj-1",
      userId: "user-1",
      role: "MEMBER",
    });

    const access = await checkProjectAccess("user-1", "proj-1", "site-1");

    expect(access).not.toBeNull();
    expect(access?.projectId).toBe("proj-1");
    expect(access?.projectRole).toBe("MEMBER");
  });

  it("denies access when user has no ProjectMember record and is not lead", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      key: "BOARD1",
      name: "Board One",
      siteId: "site-1",
      leadId: "admin-1",
    });

    (prisma.membership.findUnique as any).mockResolvedValue({
      userId: "user-1",
      siteId: "site-1",
      role: "MEMBER",
    });

    // No ProjectMember record exists
    (prisma.projectMember.findUnique as any).mockResolvedValue(null);

    const access = await checkProjectAccess("user-1", "proj-1", "site-1");

    expect(access).toBeNull();
    // Must NOT auto-create ProjectMember
    expect(prisma.projectMember.create).not.toHaveBeenCalled();
  });

  it("denies access when user has no workspace membership at all", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      key: "BOARD1",
      name: "Board One",
      siteId: "site-1",
      leadId: "admin-1",
    });

    // No membership at all
    (prisma.membership.findUnique as any).mockResolvedValue(null);

    const access = await checkProjectAccess("user-1", "proj-1", "site-1");

    expect(access).toBeNull();
    // Must NOT auto-create membership or project membership
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(prisma.projectMember.create).not.toHaveBeenCalled();
  });

  it("never mutates database during permission checks", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      key: "BOARD1",
      name: "Board One",
      siteId: "site-1",
      leadId: "admin-1",
    });

    (prisma.membership.findUnique as any).mockResolvedValue({
      userId: "user-1",
      siteId: "site-1",
      role: "MEMBER",
    });

    (prisma.projectMember.findUnique as any).mockResolvedValue(null);

    await checkProjectAccess("user-1", "proj-1", "site-1");

    // Verify zero mutations happened
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(prisma.projectMember.create).not.toHaveBeenCalled();
  });
});
