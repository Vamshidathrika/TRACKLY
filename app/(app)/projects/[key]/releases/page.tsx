import { requireMembership } from "@/lib/tenant";
import { resolveProjectByKey } from "@/lib/projects";
import { BoardNotFound } from "@/components/projects/BoardNotFound";
import { ReleaseHub } from "@/components/projects/ReleaseHub";

export default async function ReleasesPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { userId, siteId } = await requireMembership();

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={key.toUpperCase()} isAdmin={false} />;
  }

  return <ReleaseHub projectId={project.id} projectKey={project.key} />;
}
