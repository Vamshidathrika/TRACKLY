import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getIssueByKey } from "@/lib/issues";
import { Sidebar } from "@/components/nav/Sidebar";
import { IssueDetail } from "@/components/issues/IssueDetail";

export default async function IssuePage({ params }: { params: Promise<{ key: string; issueKey: string }> }) {
  const { key, issueKey } = await params;
  const user = await getAuthUser();

  const membership = await prisma.membership.findFirst({ where: { userId: user.id } });
  const siteId = membership?.siteId ?? (await prisma.site.findFirst())?.id ?? "";

  const issue = await getIssueByKey(siteId, issueKey);
  if (!issue) redirect(`/projects/${key}`);

  return (
    <div className="flex flex-1">
      <Sidebar projectName={issue.project.name} projectKey={issue.project.key} />
      <main className="flex-1 px-8 py-6 overflow-y-auto">
        <IssueDetail issue={issue} />
      </main>
    </div>
  );
}
