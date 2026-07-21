import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

export function extractMentions(text: string): string[] {
  const matches = text.match(/@([\w\.\-]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1))));
}

export async function createNotification(input: {
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}) {
  if (input.userId === input.actorId) return null; // Don't notify self

  return prisma.notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
    },
  });
}

export async function getNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function toggleWatcher(issueId: string, userId: string) {
  const existing = await prisma.watcher.findUnique({
    where: { issueId_userId: { issueId, userId } },
  });

  if (existing) {
    await prisma.watcher.delete({
      where: { issueId_userId: { issueId, userId } },
    });
    return false; // Now unwatched
  } else {
    await prisma.watcher.create({
      data: { issueId, userId },
    });
    return true; // Now watched
  }
}
