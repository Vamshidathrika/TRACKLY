import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMembership, checkProjectAccess } from "@/lib/tenant";
import { getIssueByKey } from "@/lib/issues";
import { getUsersForSite } from "@/lib/users";
import { IssueDetail } from "@/components/issues/IssueDetail";

export default async function IssuePage({ params }: { params: Promise<{ key: string; issueKey: string }> }) {
  const { key, issueKey } = await params;
  const { userId, siteId, role } = await requireMembership();

  const issue = await getIssueByKey(siteId, issueKey);
  if (!issue) redirect(`/projects/${key}`);

  const access = await checkProjectAccess(userId, issue.projectId, siteId);
  if (!access) redirect("/your-work");

  const isAdmin = role === "ADMIN" || access.projectRole === "WORKSPACE_ADMIN";

  const [members, sprints, automationRules] = await Promise.all([
    getUsersForSite(siteId),
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
        currentUserId={userId}
        isAdmin={isAdmin}
        members={members.map((m) => ({ ...m, name: m.name ?? "Teammate" }))}
        sprints={sprints}
        automationRules={automationRules}
      />
    </main>
  );
}
