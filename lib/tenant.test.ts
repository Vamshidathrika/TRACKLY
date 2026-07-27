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

describe("checkProjectAccess DAL guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("auto-grants project MEMBER access for a shared board link if user was previously removed", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({
      id: "proj-1",
      key: "SHARED",
      name: "Shared Board",
      siteId: "site-1",
      leadId: "admin-1",
    });

    (prisma.membership.findUnique as any).mockResolvedValue({
      userId: "user-1",
      siteId: "site-1",
      role: "MEMBER",
    });

    // Simulates user previously removed (findUnique returns null)
    (prisma.projectMember.findUnique as any).mockResolvedValue(null);
    (prisma.projectMember.create as any).mockResolvedValue({
      projectId: "proj-1",
      userId: "user-1",
      role: "MEMBER",
    });

    const access = await checkProjectAccess("user-1", "proj-1", "site-1");

    expect(access).not.toBeNull();
    expect(access?.projectId).toBe("proj-1");
    expect(access?.projectRole).toBe("MEMBER");
    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: { projectId: "proj-1", userId: "user-1", role: "MEMBER" },
    });
  });
});
