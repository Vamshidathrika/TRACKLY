import { NextResponse } from "next/server";
import { getAutomationRules, createAutomationRule, getAutomationExecutionLogs } from "@/lib/automation";
import type { AutomationTrigger, AutomationAction } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId") || "demo-project";

  const rules = await getAutomationRules(projectId);
  const logs = getAutomationExecutionLogs();

  return NextResponse.json({
    rules,
    logs,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, name, eventTrigger, action, targetValue } = body;

    if (!projectId || !name || !eventTrigger || !action || !targetValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newRule = await createAutomationRule({
      projectId,
      name,
      eventTrigger: eventTrigger as AutomationTrigger,
      action: action as AutomationAction,
      targetValue,
    });

    return NextResponse.json({ rule: newRule });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create rule" }, { status: 500 });
  }
}
