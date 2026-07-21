import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectByKey } from "@/lib/projects";
import { getIssuesByProject } from "@/lib/issues";
import { Sidebar } from "@/components/nav/Sidebar";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { IssueTable } from "@/components/issues/IssueTable";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function ProjectDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await prisma.membership.findFirst({ where: { userId } });
  if (!membership) redirect("/your-work");

  const project = await getProjectByKey(membership.siteId, key);
  if (!project) redirect("/projects");

  const issues = await getIssuesByProject(project.id);

  return (
    <div className="flex flex-1">
      <Sidebar projectName={project.name} projectKey={project.key} />
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
    </div>
  );
}
