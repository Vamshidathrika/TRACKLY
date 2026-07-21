import { prisma } from "./prisma";
import type { AutomationTrigger, AutomationAction, IssueStatus } from "@prisma/client";

export async function createAutomationRule(input: {
  projectId: string;
  name: string;
  eventTrigger: AutomationTrigger;
  action: AutomationAction;
  targetValue: string;
}) {
  return prisma.automationRule.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      eventTrigger: input.eventTrigger,
      action: input.action,
      targetValue: input.targetValue,
      enabled: true,
    },
  });
}

export async function getAutomationRules(projectId: string) {
  return prisma.automationRule.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

export async function toggleAutomationRule(ruleId: string) {
  const existing = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!existing) return null;

  return prisma.automationRule.update({
    where: { id: ruleId },
    data: { enabled: !existing.enabled },
  });
}

export async function evaluateAutomationTriggers(
  eventTrigger: AutomationTrigger,
  payload: { issueId: string; projectId: string; authorId: string }
) {
  const rules = await prisma.automationRule.findMany({
    where: {
      projectId: payload.projectId,
      eventTrigger,
      enabled: true,
    },
  });

  for (const rule of rules) {
    if (rule.action === "ADD_COMMENT") {
      await prisma.comment.create({
        data: {
          issueId: payload.issueId,
          authorId: payload.authorId,
          body: rule.targetValue,
        },
      });
    }

    if (rule.action === "UPDATE_STATUS") {
      await prisma.issue.update({
        where: { id: payload.issueId },
        data: { status: rule.targetValue as IssueStatus },
      });
    }

    if (rule.action === "ASSIGN_USER") {
      await prisma.issue.update({
        where: { id: payload.issueId },
        data: { assigneeId: rule.targetValue },
      });
    }
  }
}
