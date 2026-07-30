export interface GeneratedAcceptanceCriteria {
  summary: string;
  criteria: string[];
  suggestedStoryPoints: number;
  testScenarios: string[];
}

export function generateAcceptanceCriteria(
  title: string,
  description?: string
): GeneratedAcceptanceCriteria {
  const cleanTitle = title.trim();
  const cleanDesc = (description || "").trim();

  const criteria: string[] = [
    `Given a user accesses the functionality for "${cleanTitle}", when they perform the action, system responds within 500ms.`,
    `Ensure validation errors are cleanly reported in UI for invalid inputs.`,
    `Verify security & authorization checks prevent unauthorized access.`,
  ];

  if (cleanDesc.toLowerCase().includes("upload") || cleanDesc.toLowerCase().includes("avatar")) {
    criteria.push("Validate max file size (5MB) and acceptable format extensions (PNG, JPG, WebP).");
  }

  if (cleanTitle.toLowerCase().includes("fix") || cleanTitle.toLowerCase().includes("bug")) {
    criteria.push("Verify regression coverage ensuring previously broken state is fully resolved.");
  }

  const testScenarios = [
    `Happy path: ${cleanTitle} succeeds with valid input`,
    `Edge case: Missing required fields shows clear validation message`,
    `Performance: High load/concurrent executions complete cleanly`,
  ];

  // Estimate story points based on length & keywords
  let points = 3;
  if (cleanDesc.length > 200 || cleanTitle.toLowerCase().includes("refactor")) {
    points = 5;
  } else if (cleanTitle.length < 25 && !description) {
    points = 1;
  }

  return {
    summary: `AI Criteria for: ${cleanTitle}`,
    criteria,
    suggestedStoryPoints: points,
    testScenarios,
  };
}

export function summarizeIssueContext(comments: string[]): string {
  if (!comments || comments.length === 0) {
    return "No discussion history available to summarize.";
  }

  const nonBlank = comments.filter((c) => c && c.trim().length > 0);
  if (nonBlank.length === 0) {
    return "No discussion history available to summarize.";
  }

  const bulletList = nonBlank.map((c) => `- ${c.trim()}`).join("\n");
  return `### Key Discussion Points (${nonBlank.length} comments)\n${bulletList}`;
}
