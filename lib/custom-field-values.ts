import { prisma } from "@/lib/prisma";
import { toPrismaValue, type CustomFieldDefinition, type CustomFieldValue } from "./custom-fields";

/**
 * Upserts one issue×field value row. `field` must be the field's current
 * definition — the caller (the server action) is responsible for fetching
 * it and running it through `validateCustomFieldValue` first; this function
 * does not validate, it only maps and persists.
 */
export async function setCustomFieldValue(input: {
  issueId: string;
  field: CustomFieldDefinition;
  value: CustomFieldValue["value"];
}): Promise<void> {
  const data = toPrismaValue(input.field, input.value);

  await prisma.customFieldValue.upsert({
    where: { issueId_fieldId: { issueId: input.issueId, fieldId: input.field.id } },
    create: { issueId: input.issueId, fieldId: input.field.id, ...data },
    update: data,
  });
}
