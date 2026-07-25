import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { FieldConfigurationsView } from "@/components/settings/FieldConfigurationsView";

export default async function FieldConfigurationsSettingsPage() {
  await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Field Configurations" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Global Field Configurations & Schemes</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Configure custom field definitions, validation constraints, and screen form visibility.
        </p>
      </div>

      <SettingsNav />
      <FieldConfigurationsView />
    </div>
  );
}
