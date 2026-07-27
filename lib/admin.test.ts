import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    project: { update: vi.fn(), updateMany: vi.fn() },
    issue: { updateMany: vi.fn() },
    watcher: { deleteMany: vi.fn() },
    projectMember: { deleteMany: vi.fn() },
    membership: { update: vi.fn(), findFirst: vi.fn(), deleteMany: vi.fn() },
    customField: { create: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
  },
}));
import { prisma } from "./prisma";
import { updateProjectDetails, createCustomField, updateMemberRole, removeWorkspaceMember } from "./admin";

describe("admin & permissions data layer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates project name and key", async () => {
    (prisma.project.update as any).mockResolvedValue({
      id: "p1",
      name: "Updated Project",
      key: "UPD",
    });

    const project = await updateProjectDetails("p1", { name: "Updated Project", key: "UPD" });
    expect(project.name).toBe("Updated Project");
    expect(project.key).toBe("UPD");
  });

  it("creates custom field", async () => {
    (prisma.customField.create as any).mockResolvedValue({
      id: "cf1",
      name: "Environment",
      fieldType: "STRING",
      required: true,
    });

    const field = await createCustomField({
      projectId: "p1",
      name: "Environment",
      fieldType: "STRING",
      required: true,
    });

    expect(field.name).toBe("Environment");
    expect(field.required).toBe(true);
  });

  it("updates workspace member role", async () => {
    (prisma.membership.update as any).mockResolvedValue({
      id: "m1",
      role: "ADMIN",
    });

    const membership = await updateMemberRole("m1", "ADMIN");
    expect(membership.role).toBe("ADMIN");
  });

  it("unassigns issues and removes workspace membership", async () => {
    (prisma.issue.updateMany as any).mockResolvedValue({ count: 2 });
    (prisma.membership.findFirst as any).mockResolvedValue({ userId: "admin1" });
    (prisma.project.updateMany as any).mockResolvedValue({ count: 0 });
    (prisma.watcher.deleteMany as any).mockResolvedValue({ count: 0 });
    (prisma.projectMember.deleteMany as any).mockResolvedValue({ count: 1 });
    (prisma.membership.deleteMany as any).mockResolvedValue({ count: 1 });

    await removeWorkspaceMember("s1", "user-to-remove");

    expect(prisma.issue.updateMany).toHaveBeenCalledWith({
      where: { project: { siteId: "s1" }, assigneeId: "user-to-remove" },
      data: { assigneeId: null },
    });
    expect(prisma.membership.deleteMany).toHaveBeenCalledWith({
      where: { siteId: "s1", userId: "user-to-remove" },
    });
  });
});

