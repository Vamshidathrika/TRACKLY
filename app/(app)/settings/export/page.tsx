import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { WorkspaceExportView } from "@/components/settings/WorkspaceExportView";

export default async function ExportSettingsPage() {
  const { siteName } = await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Data Export & Backup" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Workspace Backup & Import Center</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Export full JSON workspace data snapshots or import Jira Cloud backup files.
        </p>
      </div>

      <SettingsNav />
      <WorkspaceExportView siteName={siteName} />
    </div>
  );
}
