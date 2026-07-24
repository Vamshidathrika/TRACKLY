import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { getCustomFields } from "@/lib/admin";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { ProjectSettingsView } from "@/components/projects/ProjectSettingsView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { userId, siteId } = await requireMembership();
  const { key } = await params;
  const upperKey = key.toUpperCase();

  const userMemberships = await prisma.membership.findMany({ where: { userId }, select: { siteId: true } });
  const siteIds = Array.from(new Set(userMemberships.map((m) => m.siteId).concat(siteId)));

  const project = await prisma.project.findFirst({
    where: {
      siteId: { in: siteIds },
      OR: [
        { key: upperKey },
        { name: { equals: key, mode: "insensitive" } },
        { id: key },
      ],
    },
    include: { lead: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  if (!project) redirect("/projects");

  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  const customFields = await getCustomFields(project.id).catch(() => []);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name, href: `/projects/${project.key}` }, { label: "Settings" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{project.name} Settings</h1>
          <p className="text-xs text-text-subtle">Manage project details, keys, and custom fields • {project.key}</p>
        </div>
        <CreateIssueModal defaultProjectId={project.id} trigger={<Button appearance="primary">Create task</Button>} />
      </div>

      <ProjectSettingsView
        project={{ id: project.id, name: project.name, key: project.key, lead: project.lead }}
        customFields={customFields}
      />
    </main>
  );
}
