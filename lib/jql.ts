import type { IssueStatus, IssueType, IssuePriority } from "@prisma/client";

export function parseJQLToPrisma(jql: string): Record<string, any> {
  const query = jql.trim();
  if (!query) return {};

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
      if (f === "status") where.status = { not: val.toUpperCase() as IssueStatus };
      if (f === "type") where.type = { not: val.toUpperCase() as IssueType };
      if (f === "priority") where.priority = { not: val.toUpperCase() as IssuePriority };
      if (f === "project") where.project = { key: { not: val.toUpperCase() } };
      continue;
    }

    // Check EQUALS operator (=)
    const equalsMatch = clause.match(/^(\w+)\s*=\s*["']?([^"']+)["']?$/i);
    if (equalsMatch) {
      const [, field, val] = equalsMatch;
      const f = field.toLowerCase();
      if (f === "status") where.status = val.toUpperCase() as IssueStatus;
      if (f === "type") where.type = val.toUpperCase() as IssueType;
      if (f === "priority") where.priority = val.toUpperCase() as IssuePriority;
      if (f === "project") where.project = { key: val.toUpperCase() };
      if (f === "key") where.key = val.toUpperCase();
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
