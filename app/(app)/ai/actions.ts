"use server";

import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeAgentCommand } from "@/lib/ai/ticketAgent";

export async function submitCopilotCommandAction(command: string) {
  const user = await getAuthUser();
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id;
  if (!siteId) return { success: false, message: "Site workspace not found." };

  return executeAgentCommand(user.id, siteId, command);
}
