import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    project: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    projectMember: { create: vi.fn().mockResolvedValue({ id: "pm1" }), upsert: vi.fn(), delete: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    deletedBoardLog: { create: vi.fn().mockResolvedValue({ id: "dbl1" }), findFirst: vi.fn() },
    star: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    customField: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    automationRule: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    sprint: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    issue: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    invite: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    gitRepository: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}));
import { prisma } from "./prisma";
import {
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "./projects";

describe("projects lib", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws KEY_TAKEN if key exists on site", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ id: "p1" });
    await expect(createProject({ siteId: "s1", name: "Demo", key: "DEMO", type: "KANBAN", leadId: "u1" }))
      .rejects.toThrow("KEY_TAKEN");
  });

  it("creates project with uppercase key", async () => {
    (prisma.project.findFirst as any).mockResolvedValue(null);
    (prisma.project.create as any).mockResolvedValue({ id: "p1", key: "DEMO", name: "Demo" });

    const res = await createProject({ siteId: "s1", name: "Demo", key: "demo", type: "SCRUM", leadId: "u1" });
    expect(res).toEqual({ id: "p1", key: "DEMO", name: "Demo" });
    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { siteId: "s1", name: "Demo", key: "DEMO", type: "SCRUM", leadId: "u1" },
    });
  });

  it("auto-generates key if omitted", async () => {
    (prisma.project.findFirst as any).mockResolvedValue(null);
    (prisma.project.create as any).mockImplementation(async ({ data }: any) => ({ id: "p2", ...data }));

    const res = await createProject({ siteId: "s1", name: "Mobile App", type: "KANBAN", leadId: "u1" });
    expect(res.key).toBe("MA");
  });

  it("updates project details cleanly", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({ id: "p1", siteId: "s1", key: "OLD" });
    (prisma.project.findFirst as any).mockResolvedValue(null);
    (prisma.project.update as any).mockResolvedValue({ id: "p1", key: "NEW", name: "Updated Name" });

    const res = await updateProject("s1", "p1", { name: "Updated Name", key: "NEW", type: "SCRUM" });
    expect(res.name).toBe("Updated Name");
    expect(prisma.project.update).toHaveBeenCalled();
  });

  it("deletes project cleanly when user is admin or lead", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({ id: "p1", siteId: "s1", key: "DEL", leadId: "u1" });
    (prisma as any).membership = { findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }) };
    (prisma as any).projectMember = { ...prisma.projectMember, findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }) };
    (prisma.project.delete as any).mockResolvedValue({ id: "p1" });

    const res = await deleteProject("s1", "p1", "u1");
    expect(res).toEqual({ success: true, key: "DEL" });
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("throws ONLY_OWNER_OR_ADMIN_CAN_DELETE if regular member tries to delete project", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({ id: "p1", siteId: "s1", key: "DEL", leadId: "owner-1" });
    (prisma as any).membership = { findUnique: vi.fn().mockResolvedValue({ role: "MEMBER" }) };
    (prisma as any).projectMember = { ...prisma.projectMember, findUnique: vi.fn().mockResolvedValue({ role: "MEMBER" }) };

    await expect(deleteProject("s1", "p1", "regular-user")).rejects.toThrow("ONLY_OWNER_OR_ADMIN_CAN_DELETE");
  });

  it("adds a project member with default role", async () => {
    (prisma.projectMember.create as any).mockResolvedValue({ id: "pm1", projectId: "p1", userId: "u2", role: "MEMBER" });

    const member = await addProjectMember({ projectId: "p1", userId: "u2" });
    expect(member.role).toBe("MEMBER");
    expect(prisma.projectMember.create).toHaveBeenCalledWith({
      data: { projectId: "p1", userId: "u2", role: "MEMBER" },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });
  });

  it("resolveProjectByKey returns null if project is outside user workspace memberships", async () => {
    const { resolveProjectByKey } = await import("./projects");
    (prisma as any).membership = { findMany: vi.fn().mockResolvedValue([{ siteId: "s2" }]) };
    // Project not found within user's workspaces
    (prisma.project.findFirst as any).mockResolvedValueOnce(null);

    const project = await resolveProjectByKey("user-other", "s2", "PRIVATE");
    expect(project).toBeNull();
    // Must NOT do a second global fallback query
    expect(prisma.project.findFirst).toHaveBeenCalledTimes(1);
  });

  it("getProjectsForUser returns strictly target siteId projects for workspace MEMBER", async () => {
    const { getProjectsForUser } = await import("./projects");
    (prisma as any).membership = {
      ...prisma.membership,
      findUnique: vi.fn().mockResolvedValue({ role: "MEMBER" }),
    };
    (prisma.projectMember.findMany as any).mockResolvedValue([
      { projectId: "p-joined" },
    ]);
    (prisma.project.findMany as any).mockResolvedValue([
      { id: "p-joined", siteId: "s-shared", key: "JOIN" },
    ]);

    await getProjectsForUser("s-shared", "user-b");

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siteId: "s-shared",
          OR: [
            { id: { in: ["p-joined"] } },
            { leadId: "user-b" },
          ],
        },
      })
    );
  });

  it("STRICT RULE: user in Workspace B with shared Board 1 from Workspace A sees Workspace B boards + Board 1, but NEVER Board 2 from Workspace A", async () => {
    const { getProjectsForUser } = await import("./projects");
    (prisma as any).membership = {
      ...prisma.membership,
      findUnique: vi.fn().mockResolvedValue({ role: "MEMBER" }),
    };
    // User B was explicitly granted access to Board 1 ONLY
    (prisma.projectMember.findMany as any).mockResolvedValue([
      { projectId: "board-1-id" },
    ]);
    (prisma.project.findMany as any).mockResolvedValue([
      { id: "board-b-id", siteId: "site-B", key: "BOARDB" },
      { id: "board-1-id", siteId: "site-A", key: "BOARD1" },
    ]);

    await getProjectsForUser("site-B", "user-B");

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siteId: "site-B",
          OR: [
            { id: { in: ["board-1-id"] } },
            { leadId: "user-B" },
          ],
        },
      })
    );
  });

  it("getProjectsForUser returns empty array when user has no workspace membership", async () => {
    const { getProjectsForUser } = await import("./projects");
    (prisma as any).membership = {
      ...prisma.membership,
      findUnique: vi.fn().mockResolvedValue(null),
    };

    const result = await getProjectsForUser("s1", "unknown-user");
    expect(result).toEqual([]);
  });
});

