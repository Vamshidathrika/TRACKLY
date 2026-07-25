import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";

export default async function IntegrationsSettingsPage() {
  const { siteId } = await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/automation" }, { label: "Integrations" }]} />
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Integrations & Connected Apps</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Connect GitHub, webhooks, and developer tools to auto-link code activity to tasks.
        </p>
      </div>

      <IntegrationsSettings siteId={siteId} />
    </div>
  );
}
