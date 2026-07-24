import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";

export function BoardNotFound({ projectKey }: { projectKey?: string }) {
  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: projectKey ? `Board ${projectKey}` : "Board Not Found" }]} />

      <div className="mt-12 flex flex-col items-center text-center max-w-lg mx-auto rounded-2xl border border-dashed border-border p-10 bg-surface shadow-xs animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M8 7v7" />
            <path d="M12 7v4" />
            <path d="M16 7v9" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-text">
          {projectKey ? `Board "${projectKey}" Not Found` : "Board Not Found"}
        </h1>

        <p className="mt-3 mb-8 text-sm text-text-subtle leading-relaxed">
          The board you requested does not exist in your workspace or has been removed. Create a new board to start managing issues and tickets for your team.
        </p>

        <CreateProjectModal
          trigger={
            <button className="h-11 px-6 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hovered transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              Create Board to Continue
            </button>
          }
        />
      </div>
    </main>
  );
}
