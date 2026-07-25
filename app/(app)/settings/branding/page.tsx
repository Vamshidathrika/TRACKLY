import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { WorkspaceBrandingView } from "@/components/settings/WorkspaceBrandingView";

export default async function BrandingSettingsPage() {
  const { siteName } = await requireMembership();

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto max-w-5xl mx-auto w-full">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Branding & Themes" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-extrabold text-text tracking-tight">Workspace Branding & Custom Themes</h1>
        <p className="text-xs text-text-subtle mt-0.5">
          Configure custom organization subdomains, theme accent palettes, and workspace logos.
        </p>
      </div>

      <SettingsNav />
      <WorkspaceBrandingView siteName={siteName} />
    </div>
  );
}
