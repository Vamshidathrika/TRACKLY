import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { Tag } from "@/components/ui/Tag";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { InviteForm } from "./InviteForm";

export default async function MembersPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const membership = await prisma.membership.findFirst({ where: { userId }, include: { site: true } });
  if (!membership) redirect("/your-work");
  const members = await prisma.membership.findMany({
    where: { siteId: membership.siteId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <main className="flex-1 px-10 py-6">
      <Breadcrumbs items={[{ label: "Settings" }, { label: "Members" }]} />
      <h1 className="mt-2 mb-6 text-2xl font-medium">{membership.site.name} — Members</h1>
      {membership.role === "ADMIN" && <InviteForm />}
      <table className="mt-6 w-full max-w-2xl text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold text-text-subtle">
            <th className="py-2">Name</th><th>Email</th><th>Role</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-border">
              <td className="flex items-center gap-2 py-2">
                <Avatar name={m.user.name} src={m.user.avatarUrl} size={24} /> {m.user.name}
              </td>
              <td className="text-text-subtle">{m.user.email}</td>
              <td><Tag color={m.role === "ADMIN" ? "blue" : "gray"}>{m.role}</Tag></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
