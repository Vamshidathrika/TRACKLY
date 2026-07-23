"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProject } from "@/lib/projects";
import type { ProjectType } from "@prisma/client";

const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  key: z.string().optional(),
  type: z.enum(["SCRUM", "KANBAN"]).optional(),
});

export async function createProjectAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
) {
  const user = await getAuthUser();

  let membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  if (!membership) {
    const site = await prisma.site.findFirst();
    if (site) {
      membership = await prisma.membership.create({
        data: { userId: user.id, siteId: site.id, role: "ADMIN" },
      });
    }
  }
  if (!membership) return { error: "Site membership required" };

  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const project = await createProject({
      siteId: membership.siteId,
      name: parsed.data.name,
      key: parsed.data.key,
      type: (parsed.data.type as ProjectType) ?? "KANBAN",
      leadId: user.id,
    });
    const { delCache } = await import("@/lib/redis");
    await delCache(`user:chrome:${user.id}`);
    revalidatePath("/projects");
    return { success: true };
  } catch (e) {
    if (e instanceof Error && e.message === "KEY_TAKEN") {
      return { error: "A project with this key already exists" };
    }
    throw e;
  }
}
