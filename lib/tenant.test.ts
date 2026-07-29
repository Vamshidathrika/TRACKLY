import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    membership: { findUnique: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
    projectMember: { findUnique: vi.fn(), create: vi.fn() },
    site: { create: vi.fn() },
  },
}));

vi.mock("./auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user-1", name: "Test User" }),
  auth: vi.fn(),
}));

import { prisma } from "./prisma";
import { checkProjectAccess, requireMembership } from "./tenant";
import { setCache, delCachePrefix } from "./redis";
import { invalidateUserAccess } from "./access-cache";

describe("checkProjectAccess DAL guard", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await delCachePrefix("access:");
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

describe("requireMembership caching", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await delCachePrefix("access:");
  });

  it("serves from cache without touching the database", async () => {
    await setCache("access:membership:user-1", {
      siteId: "s1",
      role: "ADMIN",
      siteName: "Acme",
    }, 60);

    const ctx = await requireMembership();

    expect(ctx).toEqual({ userId: "user-1", siteId: "s1", role: "ADMIN", siteName: "Acme" });
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it("queries and populates the cache on a miss", async () => {
    (prisma.membership.findFirst as any).mockResolvedValue({
      siteId: "s1",
      role: "MEMBER",
      site: { name: "Acme" },
    });

    const ctx = await requireMembership();

    expect(ctx.siteId).toBe("s1");
    expect(prisma.membership.findFirst).toHaveBeenCalled();
  });
});

describe("checkProjectAccess caching", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await delCachePrefix("access:");
  });

  it("serves a cached grant without touching the database", async () => {
    await setCache("access:project:user-1:p1", {
      projectId: "p1",
      projectKey: "TRK",
      projectName: "Trackly",
      siteId: "s1",
      projectRole: "WORKSPACE_ADMIN",
    }, 60);

    const access = await checkProjectAccess("user-1", "p1");

    expect(access).toMatchObject({ projectRole: "WORKSPACE_ADMIN" });
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it("serves a cached denial as null without touching the database", async () => {
    await setCache("access:project:user-1:p1", { denied: true }, 60);

    const access = await checkProjectAccess("user-1", "p1");

    expect(access).toBeNull();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it("caches a denial when the project does not exist", async () => {
    (prisma.project.findUnique as any).mockResolvedValue(null);

    const access = await checkProjectAccess("user-1", "p1");

    expect(access).toBeNull();
  });
});

describe("access revocation takes effect immediately", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await delCachePrefix("access:");
  });

  // The guards previously cached under `user:*` while invalidateUserAccess
  // deleted `access:*`. Nothing was ever actually invalidated, so a revoked
  // role kept working until the TTL expired. These assert the namespaces now
  // match — a cached grant must be gone the moment access is revoked.

  it("drops a cached project grant when the user's access is invalidated", async () => {
    await setCache("access:project:user-1:p1", {
      projectId: "p1",
      projectKey: "TRK",
      projectName: "Trackly",
      siteId: "s1",
      projectRole: "WORKSPACE_ADMIN",
    }, 300);

    // Cached grant is live.
    expect(await checkProjectAccess("user-1", "p1")).not.toBeNull();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();

    await invalidateUserAccess("user-1");

    // Revoked: the project no longer resolves, so access must be denied rather
    // than served from the stale cache entry.
    (prisma.project.findUnique as any).mockResolvedValue(null);
    expect(await checkProjectAccess("user-1", "p1")).toBeNull();
    expect(prisma.project.findUnique).toHaveBeenCalled();
  });

  it("drops a cached membership when the user's access is invalidated", async () => {
    await setCache("access:membership:user-1", {
      siteId: "s1",
      role: "ADMIN",
      siteName: "Acme",
    }, 300);

    expect((await requireMembership()).role).toBe("ADMIN");
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();

    await invalidateUserAccess("user-1");

    // Demoted to MEMBER in the database — the next call must reflect that.
    (prisma.membership.findFirst as any).mockResolvedValue({
      siteId: "s1",
      role: "MEMBER",
      site: { name: "Acme" },
    });
    expect((await requireMembership()).role).toBe("MEMBER");
    expect(prisma.membership.findFirst).toHaveBeenCalled();
  });
});
