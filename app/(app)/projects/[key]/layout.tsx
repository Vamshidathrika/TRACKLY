import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { ProjectNav } from "@/components/chrome/ProjectNav";
import { RecentTracker } from "@/components/chrome/RecentTracker";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

const getCachedStar = cache(async (userId: string, projectId: string) => {
  return prisma.star.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
});

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ key: string }>;
}) {
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
    select: { id: true, key: true, name: true, siteId: true },
  });

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  const star = await getCachedStar(userId, project.id);

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
      <ProjectNav
        projectKey={project.key}
        projectName={project.name}
        projectId={project.id}
        initiallyStarred={!!star}
      />
      <RecentTracker projectKey={project.key} />
      <div className="min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

