import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { WorkflowSchemesView } from "@/components/settings/WorkflowSchemesView";

export default async function WorkflowsSettingsPage() {
  await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Workflow Schemes" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Workflow Schemes & Transition Rules</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Configure status lifecycle pipelines, transition post-functions, and automated validators.
        </p>
      </div>

      <SettingsNav />
      <WorkflowSchemesView />
    </div>
  );
}
