import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getIssuesByProject } from "@/lib/issues";
import { prisma } from "@/lib/prisma";
import { TimelineView } from "@/components/board/SpaceViews";
import type { BoardIssue } from "@/components/board/IssueCard";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const user = await getAuthUser();

  const project = await prisma.project.findFirst({
    where: {
      key: key.toUpperCase(),
      site: {
        memberships: {
          some: { userId: user.id },
        },
      },
    },
    select: { id: true, key: true, name: true },
  });

  if (!project) notFound();

  const rawIssues = await getIssuesByProject(project.id);
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
        <p className="text-xs text-subtles">Visual schedule and timeline for project issues</p>
      </div>
      <TimelineView issues={issues} />
    </div>
  );
}
