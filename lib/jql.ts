import type { IssueStatus, IssueType, IssuePriority } from "@prisma/client";

export function parseJQLToPrisma(jql: string): Record<string, any> {
  const query = jql.trim();
  if (!query) return {};

  // Parse OR conditions
  if (/\s+OR\s+/i.test(query)) {
    const parts = query.split(/\s+OR\s+/i);
    const orConditions = parts.map((part) => parseJQLToPrisma(part)).filter((cond) => Object.keys(cond).length > 0);
    if (orConditions.length > 0) {
      return { OR: orConditions };
    }
    return {};
  }

  const clauses = query.split(/\s+AND\s+/i);
  const where: Record<string, any> = {};

  for (const clause of clauses) {
    // Check CONTAINS operator (~ or CONTAINS)
    const containsMatch = clause.match(/^(\w+)\s+(?:~|CONTAINS)\s+["']?([^"']+)["']?$/i);
    if (containsMatch) {
      const [, field, val] = containsMatch;
      const f = field.toLowerCase();
      if (f === "summary" || f === "description" || f === "text") {
        where[f === "text" ? "summary" : f] = { contains: val, mode: "insensitive" };
      }
      continue;
    }

    // Check NOT EQUALS operator (!=)
    const notEqualsMatch = clause.match(/^(\w+)\s*!=\s*["']?([^"']+)["']?$/i);
    if (notEqualsMatch) {
      const [, field, val] = notEqualsMatch;
      const f = field.toLowerCase();
      const norm = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
      if (f === "status") where.status = { not: norm as IssueStatus };
      if (f === "type") where.type = { not: norm as IssueType };
      if (f === "priority") where.priority = { not: norm as IssuePriority };
      if (f === "project") where.project = { key: { not: norm } };
      continue;
    }

    // Check EQUALS operator (=)
    const equalsMatch = clause.match(/^(\w+)\s*=\s*["']?([^"']+)["']?$/i);
    if (equalsMatch) {
      const [, field, val] = equalsMatch;
      const f = field.toLowerCase();
      const norm = val.trim().toUpperCase().replace(/[\s-]+/g, "_");
      if (f === "status") where.status = norm as IssueStatus;
      if (f === "type") where.type = norm as IssueType;
      if (f === "priority") where.priority = norm as IssuePriority;
      if (f === "project") where.project = { key: norm };
      if (f === "key") where.key = norm;
      continue;
    }
  }

  return where;
}

const FIELDS = ["project", "key", "type", "status", "priority", "summary", "text"];
const STATUSES = ["TO_DO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const TYPES = ["STORY", "TASK", "BUG", "EPIC", "SUBTASK"];
const PRIORITIES = ["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"];

export function getJQLSuggestions(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return FIELDS;

  const lastToken = trimmed.split(/\s+/).pop() || "";
  const upper = trimmed.toUpperCase();

  if (upper.endsWith("STATUS =") || upper.endsWith("STATUS = ")) return STATUSES;
  if (upper.endsWith("TYPE =") || upper.endsWith("TYPE = ")) return TYPES;
  if (upper.endsWith("PRIORITY =") || upper.endsWith("PRIORITY = ")) return PRIORITIES;

  return FIELDS.filter((f) => f.startsWith(lastToken.toLowerCase()));
}

export function convertNaturalLanguageToJQL(prompt: string): string {
  const p = prompt.trim().toLowerCase();
  if (!p) return "status = IN_PROGRESS OR status = TO_DO";

  const clauses: string[] = [];

  // Priority detection
  if (p.includes("highest")) clauses.push('priority = "HIGHEST"');
  else if (p.includes("high") || p.includes("urgent") || p.includes("critical")) clauses.push('priority = "HIGH"');
  else if (p.includes("medium")) clauses.push('priority = "MEDIUM"');
  else if (p.includes("low")) clauses.push('priority = "LOW"');

  // Type detection
  if (p.includes("bug") || p.includes("bugs") || p.includes("defect")) clauses.push('type = "BUG"');
  else if (p.includes("story") || p.includes("stories") || p.includes("feature")) clauses.push('type = "STORY"');
  else if (p.includes("epic") || p.includes("epics")) clauses.push('type = "EPIC"');
  else if (p.includes("subtask") || p.includes("subtasks")) clauses.push('type = "SUBTASK"');
  else if (p.includes("task") || p.includes("tasks")) clauses.push('type = "TASK"');

  // Status detection
  if (p.includes("in progress") || p.includes("active") || p.includes("doing") || p.includes("working on")) clauses.push('status = "IN_PROGRESS"');
  else if (p.includes("in review") || p.includes("review")) clauses.push('status = "IN_REVIEW"');
  else if (p.includes("done") || p.includes("completed") || p.includes("closed") || p.includes("finished")) clauses.push('status = "DONE"');
  else if (p.includes("todo") || p.includes("to do") || p.includes("open") || p.includes("pending")) clauses.push('status = "TO_DO"');

  // Text search fallback if no clauses parsed
  if (clauses.length === 0) {
    clauses.push(`summary ~ "${prompt.trim().replace(/"/g, "")}"`);
  }

  return clauses.join(" AND ");
}
