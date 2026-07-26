"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/tenant";
import { createCustomField, deleteCustomField } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createCustomFieldAction(input: {
  name: string;
  type: string;
  status: "Required" | "Optional" | "Hidden";
  description?: string;
}) {
  try {
    const { siteId } = await requireAdmin();

    const firstProject = await prisma.project.findFirst({
      where: { siteId },
      select: { id: true },
    });

    if (!firstProject) {
      return { success: false, error: "Create a project before adding global custom fields" };
    }

    const field = await createCustomField({
      projectId: firstProject.id,
      name: input.name,
      fieldType: input.type,
      required: input.status === "Required",
    });

    revalidatePath("/settings/fields");
    return { success: true, field };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to create field" };
  }
}

export async function deleteCustomFieldAction(fieldId: string) {
  try {
    await requireAdmin();
    await deleteCustomField(fieldId);
    revalidatePath("/settings/fields");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to delete field" };
  }
}
