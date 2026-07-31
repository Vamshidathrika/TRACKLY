import { getAuthUser } from "@/lib/auth";
import { requireMembership } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { TeamHub, type MemberItem } from "@/components/teams/TeamHub";
import type { TeamData } from "@/components/teams/BoardWiseMembers";

export default async function TeamsPage() {
  const user = await getAuthUser();
  const { siteId, role } = await requireMembership();

  const [siteMemberships, projects, teamsFromDb] = await Promise.all([
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
        projectTeams: {
          include: {
            team: {
              include: {
                lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
                members: {
                  include: {
                    user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.findMany({
      where: { siteId },
      include: {
        lead: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        projectTeams: { select: { projectId: true } },
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

  const teams: TeamData[] = teamsFromDb.map((t) => ({
    id: t.id,
    siteId: t.siteId,
    name: t.name,
    description: t.description,
    leadId: t.leadId,
    lead: t.lead,
    members: t.members.map((tm) => ({
      id: tm.id,
      teamId: tm.teamId,
      userId: tm.userId,
      role: tm.role,
      user: tm.user,
    })),
    projectIds: t.projectTeams.map((pt) => pt.projectId),
  }));

  const boards = projects.map((p) => ({
    id: p.id,
    name: p.name,
    key: p.key,
    type: p.type,
    leadId: p.leadId,
    lead: p.lead,
    members: p.members,
    teams: p.projectTeams.map((pt) => ({
      id: pt.team.id,
      siteId: pt.team.siteId,
      name: pt.team.name,
      description: pt.team.description,
      leadId: pt.team.leadId,
      lead: pt.team.lead,
      members: pt.team.members.map((tm) => ({
        id: tm.id,
        teamId: tm.teamId,
        userId: tm.userId,
        role: tm.role,
        user: tm.user,
      })),
    })),
  }));

  return (
    <TeamHub
      initialMembers={members}
      boards={boards}
      workspaceTeams={teams}
      workspaceUsers={workspaceUsers}
      currentUserId={user.id}
      isWorkspaceAdmin={role === "ADMIN"}
    />
  );
}


