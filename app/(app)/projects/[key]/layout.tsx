import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectByKey } from "@/lib/projects";
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

  // Retrieve siteId for active user membership
  const membership = await prisma.membership.findFirst({ where: { userId } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  // Get project information
  const project = await getProjectByKey(siteId, key);
  if (!project) redirect("/projects");

  // Check if project is starred
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
