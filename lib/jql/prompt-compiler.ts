export interface CompiledPromptAction {
  rawPrompt: string;
  generatedJQL: string;
  bulkUpdateSpec?: {
    field: string;
    value: string;
  };
  automationRuleSpec?: {
    name: string;
    eventTrigger: string;
    action: string;
    targetValue: string;
  };
  summary: string;
}

/**
 * Superpower 4: Natural Language JQL Prompt-to-Action Compiler
 * Compiles natural language prompts into executable JQL queries, bulk updates, and automation rule specs.
 */
export function compileNaturalLanguagePrompt(prompt: string): CompiledPromptAction {
  const cleanPrompt = prompt.trim();
  const lower = cleanPrompt.toLowerCase();

  let generatedJQL = 'status != "DONE"';
  let bulkField: string | undefined = undefined;
  let bulkValue: string | undefined = undefined;
  let automationTrigger: string | undefined = undefined;

  // JQL Parsing Rules
  if (lower.includes("p1") || lower.includes("high priority") || lower.includes("urgent")) {
    generatedJQL += ' AND priority = "HIGH"';
  }
  if (lower.includes("bug") || lower.includes("bugs") || lower.includes("defect")) {
    generatedJQL += ' AND type = "BUG"';
  }
  if (lower.includes("assigned to me") || lower.includes("my issues")) {
    generatedJQL += " AND assignee = me()";
  }

  // Bulk Action Intent Detection
  if (lower.includes("reassign to") || lower.includes("assign to lead")) {
    bulkField = "assigneeId";
    bulkValue = "lead_user_id";
  } else if (lower.includes("set priority to critical") || lower.includes("make critical")) {
    bulkField = "priority";
    bulkValue = "HIGH";
  } else if (lower.includes("move to in progress") || lower.includes("start work")) {
    bulkField = "status";
    bulkValue = "IN_PROGRESS";
  }

  // Automation Intent Detection
  if (lower.includes("notify slack") || lower.includes("automation") || lower.includes("alert")) {
    automationTrigger = "ISSUE_UPDATED";
  }

  let summary = `Compiled prompt into JQL: [${generatedJQL}]`;
  if (bulkField && bulkValue) {
    summary += ` with bulk action [${bulkField} -> ${bulkValue}]`;
  }
  if (automationTrigger) {
    summary += ` and generated automated alert rule.`;
  }

  return {
    rawPrompt: cleanPrompt,
    generatedJQL,
    bulkUpdateSpec: bulkField && bulkValue ? { field: bulkField, value: bulkValue } : undefined,
    automationRuleSpec: automationTrigger
      ? {
          name: `Prompt Auto Rule: ${cleanPrompt.slice(0, 30)}...`,
          eventTrigger: automationTrigger,
          action: "SEND_WEBHOOK",
          targetValue: "https://hooks.slack.com/services/trackly/alerts",
        }
      : undefined,
    summary,
  };
}
