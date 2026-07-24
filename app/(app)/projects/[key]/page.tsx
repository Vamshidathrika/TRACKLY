import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

export default async function ProjectDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { userId, siteId, role } = await requireMembership();
  const { key } = await params;
  const upperKey = key.toUpperCase();

  let project = await prisma.project.findFirst({
    where: { key: upperKey, siteId },
    select: { id: true, key: true, name: true, type: true, siteId: true },
  });

  if (!project) {
    project = await prisma.project.findFirst({
      where: { key: upperKey },
      select: { id: true, key: true, name: true, type: true, siteId: true },
    });
  }

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  redirect(`/projects/${project.key}/board`);
}
