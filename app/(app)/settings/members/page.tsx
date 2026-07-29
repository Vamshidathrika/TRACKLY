import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { getPendingInvites } from "@/lib/invites";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { InviteForm } from "./InviteForm";
import { MembersList } from "@/components/settings/MembersList";
import { PendingInvitesList } from "@/components/settings/PendingInvitesList";
import { DomainSettingsCard } from "@/components/settings/DomainSettingsCard";

export default async function MembersPage() {
  const { siteId, siteName } = await requireMembership();

  const [members, pendingInvites, projects, site] = await Promise.all([
    prisma.membership.findMany({
      where: { siteId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    getPendingInvites(siteId),
    prisma.project.findMany({
      where: { siteId },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
    }),
    prisma.site.findUnique({
      where: { id: siteId },
      select: { allowedDomain: true, restrictedDomain: true },
    }),
  ]);

  return (
    <main className="flex-1 px-10 py-6 overflow-y-auto">
      <Breadcrumbs items={[{ label: "Settings", href: "/settings/members" }, { label: "Members" }]} />
      <div className="mt-2 mb-4">
        <h1 className="text-2xl font-bold text-default tracking-tight">{siteName} Workspace Settings</h1>
        <p className="text-xs text-subtle mt-0.5">Manage workspace members, role assignments, integrations, and automation rules.</p>
      </div>

      <SettingsNav />
      <DomainSettingsCard
        siteId={siteId}
        initialRestrictedDomain={site?.restrictedDomain ?? false}
        initialAllowedDomain={site?.allowedDomain ?? null}
      />
      <InviteForm projects={projects} />
      <PendingInvitesList invites={pendingInvites} />
      <MembersList members={members} />
    </main>
  );
}



