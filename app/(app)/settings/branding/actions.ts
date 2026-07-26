"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function updateWorkspaceBrandingAction(data: { name: string; slug?: string }) {
  try {
    const { siteId } = await requireAdmin();

    await prisma.site.update({
      where: { id: siteId },
      data: {
        name: data.name,
        ...(data.slug ? { slug: data.slug } : {}),
      },
    });

    revalidatePath("/settings/branding");
    revalidatePath("/(app)", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update branding" };
  }
}
