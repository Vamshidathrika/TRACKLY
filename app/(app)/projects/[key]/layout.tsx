import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { resolveProjectByKey } from "@/lib/projects";
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

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={key.toUpperCase()} isAdmin={role === "ADMIN"} />;
  }

  const [access, star] = await Promise.all([
    checkProjectAccess(userId, project.id, project.siteId),
    getCachedStar(userId, project.id),
  ]);

  if (!access) {
    return <BoardNotFound projectKey={key.toUpperCase()} isAdmin={role === "ADMIN"} />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 overflow-hidden">
      <ProjectNav
        projectKey={project.key}
        projectName={project.name}
        projectId={project.id}
        projectType={project.type}
        initiallyStarred={!!star}
      />
      <RecentTracker projectKey={project.key} />
      <div className="min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

