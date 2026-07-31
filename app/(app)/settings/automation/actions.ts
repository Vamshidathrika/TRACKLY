"use server";

import { revalidatePath } from "next/cache";
import {
  createAutomationRule,
  toggleAutomationRule,
} from "@/lib/automation";
import { getAuthUser } from "@/lib/auth";
import { checkProjectAccess } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import type { AutomationTrigger, AutomationAction } from "@prisma/client";

export async function createAutomationRuleAction(
  projectId: string,
  name: string,
  eventTrigger: AutomationTrigger,
  action: AutomationAction,
  targetValue: string
) {
  try {
    const user = await getAuthUser();
    const access = await checkProjectAccess(user.id, projectId);
    // Automation rules are a persistent write primitive (ASSIGN_USER, UPDATE_STATUS,
    // ADD_COMMENT fire automatically on future events) — a plain MEMBER planting one
    // is effectively standing access to mutate the board, so require board/workspace
    // admin, not just membership.
    if (!access || (access.projectRole !== "ADMIN" && access.projectRole !== "WORKSPACE_ADMIN")) {
      return { error: "Only board admins can configure automation rules" };
    }

    await createAutomationRule({ projectId, name, eventTrigger, action, targetValue });
    revalidatePath("/settings/automation");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function toggleAutomationRuleAction(ruleId: string) {
  try {
    const user = await getAuthUser();
    // ruleId is client-supplied — resolve it to its project rather than trusting
    // the caller, then require the same admin bar as creating a rule.
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      select: { projectId: true },
    });
    if (!rule) return { error: "Automation rule not found" };

    const access = await checkProjectAccess(user.id, rule.projectId);
    if (!access || (access.projectRole !== "ADMIN" && access.projectRole !== "WORKSPACE_ADMIN")) {
      return { error: "Only board admins can configure automation rules" };
    }

    await toggleAutomationRule(ruleId);
    revalidatePath("/settings/automation");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteAutomationRuleAction(ruleId: string) {
  try {
    const user = await getAuthUser();
    const rule = await prisma.automationRule.findUnique({
      where: { id: ruleId },
      select: { projectId: true },
    });
    if (!rule) return { error: "Automation rule not found" };

    const access = await checkProjectAccess(user.id, rule.projectId);
    if (!access || (access.projectRole !== "ADMIN" && access.projectRole !== "WORKSPACE_ADMIN")) {
      return { error: "Only board admins can configure automation rules" };
    }

    await prisma.automationRule.delete({
      where: { id: ruleId },
    });

    revalidatePath("/settings/automation");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

