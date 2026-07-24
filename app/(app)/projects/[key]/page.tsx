import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

export default async function ProjectDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { userId, siteId, role } = await requireMembership();
  const { key } = await params;
  const upperKey = key.toUpperCase();

  const userMemberships = await prisma.membership.findMany({ where: { userId }, select: { siteId: true } });
  const siteIds = Array.from(new Set(userMemberships.map((m) => m.siteId).concat(siteId)));

  const project = await prisma.project.findFirst({
    where: {
      siteId: { in: siteIds },
      OR: [
        { key: upperKey },
        { name: { equals: key, mode: "insensitive" } },
        { id: key },
      ],
    },
    select: { id: true, key: true, name: true, type: true, siteId: true },
  });

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  redirect(`/projects/${project.key}/board`);
}
