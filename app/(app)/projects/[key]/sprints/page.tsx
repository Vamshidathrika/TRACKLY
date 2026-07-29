import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getSprintsByProject } from "@/lib/sprints";
import { checkProjectAccess } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { SprintsHubView } from "@/components/sprints/SprintsHubView";

interface SprintsPageProps {
  params: Promise<{ key: string }>;
}

export default async function SprintsPage({ params }: SprintsPageProps) {
  const user = await getAuthUser();
  const { key } = await params;

  const project = await prisma.project.findFirst({
    where: { key: key.toUpperCase() },
    select: { id: true, key: true, name: true },
  });

  if (!project) notFound();

  const access = await checkProjectAccess(user.id, project.id);
  if (!access) notFound();

  const rawSprints = await getSprintsByProject(project.id);

  const initialSprints = rawSprints.map((s) => ({
    id: s.id,
    name: s.name,
    goal: s.goal,
    status: s.status as "FUTURE" | "PLANNED" | "ACTIVE" | "CLOSED",
    startDate: s.startDate,
    endDate: s.endDate,
    createdAt: s.createdAt,
    issues: s.issues.map((i) => ({
      id: i.id,
      key: i.key,
      summary: i.summary,
      status: i.status,
      storyPoints: i.storyPoints,
    })),
  }));

  return (
    <SprintsHubView
      projectId={project.id}
      projectKey={project.key}
      projectName={project.name}
      initialSprints={initialSprints}
    />
  );
}
