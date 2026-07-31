"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireMembership } from "@/lib/tenant";

export async function createTeamAction(data: {
  name: string;
  description?: string;
  leadId?: string;
  memberUserIds?: string[];
  projectId?: string;
}) {
  try {
    const user = await getAuthUser();
    const { siteId } = await requireMembership();

    if (!data.name || !data.name.trim()) {
      return { error: "Team name is required." };
    }

    const teamName = data.name.trim();

    // Check if team with same name exists in site
    const existing = await prisma.team.findUnique({
      where: { siteId_name: { siteId, name: teamName } },
    });

    if (existing) {
      return { error: `A team named "${teamName}" already exists in this workspace.` };
    }

    const team = await prisma.team.create({
      data: {
        siteId,
        name: teamName,
        description: data.description?.trim() || null,
        leadId: data.leadId || user.id,
      },
    });

    // Add members to team
    const memberIds = Array.from(
      new Set([user.id, ...(data.leadId ? [data.leadId] : []), ...(data.memberUserIds || [])])
    );

    if (memberIds.length > 0) {
      await prisma.teamMember.createMany({
        data: memberIds.map((uId) => ({
          teamId: team.id,
          userId: uId,
          role: uId === (data.leadId || user.id) ? "LEAD" : "MEMBER",
        })),
      });
    }

    // If a board was specified, link team to board
    if (data.projectId) {
      await prisma.projectTeam.create({
        data: {
          projectId: data.projectId,
          teamId: team.id,
        },
      });

      // Grant board membership to team members
      for (const uId of memberIds) {
        await prisma.projectMember.upsert({
          where: { projectId_userId: { projectId: data.projectId, userId: uId } },
          create: { projectId: data.projectId, userId: uId, role: "MEMBER" },
          update: {},
        });
      }
    }

    revalidatePath("/teams");
    return { success: true, team };
  } catch (error: any) {
    return { error: error.message || "Failed to create team." };
  }
}

export async function addTeamToBoardAction(projectId: string, teamId: string) {
  try {
    const { siteId } = await requireMembership();

    const team = await prisma.team.findFirst({
      where: { id: teamId, siteId },
      include: { members: true },
    });

    if (!team) {
      return { error: "Team not found in this workspace." };
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, siteId },
    });

    if (!project) {
      return { error: "Board not found in this workspace." };
    }

    // Check if already linked
    const existingLink = await prisma.projectTeam.findUnique({
      where: { projectId_teamId: { projectId, teamId } },
    });

    if (!existingLink) {
      await prisma.projectTeam.create({
        data: { projectId, teamId },
      });
    }

    // Ensure all team members have board membership
    for (const m of team.members) {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: m.userId } },
        create: { projectId, userId: m.userId, role: "MEMBER" },
        update: {},
      });
    }

    revalidatePath("/teams");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to add team to board." };
  }
}

export async function removeTeamFromBoardAction(projectId: string, teamId: string) {
  try {
    const { siteId } = await requireMembership();

    const existingLink = await prisma.projectTeam.findFirst({
      where: { projectId, teamId, project: { siteId } },
    });

    if (!existingLink) {
      return { error: "Team link on this board not found." };
    }

    await prisma.projectTeam.delete({
      where: { id: existingLink.id },
    });

    revalidatePath("/teams");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to remove team from board." };
  }
}

export async function deleteTeamAction(teamId: string) {
  try {
    const { siteId } = await requireMembership();

    const team = await prisma.team.findFirst({
      where: { id: teamId, siteId },
    });

    if (!team) {
      return { error: "Team not found." };
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    revalidatePath("/teams");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to delete team." };
  }
}

export async function updateTeamMembersAction(
  teamId: string,
  data: { leadId?: string; memberUserIds: string[] }
) {
  try {
    const { siteId } = await requireMembership();

    const team = await prisma.team.findFirst({
      where: { id: teamId, siteId },
    });

    if (!team) {
      return { error: "Team not found." };
    }

    // Update leadId if specified
    if (data.leadId !== undefined) {
      await prisma.team.update({
        where: { id: teamId },
        data: { leadId: data.leadId },
      });
    }

    // Delete existing team members and recreate
    await prisma.teamMember.deleteMany({ where: { teamId } });

    const newMembers = Array.from(new Set(data.memberUserIds));
    if (newMembers.length > 0) {
      await prisma.teamMember.createMany({
        data: newMembers.map((uId) => ({
          teamId,
          userId: uId,
          role: uId === data.leadId ? "LEAD" : "MEMBER",
        })),
      });
    }

    revalidatePath("/teams");
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update team members." };
  }
}
