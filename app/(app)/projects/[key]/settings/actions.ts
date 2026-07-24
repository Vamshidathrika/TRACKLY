"use server";

import { revalidatePath } from "next/cache";
import { requireMembership, requireAdmin } from "@/lib/tenant";
import { updateProjectDetails, createCustomField, deleteCustomField } from "@/lib/admin";

export async function updateProjectDetailsAction(projectId: string, name: string, key: string) {
  try {
    await requireAdmin();
    await updateProjectDetails(projectId, { name, key });
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function createCustomFieldAction(projectId: string, name: string, fieldType: string, required: boolean) {
  try {
    await requireMembership();
    const field = await createCustomField({ projectId, name, fieldType, required });
    revalidatePath("/projects");
    return { success: true, field };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}

export async function deleteCustomFieldAction(fieldId: string) {
  try {
    await requireMembership();
    await deleteCustomField(fieldId);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    throw e;
  }
}
