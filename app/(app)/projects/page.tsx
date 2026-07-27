import { requireMembership } from "@/lib/tenant";
import { getProjectsForUser } from "@/lib/projects";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";
import { ProjectsListView } from "@/components/projects/ProjectsListView";

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
        <ProjectsListView projects={projects as any} isAdmin={role === "ADMIN"} />
      )}
    </main>
  );
}

