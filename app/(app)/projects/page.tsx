import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { Button } from "@/components/ui/Button";

export default function ProjectsPage() {
  return (
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Projects" }]} />
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-medium">Projects</h1>
        <Button appearance="primary" disabled title="Coming in Phase 2">Create project</Button>
      </div>
      <p className="mt-16 text-center text-sm text-text-subtle">No projects yet. Project creation arrives in Phase 2.</p>
    </main>
  );
}
