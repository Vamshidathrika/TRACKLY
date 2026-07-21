import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/projects";
import { getCustomFields } from "@/lib/admin";
import { Sidebar } from "@/components/nav/Sidebar";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { ProjectSettingsView } from "@/components/projects/ProjectSettingsView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await getAuthUser();

  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  const project = await getProjectByKey(siteId, key);
  if (!project) redirect("/projects");

  const customFields = await getCustomFields(project.id);

  return (
    <div className="flex flex-1">
      <Sidebar projectName={project.name} projectKey={project.key} />
      <main className="flex-1 px-8 py-6 overflow-y-auto">
        <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name, href: `/projects/${project.key}` }, { label: "Settings" }]} />
        <div className="mt-2 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text">{project.name} Settings</h1>
            <p className="text-xs text-text-subtle">Manage project details, keys, and custom fields • {project.key}</p>
          </div>
          <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
        </div>

        <ProjectSettingsView
          project={{ id: project.id, name: project.name, key: project.key, lead: project.lead }}
          customFields={customFields}
        />
      </main>
    </div>
  );
}
