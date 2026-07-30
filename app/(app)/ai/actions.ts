"use server";

import { requireMembership } from "@/lib/tenant";
import { executeAgentCommand } from "@/lib/ai/ticketAgent";

export async function submitCopilotCommandAction(command: string) {
  const { userId, siteId } = await requireMembership();
  if (!siteId) return { success: false, message: "Site workspace not found." };

  return executeAgentCommand(userId, siteId, command);
}

export async function reanalyzeActionPlanAction() {
  try {
    const { userId, siteId } = await requireMembership();
    if (!siteId) return { success: false, message: "Site workspace not found." };

    const { prisma } = await import("@/lib/prisma");

    const activeIssues = await prisma.issue.findMany({
      where: {
        assigneeId: userId,
        status: { in: ["TO_DO", "IN_PROGRESS", "IN_REVIEW"] },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { updatedAt: "desc" },
      ],
      take: 5,
      select: { id: true, key: true, summary: true, priority: true, status: true },
    });

    return {
      success: true,
      message: `AI Daily Action Plan updated! Prioritized ${activeIssues.length} active tasks based on urgency and priority rankings.`,
      prioritizedIssues: activeIssues,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to re-analyze plan." };
  }
}

export async function generateAcceptanceCriteriaAction(title: string, description?: string) {
  try {
    const { siteId } = await requireMembership();
    if (!siteId) return { success: false, error: "Site workspace not found." };

    const acMarkdown = `
### 📋 Acceptance Criteria
- [ ] **Given** a user interacts with ${title || "this feature"}
- [ ] **When** valid inputs and parameters are provided
- [ ] **Then** system processes payload efficiently and updates state synchronously
- [ ] **Given** edge cases or network latencies
- [ ] **Then** display appropriate error notifications and log trace details
`.trim();

    return { success: true, criteria: acMarkdown };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to generate acceptance criteria" };
  }
}

