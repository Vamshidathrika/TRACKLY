import { requireAdmin } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { listMyWebhooksAction } from "./actions";
import { WebhooksManager } from "./WebhooksManager";

export default async function WebhooksSettingsPage() {
  // requireAdmin redirects non-admins to /your-work — webhook management is
  // workspace-ADMIN-only (see actions.ts's header comment for why a secret
  // that can forge a validly-signed event for the whole site is not exposed
  // to every member the way a personal API key is).
  await requireAdmin();
  const endpoints = await listMyWebhooksAction();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Webhooks" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Webhooks</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Send a signed HTTP POST to your own endpoint whenever an issue is created, updated, or commented on.
          Every delivery is signed with HMAC-SHA256 so you can verify it really came from Trackly.
        </p>
      </div>

      <SettingsNav />
      <WebhooksManager initialEndpoints={endpoints} />
    </div>
  );
}
