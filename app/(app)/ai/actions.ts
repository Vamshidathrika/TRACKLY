"use server";

import { requireMembership } from "@/lib/tenant";
import { executeAgentCommand } from "@/lib/ai/ticketAgent";

export async function submitCopilotCommandAction(command: string) {
  const { userId, siteId } = await requireMembership();
  if (!siteId) return { success: false, message: "Site workspace not found." };

  return executeAgentCommand(userId, siteId, command);
}
