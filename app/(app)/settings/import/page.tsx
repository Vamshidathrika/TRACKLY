import { requireAdmin } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { JiraImportView } from "./JiraImportView";

export default async function ImportSettingsPage() {
  // Importing writes projects, issues, and users into the workspace, so this
  // page is admin-only. requireAdmin redirects everyone else.
  const { siteName } = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Import from Jira" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Import from Jira</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Migrate Jira projects, issues, sprints, comments, history, and work logs into {siteName}.
        </p>
      </div>

      <SettingsNav />
      <JiraImportView />
    </div>
  );
}
