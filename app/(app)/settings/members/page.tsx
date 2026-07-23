import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
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
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Members" }]} />
      <h1 className="mt-2 mb-6 text-2xl font-medium">{siteName} — Workspace Members</h1>
      <InviteForm />
      <MembersList members={members} />
    </main>
  );
}
