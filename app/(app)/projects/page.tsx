import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";

export default async function ProjectsPage() {
  const user = await getAuthUser();

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { siteId: true },
  });

  const siteIds = memberships.map((m) => m.siteId);

  const projects = siteIds.length > 0
    ? await prisma.project.findMany({
        where: { siteId: { in: siteIds } },
        include: {
          lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { issues: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

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
            Click &ldquo;Create project&rdquo; above to get started with your first board or sprint project.
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
              <tr key={p.id} className="border-b border-border-default hover:bg-neutral">
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
                  <Avatar name={p.lead.name ?? p.lead.email} src={p.lead.avatarUrl} size={24} />
                  <span>{p.lead.name ?? p.lead.email}</span>
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
