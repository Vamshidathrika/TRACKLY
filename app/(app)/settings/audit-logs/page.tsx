import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { SecurityAuditLogsView } from "@/components/settings/SecurityAuditLogsView";

export default async function AuditLogsSettingsPage() {
  await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Security Audit Stream" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Security Audit Log Stream</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Review immutable activity logs of user logins, permission updates, API tokens, and workspace exports.
        </p>
      </div>

      <SettingsNav />
      <SecurityAuditLogsView />
    </div>
  );
}
