import { requireMembership, getBoardIssues } from "@/lib/dal";
import { resolveProjectByKey } from "@/lib/projects";
import { CalendarView } from "@/components/board/SpaceViews";
import { BoardNotFound } from "@/components/projects/BoardNotFound";

export default async function ProjectCalendarPage({ params }: { params: Promise<{ key: string }> }) {
  const { userId, siteId, role } = await requireMembership();
  const { key } = await params;
  const project = await resolveProjectByKey(userId, siteId, key);

  if (!project) {
    return <BoardNotFound projectKey={key.toUpperCase()} isAdmin={role === "ADMIN"} />;
  }

  const issues = await getBoardIssues(project.id);

  return (
    <main className="flex-1 px-8 py-6 overflow-y-auto">
      <CalendarView issues={issues.map((i) => ({ ...i, projectKey: project.key }))} />
    </main>
  );
}
