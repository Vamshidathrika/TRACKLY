import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getIssueByKey } from "@/lib/issues";
import { IssueDetail } from "@/components/issues/IssueDetail";

export default async function IssuePage({ params }: { params: Promise<{ key: string; issueKey: string }> }) {
  const { key, issueKey } = await params;
  const user = await getAuthUser();

  const issue = await getIssueByKey("", issueKey);
  if (!issue) redirect(`/projects/${key}`);

  const siteId = issue.project?.siteId;

  // Auto-join user to workspace if visiting shared ticket link
  if (siteId) {
    const siteExists = await prisma.site.findUnique({ where: { id: siteId }, select: { id: true } });
    if (siteExists) {
      const membership = await prisma.membership.findFirst({
        where: { userId: user.id, siteId },
      });
      if (!membership) {
        await prisma.membership.create({
          data: { userId: user.id, siteId, role: "MEMBER" },
        });
        const { delCache } = await import("@/lib/redis");
        await delCache(`user:chrome:${user.id}`);
      }
    }
  }

  const membership = siteId
    ? await prisma.membership.findFirst({ where: { userId: user.id, siteId } })
    : null;
  const isAdmin = membership?.role === "ADMIN";

  const [members, sprints, automationRules] = await Promise.all([
    prisma.user.findMany({
      where: siteId ? { memberships: { some: { siteId } } } : undefined,
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: "asc" },
    }),
    prisma.sprint.findMany({
      where: { projectId: issue.projectId },
      select: { id: true, name: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.automationRule.findMany({
      where: { projectId: issue.projectId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <IssueDetail
        issue={issue}
        currentUserId={user.id}
        isAdmin={isAdmin}
        members={members.map((m) => ({ ...m, name: m.name ?? "Teammate" }))}
        sprints={sprints}
        automationRules={automationRules}
      />
    </main>
  );
}
