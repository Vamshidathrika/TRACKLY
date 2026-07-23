import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "@/components/chrome/ProjectNav";
import { RecentTracker } from "@/components/chrome/RecentTracker";

const getCachedProject = cache(async (upperKey: string) => {
  return prisma.project.findFirst({
    where: { key: upperKey },
    select: { id: true, key: true, name: true, siteId: true },
  });
});

const getCachedMembership = cache(async (userId: string, siteId: string) => {
  return prisma.membership.findFirst({
    where: { userId, siteId },
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
  const user = await getAuthUser();
  const userId = user.id;

  const { key } = await params;
  const upperKey = key.toUpperCase();

  const project = await getCachedProject(upperKey);
  if (!project) redirect("/projects");

  // Fetch membership & star concurrently
  const [membership, star] = await Promise.all([
    getCachedMembership(userId, project.siteId),
    getCachedStar(userId, project.id),
  ]);

  if (!membership) {
    await prisma.membership.create({
      data: {
        userId,
        siteId: project.siteId,
        role: "MEMBER",
      },
    });
    const { delCache } = await import("@/lib/redis");
    await delCache(`user:chrome:${userId}`);
  }

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
