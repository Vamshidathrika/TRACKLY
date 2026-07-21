import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    invite: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    membership: { upsert: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));
import { prisma } from "./prisma";
import { createInvite, acceptInvite } from "./invites";

beforeEach(() => vi.clearAllMocks());

describe("createInvite", () => {
  it("creates invite with unique token and 7-day expiry", async () => {
    (prisma.invite.create as any).mockImplementation(async ({ data }: any) => data);
    const inv = await createInvite({ siteId: "s1", email: "x@y.z", role: "MEMBER" });
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const days = (new Date(inv.expiresAt).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });
});

describe("acceptInvite", () => {
  it("INVALID for unknown token", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue(null);
    expect(await acceptInvite("nope", "u1")).toEqual({ ok: false, reason: "INVALID" });
  });
  it("EXPIRED for past expiry", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), acceptedAt: null });
    expect(await acceptInvite("t", "u1")).toEqual({ ok: false, reason: "EXPIRED" });
  });
  it("USED for accepted invite", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue({ expiresAt: new Date(Date.now() + 1000), acceptedAt: new Date() });
    expect(await acceptInvite("t", "u1")).toEqual({ ok: false, reason: "USED" });
  });
  it("creates membership and marks accepted on success", async () => {
    (prisma.invite.findUnique as any).mockResolvedValue({
      id: "i1", siteId: "s1", role: "MEMBER", expiresAt: new Date(Date.now() + 1000), acceptedAt: null,
    });
    expect(await acceptInvite("t", "u1")).toEqual({ ok: true });
    expect(prisma.membership.upsert).toHaveBeenCalled();
    expect(prisma.invite.update).toHaveBeenCalled();
  });
});
