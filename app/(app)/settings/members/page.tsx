import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { InviteForm } from "./InviteForm";
import { MembersList } from "@/components/settings/MembersList";

export default async function MembersPage() {
  const user = await getAuthUser();
  const membership = await prisma.membership.findFirst({ where: { userId: user.id }, include: { site: true } });
  const site = membership?.site ?? (await prisma.site.findFirst());
  if (!site) redirect("/your-work");

  const members = await prisma.membership.findMany({
    where: { siteId: site.id },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Members" }]} />
      <h1 className="mt-2 mb-6 text-2xl font-medium">{site.name} — Workspace Members</h1>
      <InviteForm />
      <MembersList members={members} />
    </main>
  );
}
