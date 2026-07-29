import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { listMyApiKeysAction } from "./actions";
import { ApiKeysManager } from "./ApiKeysManager";

export default async function ApiKeysSettingsPage() {
  await requireMembership();
  const { keys, isWorkspaceAdmin, currentUserId } = await listMyApiKeysAction();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "API Keys" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">API Keys</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Personal access tokens for <code>/api/v1</code>. A key acts as you — it can never do more than your
          own role and project memberships already allow.
        </p>
      </div>

      <SettingsNav />
      <ApiKeysManager initialKeys={keys} isWorkspaceAdmin={isWorkspaceAdmin} currentUserId={currentUserId} />
    </div>
  );
}
