import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { PermissionMatrixView } from "@/components/settings/PermissionMatrixView";

export default async function PermissionsSettingsPage() {
  await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Permissions Matrix" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Permission Schemes & Role Matrix</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Define granular access rights for workspace projects, issue actions, and administrative capabilities.
        </p>
      </div>

      <SettingsNav />
      <PermissionMatrixView />
    </div>
  );
}
