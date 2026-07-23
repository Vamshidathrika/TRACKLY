import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TeamHub, type MemberItem } from "@/components/teams/TeamHub";

export default async function TeamsPage() {
  const user = await getAuthUser();

  const userMembership = await prisma.membership.findFirst({
    where: { userId: user.id },
    select: { siteId: true },
  });

  if (!userMembership) {
    return (
      <TeamHub
        initialMembers={[
          {
            id: user.id,
            name: user.name ?? user.email,
            email: user.email,
            role: "ADMIN",
            avatarUrl: user.image,
            assignedCount: 0,
            completedCount: 0,
            storyPoints: 0,
          },
        ]}
      />
    );
  }

  const siteMemberships = await prisma.membership.findMany({
    where: { siteId: userMembership.siteId },
    include: {
      user: {
        include: {
          assignedIssues: {
            select: { id: true, status: true, storyPoints: true },
          },
        },
      },
    },
  });

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

  return <TeamHub initialMembers={members} />;
}
