"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { grantProjectAccess } from "@/lib/tenant";
import { createInvite } from "@/lib/invites";
import { revalidatePath } from "next/cache";

export type ProvisionInput = {
  projectName: string;
  projectKey: string;
  template: "KANBAN" | "SCRUM";
  stages: string[];
  inviteEmails?: string[];
  restrictedDomain?: boolean;
  allowedDomain?: string;
};

export async function provisionWorkspaceAction(input: ProvisionInput) {
  const user = await getAuthUser();
  const userId = user.id;

  // Clean key
  const key = input.projectKey.trim().toUpperCase() || "PROJ";
  const name = input.projectName.trim() || "My New Project";

  // Find user's primary site or create one
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { site: true },
    orderBy: { createdAt: "asc" },
  });

  let siteId = membership?.siteId;

  if (!siteId) {
    const slug = `site-${Date.now().toString(36)}`;
    const newSite = await prisma.site.create({
      data: {
        name: `${user.name || "User"}'s Workspace`,
        slug,
        allowedDomain: input.allowedDomain || null,
        restrictedDomain: input.restrictedDomain ?? false,
        memberships: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });
    siteId = newSite.id;
  } else if (input.allowedDomain || input.restrictedDomain !== undefined) {
    await prisma.site.update({
      where: { id: siteId },
      data: {
        allowedDomain: input.allowedDomain || undefined,
        restrictedDomain: input.restrictedDomain ?? undefined,
      },
    });
  }

  // Ensure unique project key for site
  const existingProject = await prisma.project.findFirst({
    where: { siteId, key },
  });

  let finalKey = key;
  if (existingProject) {
    finalKey = `${key}${Math.floor(Math.random() * 90 + 10)}`;
  }

  // Create Project
  const project = await prisma.project.create({
    data: {
      siteId,
      name,
      key: finalKey,
      type: input.template === "SCRUM" ? "SCRUM" : "KANBAN",
      leadId: userId,
    },
  });

  // Seed sample onboarding checklist tasks for "no blank state"
  const seedIssues = [
    {
      summary: "👋 Welcome to Trackly! Complete workspace setup",
      description: "Review project settings and invite your teammates to join.",
      type: "TASK" as const,
      status: "DONE" as const,
      priority: "HIGH" as const,
    },
    {
      summary: "🚀 Set up project sprint roadmap & key milestones",
      description: "Create epics for upcoming Q3/Q4 deliverables.",
      type: "EPIC" as const,
      status: "IN_PROGRESS" as const,
      priority: "HIGHEST" as const,
    },
    {
      summary: "🎨 Review live board workflow columns",
      description: "Customize stages under Project Settings if needed.",
      type: "STORY" as const,
      status: "IN_PROGRESS" as const,
      priority: "MEDIUM" as const,
    },
    {
      summary: "🔒 Configure automated deployment & integration hooks",
      description: "Connect GitHub repository or CI/CD pipelines.",
      type: "TASK" as const,
      status: "TO_DO" as const,
      priority: "MEDIUM" as const,
    },
    {
      summary: "📊 Check out the Summary Dashboard for analytics telemetry",
      description: "Metric cards, workload distribution, and status donut charts update in real time.",
      type: "STORY" as const,
      status: "TO_DO" as const,
      priority: "LOW" as const,
    },
  ];

  let counter = 1;
  for (const issueData of seedIssues) {
    const issueKey = `${project.key}-${counter}`;
    await prisma.issue.create({
      data: {
        projectId: project.id,
        number: counter,
        key: issueKey,
        summary: issueData.summary,
        description: issueData.description,
        type: issueData.type,
        status: issueData.status,
        priority: issueData.priority,
        reporterId: userId,
        assigneeId: userId,
        rank: counter * 100,
      },
    });
    counter++;
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { issueCounter: counter - 1 },
  });

  // The creator needs an explicit ProjectMember row: board visibility is driven
  // by ProjectMember, and this path builds the project by hand rather than going
  // through createProject(), which is what normally grants it.
  await grantProjectAccess(project.id, userId, "ADMIN");

  // Handle invites if provided
  if (input.inviteEmails && input.inviteEmails.length > 0) {
    for (const email of input.inviteEmails) {
      if (email && email.includes("@")) {
        // Was `Date.now()` + `Math.random()`. Math.random is not a CSPRNG, so
        // an attacker who harvests a few tokens from the same process can
        // recover the generator state and predict tokens minted for other
        // workspaces. createInvite uses randomBytes(32).
        await createInvite({ siteId, email: email.trim(), role: "MEMBER" });
      }
    }
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${project.key}`);

  return { success: true, projectKey: project.key };
}
