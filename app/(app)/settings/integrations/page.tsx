import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { IntegrationsSettings } from "@/components/settings/IntegrationsSettings";
import { getIntegrationConnections } from "@/lib/integrations/actions";

export default async function IntegrationsSettingsPage() {
  const { siteId } = await requireMembership();
  const initialConnections = await getIntegrationConnections(siteId);

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Integrations" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Integrations & Connected Apps</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Connect GitHub, webhooks, and developer tools to auto-link code activity to tasks.
        </p>
      </div>

      <SettingsNav />
      <IntegrationsSettings siteId={siteId} initialConnections={initialConnections} />
    </div>
  );
}


