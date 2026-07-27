import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

import { resolveProjectByKey } from "@/lib/projects";

export default async function ProjectDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { userId, siteId, role } = await requireMembership();
  const { key } = await params;
  const upperKey = key.toUpperCase();

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  redirect(`/projects/${project.key}/board`);
}
