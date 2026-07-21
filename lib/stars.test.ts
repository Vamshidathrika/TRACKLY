import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    star: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    project: { findMany: vi.fn() },
    membership: { findMany: vi.fn() },
  },
}));
import { prisma } from "./prisma";
import { toggleStar } from "./stars";

beforeEach(() => vi.clearAllMocks());

describe("toggleStar", () => {
  it("creates star when absent", async () => {
    (prisma.star.findUnique as any).mockResolvedValue(null);
    (prisma.star.create as any).mockResolvedValue({ id: "s1" });
    expect(await toggleStar("u1", "p1")).toEqual({ starred: true });
    expect(prisma.star.create).toHaveBeenCalledWith({ data: { userId: "u1", projectId: "p1" } });
  });
  it("deletes star when present", async () => {
    (prisma.star.findUnique as any).mockResolvedValue({ id: "s1" });
    (prisma.star.delete as any).mockResolvedValue({});
    expect(await toggleStar("u1", "p1")).toEqual({ starred: false });
  });
});
