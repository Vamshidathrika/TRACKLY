import { DevView } from "@/components/board/SpaceViews";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { notFound } from "next/navigation";

export default async function ProjectDevPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { siteId } = await requireMembership();
  const { key } = await params;
  const upperKey = key.toUpperCase();

  const project = await prisma.project.findFirst({
    where: { siteId, key: upperKey },
    select: { id: true, key: true },
  });

  if (!project) notFound();

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <DevView projectId={project.id} projectKey={project.key} />
    </main>
  );
}
