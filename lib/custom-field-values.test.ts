import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customFieldValue: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { setCustomFieldValue } from "./custom-field-values";
import type { CustomFieldDefinition } from "./custom-fields";

const field = (overrides: Partial<CustomFieldDefinition> = {}): CustomFieldDefinition => ({
  id: "field-1",
  projectId: "proj-1",
  name: "Story Points",
  type: "NUMBER",
  required: false,
  createdAt: new Date("2026-01-01"),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setCustomFieldValue", () => {
  it("upserts on [issueId, fieldId] with only the mapped column set", async () => {
    await setCustomFieldValue({ issueId: "issue-1", field: field(), value: 5 });

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
      where: { issueId_fieldId: { issueId: "issue-1", fieldId: "field-1" } },
      create: { issueId: "issue-1", fieldId: "field-1", valueNumber: 5 },
      update: { valueNumber: 5 },
    });
  });

  it("upserts a TEXT field to valueText", async () => {
    await setCustomFieldValue({ issueId: "issue-1", field: field({ id: "field-2", type: "TEXT" }), value: "hello" });

    expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
      where: { issueId_fieldId: { issueId: "issue-1", fieldId: "field-2" } },
      create: { issueId: "issue-1", fieldId: "field-2", valueText: "hello" },
      update: { valueText: "hello" },
    });
  });
});
