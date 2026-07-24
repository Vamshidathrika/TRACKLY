import { redirect } from "next/navigation";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { getIssuesByProject } from "@/lib/issues";
import { prisma } from "@/lib/prisma";
import { TimelineView } from "@/components/board/SpaceViews";
import type { BoardIssue } from "@/components/board/IssueCard";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

export default async function TimelinePage({
  params,
}: {
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
  if (!access) redirect("/your-work");

  const rawIssues = await getIssuesByProject(project.id).catch(() => []);
  const issues: BoardIssue[] = rawIssues.map((i) => ({
    id: i.id,
    key: i.key,
    summary: i.summary,
    description: i.description,
    type: i.type,
    status: i.status,
    priority: i.priority,
    storyPoints: i.storyPoints,
    assignee: i.assignee ? { id: i.assignee.id, name: i.assignee.name, avatarUrl: i.assignee.avatarUrl } : null,
    reporter: i.reporter ? { id: i.reporter.id, name: i.reporter.name, avatarUrl: i.reporter.avatarUrl } : null,
    projectKey: project.key,
  }));

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-default">{project.name} Timeline</h1>
        <p className="text-xs text-subtles">Visual schedule and timeline for project tasks</p>
      </div>
      <TimelineView issues={issues} />
    </div>
  );
}
