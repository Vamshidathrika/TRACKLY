"use server";

import { revalidatePath } from "next/cache";
import {
  createAutomationRule,
  toggleAutomationRule,
} from "@/lib/automation";
import type { AutomationTrigger, AutomationAction } from "@prisma/client";

export async function createAutomationRuleAction(
  projectId: string,
  name: string,
  eventTrigger: AutomationTrigger,
  action: AutomationAction,
  targetValue: string
) {
  try {
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
    await toggleAutomationRule(ruleId);
    revalidatePath("/settings/automation");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
