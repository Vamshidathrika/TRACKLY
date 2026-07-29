import { requireMembership } from "@/lib/tenant";
import { resolveProjectByKey } from "@/lib/projects";
import { getUsersForProject } from "@/lib/users";
import { BoardNotFound } from "@/components/projects/BoardNotFound";
import {
  getRetroCards,
  getRetroSprintOptions,
  getSprintHealthSummary,
  type SprintOption,
} from "@/lib/retro";
import { SprintRetroBoard } from "@/components/sprints/SprintRetroBoard";

interface RetroPageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ sprint?: string }>;
}

export default async function RetroPage({ params, searchParams }: RetroPageProps) {
  const { key } = await params;
  const { sprint: sprintIdParam } = await searchParams;
  const { userId, siteId } = await requireMembership();

  const project = await resolveProjectByKey(userId, siteId, key);
  if (!project) {
    return <BoardNotFound projectKey={key.toUpperCase()} isAdmin={false} />;
  }

  // Fetch real data concurrently
  const [sprintOptions, members] = await Promise.all([
    getRetroSprintOptions(project.id),
    getUsersForProject(project.id),
  ]);

  // Determine which sprint to show (default to most recent CLOSED or ACTIVE)
  const selectedSprintId =
    sprintIdParam && sprintOptions.some((s: SprintOption) => s.id === sprintIdParam)
      ? sprintIdParam
      : (sprintOptions[0]?.id ?? null);

  // Load cards and health summary only if a sprint is selected
  const [initialCards, sprintHealth] = selectedSprintId
    ? await Promise.all([
        getRetroCards(selectedSprintId, userId),
        getSprintHealthSummary(selectedSprintId),
      ])
    : [[], null];

  return (
    <SprintRetroBoard
      projectKey={project.key}
      projectId={project.id}
      currentUserId={userId}
      sprintOptions={sprintOptions}
      selectedSprintId={selectedSprintId}
      initialCards={initialCards}
      sprintHealth={sprintHealth}
      members={members}
    />
  );
}
