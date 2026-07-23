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
