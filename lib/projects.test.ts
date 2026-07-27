import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    project: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    projectMember: { create: vi.fn().mockResolvedValue({ id: "pm1" }) },
  },
}));
import { prisma } from "./prisma";
import { createProject, getProjects, getProjectByKey } from "./projects";

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

  it("resolves project globally if user is not yet in target site memberships", async () => {
    const { resolveProjectByKey } = await import("./projects");
    (prisma as any).membership = { findMany: vi.fn().mockResolvedValue([{ siteId: "s2" }]) };
    (prisma.project.findFirst as any)
      .mockResolvedValueOnce(null) // first lookup in user's site memberships (s2) returns null
      .mockResolvedValueOnce({ id: "p100", key: "SHARED", siteId: "s1" }); // global fallback lookup returns project in s1

    const project = await resolveProjectByKey("user-other", "s2", "SHARED");
    expect(project).toEqual({ id: "p100", key: "SHARED", siteId: "s1" });
    expect(prisma.project.findFirst).toHaveBeenCalledTimes(2);
  });
});
