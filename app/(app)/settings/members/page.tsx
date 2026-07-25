import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { InviteForm } from "./InviteForm";
import { MembersList } from "@/components/settings/MembersList";

export default async function MembersPage() {
  const { siteId, siteName } = await requireMembership();

  const members = await prisma.membership.findMany({
    where: { siteId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="flex-1 px-10 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Members" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-bold text-default tracking-tight">{siteName} Workspace Settings</h1>
        <p className="text-xs text-subtle mt-0.5">Manage workspace members, role assignments, integrations, and automation rules.</p>
      </div>

      <SettingsNav />
      <InviteForm />
      <MembersList members={members} />
    </main>
  );
}

