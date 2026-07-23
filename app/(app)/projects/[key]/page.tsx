import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getIssuesByProject } from "@/lib/issues";
import { getAllUsers } from "@/lib/users";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { IssueListContainer } from "@/components/issues/IssueListContainer";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function ProjectDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  await getAuthUser();

  const project = await prisma.project.findFirst({
    where: { key: upperKey },
    select: { id: true, key: true, name: true, type: true, siteId: true },
  });

  if (!project) redirect("/projects");

  const [issues, allUsers] = await Promise.all([
    getIssuesByProject(project.id),
    getAllUsers(),
  ]);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{project.name}</h1>
          <p className="text-xs text-text-subtle">Key: {project.key} • Type: {project.type}</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
      </div>

      <IssueListContainer
        title="Issues"
        issues={issues.map((i) => ({ ...i, projectKey: project.key }))}
        projectKey={project.key}
        availableUsers={allUsers}
      />
    </main>
  );
}
