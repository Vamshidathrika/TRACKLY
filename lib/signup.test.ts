import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    invite: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));
import { prisma } from "./prisma";
import { createAccount } from "./signup";

describe("createAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws EMAIL_TAKEN when email exists", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "u1" });
    await expect(createAccount({ email: "a@b.c", password: "secret123", name: "A", siteName: "S" }))
      .rejects.toThrow("EMAIL_TAKEN");
  });

  it("creates user+site+admin membership in one transaction", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.$transaction as any).mockImplementation(async (fn: any) =>
      fn({
        user: { create: vi.fn().mockResolvedValue({ id: "u1" }) },
        site: { create: vi.fn().mockResolvedValue({ id: "s1" }) },
        membership: { create: vi.fn().mockResolvedValue({ id: "m1" }) },
      }));
    const res = await createAccount({ email: "a@b.c", password: "secret123", name: "A", siteName: "S" });
    expect(res).toEqual({ userId: "u1", siteId: "s1" });
  });
});
