import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { ProjectNav } from "@/components/chrome/ProjectNav";
import { RecentTracker } from "@/components/chrome/RecentTracker";

const getCachedProject = cache(async (upperKey: string, siteId: string) => {
  return prisma.project.findFirst({
    where: { key: upperKey, siteId },
    select: { id: true, key: true, name: true, siteId: true },
  });
});

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
  const { userId, siteId } = await requireMembership();

  const { key } = await params;
  const upperKey = key.toUpperCase();

  // Only look up projects within the user's own workspace — never cross-tenant
  const project = await getCachedProject(upperKey, siteId);
  if (!project) redirect("/projects");

  // Check project-level access (ADMIN bypasses, MEMBER/VIEWER needs ProjectMember)
  const access = await checkProjectAccess(userId, project.id, siteId);
  if (!access) redirect("/your-work");

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

