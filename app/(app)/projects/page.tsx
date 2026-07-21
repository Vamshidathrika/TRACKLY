import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getProjects } from "@/lib/projects";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";

export default async function ProjectsPage() {
  const user = await getAuthUser();

  let membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  if (!membership) {
    const site = await prisma.site.findFirst();
    if (site) {
      membership = await prisma.membership.create({
        data: { userId: user.id, siteId: site.id, role: "ADMIN" },
      });
    }
  }

  const projects = membership ? await getProjects(membership.siteId) : [];

  return (
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Projects" }]} />
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        <CreateProjectModal />
      </div>

      {projects.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium">No projects yet.</p>
          <p className="text-sm text-text-subtle">
            Click "Create project" above to get started with your first board or sprint project.
          </p>
        </div>
      ) : (
        <table className="mt-6 w-full max-w-4xl text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle">
              <th className="py-2">Name</th>
              <th>Key</th>
              <th>Type</th>
              <th>Lead</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-border hover:bg-[#F4F5F7]">
                <td className="py-2 font-medium">
                  <Link href={`/projects/${p.key}`} className="text-brand hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="font-mono text-xs text-text-subtle">{p.key}</td>
                <td>
                  <Tag color={p.type === "SCRUM" ? "blue" : "gray"}>{p.type}</Tag>
                </td>
                <td className="flex items-center gap-2 py-2">
                  <Avatar name={p.lead.name} src={p.lead.avatarUrl} size={24} />
                  <span>{p.lead.name}</span>
                </td>
                <td className="text-text-subtle">{p._count.issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
