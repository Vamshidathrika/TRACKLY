import { getAuthUser } from "@/lib/auth";
import { requireMembership } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { TeamHub, type MemberItem } from "@/components/teams/TeamHub";

export default async function TeamsPage() {
  const user = await getAuthUser();
  const { siteId, role } = await requireMembership();

  const [siteMemberships, projects] = await Promise.all([
    prisma.membership.findMany({
      where: { siteId },
      include: {
        user: {
          include: {
            assignedIssues: {
              where: { project: { siteId } },
              select: { id: true, status: true, storyPoints: true },
            },
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { siteId },
      include: {
        lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const members: MemberItem[] = siteMemberships.map((m) => {
    const assigned = m.user.assignedIssues || [];
    const completedCount = assigned.filter((i) => i.status === "DONE").length;
    const activeIssues = assigned.filter((i) => i.status !== "DONE");
    const storyPoints = activeIssues.reduce((acc, i) => acc + (i.storyPoints || 1), 0);

    return {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      avatarUrl: m.user.avatarUrl,
      assignedCount: activeIssues.length,
      completedCount,
      storyPoints,
    };
  });

  const workspaceUsers = siteMemberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
  }));

  const boards = projects.map((p) => ({
    id: p.id,
    name: p.name,
    key: p.key,
    type: p.type,
    leadId: p.leadId,
    lead: p.lead,
    members: p.members,
  }));

  return (
    <TeamHub
      initialMembers={members}
      boards={boards}
      workspaceUsers={workspaceUsers}
      currentUserId={user.id}
      isWorkspaceAdmin={role === "ADMIN"}
    />
  );
}

