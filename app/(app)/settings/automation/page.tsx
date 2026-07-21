import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getAutomationRules } from "@/lib/automation";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { AutomationView } from "@/components/automation/AutomationView";
import { CreateIssueModal } from "@/components/issues/CreateIssueModal";
import { Button } from "@/components/ui/Button";

export default async function AutomationSettingsPage() {
  const user = await getAuthUser();
  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  const project = await prisma.project.findFirst({ where: { siteId } });

  const rules = project ? await getAutomationRules(project.id) : [];

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Automation Rules" }]} />
      <div className="mt-2 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Workflow & Automation Settings</h1>
          <p className="text-xs text-text-subtle">Configure automated rules and transition triggers</p>
        </div>
        <CreateIssueModal trigger={<Button appearance="primary">Create issue</Button>} />
      </div>

      <AutomationView projectId={project?.id ?? ""} rules={rules} />
    </div>
  );
}
