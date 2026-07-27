import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { getSprintsByProject } from "@/lib/sprints";
import { getIssuesByProject } from "@/lib/issues";
import { getUsersForSite } from "@/lib/users";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { BacklogView } from "@/components/backlog/BacklogView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

import { BoardNotFound } from "@/components/projects/BoardNotFound";

import { resolveProjectByKey } from "@/lib/projects";

export default async function BacklogPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const upperKey = key.toUpperCase();
  const { userId, siteId, role } = await requireMembership();

  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={upperKey} isAdmin={role === "ADMIN"} />;
  }

  // 2. Check project-level access
  const access = await checkProjectAccess(userId, project.id, project.siteId);
  if (!access) redirect("/your-work");

  const [sprints, allIssues, siteUsers] = await Promise.all([
    getSprintsByProject(project.id),
    getIssuesByProject(project.id),
    getUsersForSite(project.siteId),
  ]);

  const backlogIssues = allIssues.filter((i) => !i.sprintId);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: project.name, href: `/projects/${project.key}` }, { label: "Backlog" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">{project.name} backlog</h1>
          <p className="text-xs text-text-subtle">Sprint Planning • {project.key}</p>
        </div>
        <CreateIssueModal defaultProjectId={project.id} trigger={<Button appearance="primary">Create issue</Button>} />
      </div>

      <BacklogView
        projectId={project.id}
        projectKey={project.key}
        sprints={sprints.map((s) => ({
          ...s,
          issues: s.issues.map((i) => ({ ...i, projectKey: project.key })),
        }))}
        backlogIssues={backlogIssues.map((i) => ({ ...i, projectKey: project.key }))}
        availableUsers={siteUsers}
      />
    </main>
  );
}
