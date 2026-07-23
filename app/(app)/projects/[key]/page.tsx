import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getIssuesByProject } from "@/lib/issues";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { IssueTable } from "@/components/issues/IssueTable";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function ProjectDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const user = await getAuthUser();

  const project = await prisma.project.findFirst({
    where: { key: upperKey },
    select: { id: true, key: true, name: true, type: true, siteId: true },
  });

  if (!project) redirect("/projects");

  const issues = await getIssuesByProject(project.id);

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

      <div className="rounded-ds border border-border bg-surface p-4 shadow-xs">
        <h2 className="mb-4 text-base font-semibold text-text">Issues ({issues.length})</h2>
        <IssueTable issues={issues.map((i) => ({ ...i, projectKey: project.key }))} projectKey={project.key} />
      </div>
    </main>
  );
}
