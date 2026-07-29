import { describe, test, expect } from "vitest";
import {
  validateCustomFieldValue,
  formatCustomFieldValue,
  buildDefaultFieldValue,
  getFieldTypeIcon,
  SYSTEM_FIELD_TEMPLATES,
  CustomFieldDefinition,
} from "./custom-fields";

const baseField = (
  overrides: Partial<CustomFieldDefinition> = {}
): CustomFieldDefinition => ({
  id: "field-001",
  projectId: "proj-001",
  name: "Test Field",
  type: "TEXT",
  required: false,
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

describe("Custom Fields Engine", () => {
  // ─── Validation Tests ────────────────────────────────────────────────────────

  test("allows empty value for non-required TEXT field", () => {
    const result = validateCustomFieldValue(baseField({ type: "TEXT" }), "");
    expect(result.valid).toBe(true);
  });

  test("rejects empty value for required field", () => {
    const result = validateCustomFieldValue(
      baseField({ required: true }),
      null
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("required");
  });

  test("validates NUMBER field correctly", () => {
    const field = baseField({ type: "NUMBER" });
    expect(validateCustomFieldValue(field, 42).valid).toBe(true);
    expect(validateCustomFieldValue(field, NaN).valid).toBe(false);
    expect(validateCustomFieldValue(field, "not-a-number" as any).valid).toBe(false);
  });

  test("validates DATE field with valid ISO string", () => {
    const field = baseField({ type: "DATE" });
    expect(validateCustomFieldValue(field, "2026-08-01").valid).toBe(true);
    expect(validateCustomFieldValue(field, "not-a-date").valid).toBe(false);
  });

  test("validates URL field", () => {
    const field = baseField({ type: "URL" });
    expect(validateCustomFieldValue(field, "https://sentry.io/issues/123").valid).toBe(true);
    expect(validateCustomFieldValue(field, "not-a-url").valid).toBe(false);
  });

  test("validates SELECT field against predefined options", () => {
    const field = baseField({
      type: "SELECT",
      options: ["Critical", "High", "Medium", "Low"],
    });
    expect(validateCustomFieldValue(field, "High").valid).toBe(true);
    expect(validateCustomFieldValue(field, "Unknown").valid).toBe(false);
  });

  test("validates MULTI_SELECT field against predefined options", () => {
    const field = baseField({
      type: "MULTI_SELECT",
      options: ["Production", "Staging", "Development"],
    });
    expect(validateCustomFieldValue(field, ["Production", "Staging"]).valid).toBe(true);
    expect(validateCustomFieldValue(field, ["Production", "Unknown"]).valid).toBe(false);
  });

  test("validates CHECKBOX field", () => {
    const field = baseField({ type: "CHECKBOX" });
    expect(validateCustomFieldValue(field, true).valid).toBe(true);
    expect(validateCustomFieldValue(field, false).valid).toBe(true);
    expect(validateCustomFieldValue(field, "yes" as any).valid).toBe(false);
  });

  // ─── Format Tests ────────────────────────────────────────────────────────────

  test("formats null as dash", () => {
    const field = baseField({ type: "TEXT" });
    expect(formatCustomFieldValue(field, null)).toBe("—");
  });

  test("formats DATE field to readable string", () => {
    const field = baseField({ type: "DATE" });
    const result = formatCustomFieldValue(field, "2026-08-15");
    expect(result).toContain("2026");
  });

  test("formats CHECKBOX as Yes/No", () => {
    const field = baseField({ type: "CHECKBOX" });
    expect(formatCustomFieldValue(field, true)).toBe("✓ Yes");
    expect(formatCustomFieldValue(field, false)).toBe("✗ No");
  });

  test("formats MULTI_SELECT as comma-separated string", () => {
    const field = baseField({ type: "MULTI_SELECT" });
    expect(formatCustomFieldValue(field, ["Production", "Staging"])).toBe("Production, Staging");
  });

  // ─── Default Value Builder ───────────────────────────────────────────────────

  test("builds default field value from definition", () => {
    const field = baseField({
      type: "NUMBER",
      defaultValue: 5,
    });
    const val = buildDefaultFieldValue(field, "issue-001");
    expect(val.fieldId).toBe("field-001");
    expect(val.issueId).toBe("issue-001");
    expect(val.value).toBe(5);
  });

  test("returns null value when no default defined", () => {
    const field = baseField({ type: "TEXT" });
    const val = buildDefaultFieldValue(field, "issue-002");
    expect(val.value).toBeNull();
  });

  // ─── Icon Mapping ────────────────────────────────────────────────────────────

  test("returns icon name for each field type", () => {
    expect(getFieldTypeIcon("TEXT")).toBe("Type");
    expect(getFieldTypeIcon("NUMBER")).toBe("Hash");
    expect(getFieldTypeIcon("DATE")).toBe("Calendar");
    expect(getFieldTypeIcon("CHECKBOX")).toBe("CheckSquare");
  });

  // ─── System Templates ────────────────────────────────────────────────────────

  test("system field templates are non-empty and have valid types", () => {
    expect(SYSTEM_FIELD_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of SYSTEM_FIELD_TEMPLATES) {
      expect(template.name).toBeTruthy();
      expect(template.type).toBeTruthy();
    }
  });
});
