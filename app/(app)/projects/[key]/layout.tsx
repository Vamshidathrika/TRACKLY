import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "@/components/chrome/ProjectNav";
import { RecentTracker } from "@/components/chrome/RecentTracker";

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

  // 1. Find project globally by key across all workspace sites
  const project = await prisma.project.findFirst({
    where: { key: upperKey },
    select: { id: true, key: true, name: true, siteId: true },
  });

  if (!project) redirect("/projects");

  // 2. Collaborative Access: Ensure visiting user has a membership in project.siteId
  const membership = await prisma.membership.findFirst({
    where: { userId, siteId: project.siteId },
  });

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

  // 3. Check if project is starred
  const star = await prisma.star.findUnique({
    where: { userId_projectId: { userId, projectId: project.id } },
  });

  return (
    <div className="flex h-full min-h-0 flex-1">
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
