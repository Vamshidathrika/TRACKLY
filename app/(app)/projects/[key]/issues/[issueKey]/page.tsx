import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getIssueByKey } from "@/lib/issues";
import { Sidebar } from "@/components/nav/Sidebar";
import { IssueDetail } from "@/components/issues/IssueDetail";

export default async function IssuePage({ params }: { params: Promise<{ key: string; issueKey: string }> }) {
  const { key, issueKey } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const membership = await prisma.membership.findFirst({ where: { userId } });
  if (!membership) redirect("/your-work");

  const issue = await getIssueByKey(membership.siteId, issueKey);
  if (!issue) notFound();

  return (
    <div className="flex flex-1">
      <Sidebar projectName={issue.project.name} projectKey={issue.project.key} />
      <main className="flex-1 px-8 py-6 overflow-y-auto">
        <IssueDetail issue={issue} />
      </main>
    </div>
  );
}
