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

export async function sendSlackNotification(
  webhookUrl: string,
  payload: { title: string; text: string; link?: string }
) {
  if (!webhookUrl) return { success: false, error: "No webhook URL provided" };
  try {
    const body = {
      text: `*${payload.title}*\n${payload.text}${payload.link ? `\n<${payload.link}|View Task in Trackly>` : ""}`,
    };
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { success: false, error: e.message };
    return { success: false, error: "Failed to dispatch Slack notification" };
  }
}

export async function sendTeamsNotification(
  webhookUrl: string,
  payload: { title: string; text: string; link?: string }
) {
  if (!webhookUrl) return { success: false, error: "No webhook URL provided" };
  try {
    const body = {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: "4F46E5",
      summary: payload.title,
      sections: [
        {
          activityTitle: payload.title,
          activitySubtitle: "Trackly Task Update",
          text: payload.text,
          potentialAction: payload.link
            ? [
                {
                  "@type": "OpenUri",
                  name: "View Task",
                  targets: [{ os: "default", uri: payload.link }],
                },
              ]
            : [],
        },
      ],
    };
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { success: false, error: e.message };
    return { success: false, error: "Failed to dispatch Teams notification" };
  }
}
