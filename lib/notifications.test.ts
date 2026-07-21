import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    notification: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    watcher: { findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
}));
import { prisma } from "./prisma";
import { extractMentions, createNotification, markNotificationsAsRead } from "./notifications";

describe("notifications lib", () => {
  beforeEach(() => vi.clearAllMocks());

  it("extracts mentions from text", () => {
    const mentions = extractMentions("Hey @Vamshi check this issue for @John");
    expect(mentions).toEqual(["Vamshi", "John"]);
  });

  it("creates notification record", async () => {
    (prisma.notification.create as any).mockResolvedValue({ id: "n1", title: "Mention" });
    const n = await createNotification({
      userId: "u1",
      actorId: "u2",
      type: "MENTION",
      title: "Mentioned in comment",
      message: "@User mentioned you",
      link: "/projects/DEMO/issues/DEMO-1",
    });
    expect(n?.title).toBe("Mention");
  });

  it("marks notifications as read", async () => {
    (prisma.notification.updateMany as any).mockResolvedValue({ count: 2 });
    const res = await markNotificationsAsRead("u1");
    expect(res.count).toBe(2);
  });
});
