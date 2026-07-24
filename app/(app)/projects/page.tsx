import Link from "next/link";
import { requireMembership } from "@/lib/tenant";
import { getProjectsForUser } from "@/lib/projects";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";

export default async function ProjectsPage() {
  const { userId, siteId, role } = await requireMembership();
  const projects = await getProjectsForUser(siteId, userId);

  return (
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Projects" }]} />
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        {role === "ADMIN" && <CreateProjectModal />}
      </div>

      {projects.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center max-w-lg mx-auto rounded-xl border border-dashed border-border p-10 bg-surface shadow-xs">
          <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M8 7v7" />
              <path d="M12 7v4" />
              <path d="M16 7v9" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text">
            {role === "ADMIN" ? "No board found in your workspace" : "No assigned boards yet"}
          </h2>
          <p className="mt-2 mb-6 text-sm text-text-subtle leading-relaxed">
            {role === "ADMIN"
              ? "To start tracking tasks, managing sprints, and organizing your team work, create your first board to continue."
              : "Ask your workspace admin for a board link to view issues and collaborate with your team."}
          </p>
          {role === "ADMIN" && (
            <CreateProjectModal
              trigger={
                <button className="h-11 px-6 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-hovered transition-all shadow-sm flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  Create Board to Continue
                </button>
              }
            />
          )}
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
                  <Avatar name={p.lead?.name ?? p.lead?.email ?? "Lead"} src={p.lead?.avatarUrl} size={24} />
                  <span>{p.lead?.name ?? p.lead?.email ?? "Unassigned"}</span>
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
