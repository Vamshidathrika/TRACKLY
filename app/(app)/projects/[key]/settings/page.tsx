import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getCustomFields } from "@/lib/admin";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { ProjectSettingsView } from "@/components/projects/ProjectSettingsView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const user = await getAuthUser();

  const project = await prisma.project.findFirst({
    where: { key: upperKey },
    include: { lead: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  });

  if (!project) redirect("/projects");

  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, siteId: project.siteId },
  });

  if (!membership) {
    await prisma.membership.create({
      data: { userId: user.id, siteId: project.siteId, role: "MEMBER" },
    });
    const { delCache } = await import("@/lib/redis");
    await delCache(`user:chrome:${user.id}`);
  }

  const customFields = await getCustomFields(project.id);

  return (
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
  );
}
