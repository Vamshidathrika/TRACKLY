import { CodeView } from "@/components/board/SpaceViews";
import { resolveProjectByKey } from "@/lib/projects";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { notFound } from "next/navigation";

export default async function ProjectCodePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { userId, siteId } = await requireMembership();
  const { key } = await params;

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) notFound();

  await checkProjectAccess(userId, project.id, project.siteId);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <CodeView projectId={project.id} projectKey={project.key} />
    </main>
  );
}
