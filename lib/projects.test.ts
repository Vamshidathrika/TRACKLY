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

  it("deletes project cleanly", async () => {
    (prisma.project.findUnique as any).mockResolvedValue({ id: "p1", siteId: "s1", key: "DEL" });
    (prisma.project.delete as any).mockResolvedValue({ id: "p1" });

    const res = await deleteProject("s1", "p1");
    expect(res).toEqual({ success: true, key: "DEL" });
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
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

  it("resolves project globally if user is not yet in target site memberships", async () => {
    const { resolveProjectByKey } = await import("./projects");
    (prisma as any).membership = { findMany: vi.fn().mockResolvedValue([{ siteId: "s2" }]) };
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "p100", key: "SHARED", siteId: "s1" });

    const project = await resolveProjectByKey("user-other", "s2", "SHARED");
    expect(project).toEqual({ id: "p100", key: "SHARED", siteId: "s1" });
    expect(prisma.project.findFirst).toHaveBeenCalledTimes(2);
  });

  it("restricts projects in non-admin sites to explicitly assigned projectMember IDs", async () => {
    const { getProjectsForUser } = await import("./projects");
    (prisma as any).membership = {
      findMany: vi.fn().mockResolvedValue([
        { siteId: "s-own", role: "ADMIN" },
        { siteId: "s-shared", role: "MEMBER" },
      ]),
    };
    (prisma.projectMember.findMany as any).mockResolvedValue([
      { projectId: "p-shared-1" },
    ]);
    (prisma.project.findMany as any).mockResolvedValue([
      { id: "p-own-1", siteId: "s-own", key: "OWN" },
      { id: "p-shared-1", siteId: "s-shared", key: "SH1" },
    ]);

    await getProjectsForUser("s-shared", "user-b");

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { siteId: { in: ["s-own"] } },
            {
              siteId: { in: ["s-shared"] },
              OR: [
                { id: { in: ["p-shared-1"] } },
                { leadId: "user-b" },
              ],
            },
          ],
        },
      })
    );
  });
});

