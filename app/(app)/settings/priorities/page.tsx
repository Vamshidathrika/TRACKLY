import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { PrioritiesSettings } from "@/components/settings/PrioritiesSettings";

export default async function PrioritiesSettingsPage() {
  await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Priorities & Resolutions" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Priorities & Resolution Schemes</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Configure issue priority levels, urgency SLAs, and closed resolution status codes.
        </p>
      </div>

      <SettingsNav />
      <PrioritiesSettings />
    </div>
  );
}
