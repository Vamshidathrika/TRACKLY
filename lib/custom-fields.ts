/**
 * Dynamic Custom Fields Engine for Trackly.
 * Competitor Benchmark: Jira Custom Fields (Select, Date, Multi-select, Number, URL, Text).
 * Allows teams to define project-specific custom metadata on issues.
 */

// ─── Custom Field Type Definitions ────────────────────────────────────────────

export type CustomFieldType =
  | "TEXT"         // Short single-line string
  | "TEXTAREA"     // Multi-line text block
  | "NUMBER"       // Numeric value (integer or float)
  | "DATE"         // ISO date string
  | "SELECT"       // Single option from a predefined list
  | "MULTI_SELECT" // Multiple options from a predefined list
  | "URL"          // Valid URL string
  | "CHECKBOX"     // Boolean flag
  | "USER"         // User ID reference
  | "LABEL";       // Tag string

export interface CustomFieldDefinition {
  id: string;
  projectId: string;
  name: string;
  type: CustomFieldType;
  options?: string[];          // For SELECT / MULTI_SELECT fields
  required: boolean;
  defaultValue?: string | number | boolean | string[];
  description?: string;
  createdAt: Date;
}

export interface CustomFieldValue {
  fieldId: string;
  issueId: string;
  value: string | number | boolean | string[] | null;
}

export interface CustomFieldValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Predefined System Custom Field Templates (Competitor-parity) ─────────────

export const SYSTEM_FIELD_TEMPLATES: Omit<CustomFieldDefinition, "id" | "projectId" | "createdAt">[] = [
  {
    name: "Story Points",
    type: "NUMBER",
    required: false,
    defaultValue: 1,
    description: "Effort estimation using Fibonacci-style story points",
  },
  {
    name: "Customer Impact",
    type: "SELECT",
    options: ["Critical", "High", "Medium", "Low", "None"],
    required: false,
    defaultValue: "Low",
    description: "Business-facing customer impact level",
  },
  {
    name: "Environment",
    type: "MULTI_SELECT",
    options: ["Production", "Staging", "Development", "QA"],
    required: false,
    description: "Affected deployment environments",
  },
  {
    name: "External Bug Link",
    type: "URL",
    required: false,
    description: "Link to external issue tracker, Sentry, or crash log",
  },
  {
    name: "Epic Link",
    type: "TEXT",
    required: false,
    description: "Epic or initiative this issue belongs to",
  },
  {
    name: "Target Release",
    type: "DATE",
    required: false,
    description: "Planned release date for this feature or fix",
  },
  {
    name: "Blocked By",
    type: "TEXT",
    required: false,
    description: "Issue key or external dependency blocking progress",
  },
  {
    name: "Design Ready",
    type: "CHECKBOX",
    required: false,
    defaultValue: false,
    description: "Marks when design assets are finalized and ready",
  },
];

// ─── Field Validation Engine ──────────────────────────────────────────────────

export function validateCustomFieldValue(
  definition: CustomFieldDefinition,
  value: CustomFieldValue["value"]
): CustomFieldValidationResult {
  const errors: string[] = [];

  // Required check
  if (definition.required) {
    const isEmpty =
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      errors.push(`Field "${definition.name}" is required.`);
    }
  }

  if (value === null || value === undefined || value === "") {
    return { valid: errors.length === 0, errors };
  }

  // Type-specific validation
  switch (definition.type) {
    case "NUMBER":
      if (typeof value !== "number" || isNaN(value as number)) {
        errors.push(`Field "${definition.name}" must be a valid number.`);
      }
      break;

    case "DATE":
      if (typeof value === "string" && isNaN(Date.parse(value))) {
        errors.push(`Field "${definition.name}" must be a valid date string (ISO 8601).`);
      }
      break;

    case "URL":
      try {
        if (typeof value === "string") new URL(value);
      } catch {
        errors.push(`Field "${definition.name}" must be a valid URL (e.g. https://example.com).`);
      }
      break;

    case "SELECT":
      if (definition.options && !definition.options.includes(value as string)) {
        errors.push(
          `Field "${definition.name}" must be one of: ${definition.options.join(", ")}.`
        );
      }
      break;

    case "MULTI_SELECT":
      if (Array.isArray(value) && definition.options) {
        const invalid = (value as string[]).filter((v) => !definition.options!.includes(v));
        if (invalid.length > 0) {
          errors.push(
            `Field "${definition.name}" contains invalid options: ${invalid.join(", ")}.`
          );
        }
      }
      break;

    case "CHECKBOX":
      if (typeof value !== "boolean") {
        errors.push(`Field "${definition.name}" must be a boolean (true/false).`);
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

// ─── Custom Field Utilities ───────────────────────────────────────────────────

/** Format a custom field value for display in the UI */
export function formatCustomFieldValue(
  definition: CustomFieldDefinition,
  value: CustomFieldValue["value"]
): string {
  if (value === null || value === undefined || value === "") return "—";

  switch (definition.type) {
    case "DATE":
      return new Date(value as string).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    case "CHECKBOX":
      return value ? "✓ Yes" : "✗ No";
    case "MULTI_SELECT":
      return Array.isArray(value) ? (value as string[]).join(", ") : String(value);
    case "NUMBER":
      return String(value);
    default:
      return String(value);
  }
}

/** Get display icon hint for each field type */
export function getFieldTypeIcon(type: CustomFieldType): string {
  const icons: Record<CustomFieldType, string> = {
    TEXT: "Type",
    TEXTAREA: "AlignLeft",
    NUMBER: "Hash",
    DATE: "Calendar",
    SELECT: "ChevronDown",
    MULTI_SELECT: "Tags",
    URL: "Link",
    CHECKBOX: "CheckSquare",
    USER: "User",
    LABEL: "Tag",
  };
  return icons[type] ?? "Circle";
}

/** Build an empty default custom field value for a new issue */
export function buildDefaultFieldValue(
  definition: CustomFieldDefinition,
  issueId: string
): CustomFieldValue {
  return {
    fieldId: definition.id,
    issueId,
    value: definition.defaultValue ?? null,
  };
}

// ─── Prisma Column Mapping ─────────────────────────────────────────────────

export type CustomFieldValueColumn =
  | "valueText"
  | "valueNumber"
  | "valueDate"
  | "valueBoolean"
  | "valueTextArray";

/** Which CustomFieldValue column a given field type is stored in. */
export function columnForType(type: CustomFieldType): CustomFieldValueColumn {
  switch (type) {
    case "NUMBER":
      return "valueNumber";
    case "DATE":
      return "valueDate";
    case "CHECKBOX":
      return "valueBoolean";
    case "MULTI_SELECT":
      return "valueTextArray";
    case "TEXT":
    case "TEXTAREA":
    case "URL":
    case "SELECT":
    case "USER":
    case "LABEL":
      return "valueText";
  }
}

/**
 * Builds the Prisma `data` fragment for one field's value — exactly one
 * column populated, matching `columnForType`. `null` clears the mapped
 * column (writes null, doesn't touch the others).
 */
export function toPrismaValue(
  definition: CustomFieldDefinition,
  value: CustomFieldValue["value"]
): Record<string, unknown> {
  const column = columnForType(definition.type);

  if (column === "valueDate") {
    return { valueDate: value === null || value === undefined ? null : new Date(value as string) };
  }
  if (column === "valueTextArray") {
    return { valueTextArray: Array.isArray(value) ? value : [] };
  }
  return { [column]: value ?? null };
}
