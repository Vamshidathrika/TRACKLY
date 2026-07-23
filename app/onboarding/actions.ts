"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ProvisionInput = {
  projectName: string;
  projectKey: string;
  template: "KANBAN" | "SCRUM";
  stages: string[];
  inviteEmails?: string[];
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
  });

  let siteId = membership?.siteId;

  if (!siteId) {
    const slug = `site-${Date.now().toString(36)}`;
    const newSite = await prisma.site.create({
      data: {
        name: `${user.name || "User"}'s Workspace`,
        slug,
        memberships: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });
    siteId = newSite.id;
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

  // Handle invites if provided
  if (input.inviteEmails && input.inviteEmails.length > 0) {
    for (const email of input.inviteEmails) {
      if (email && email.includes("@")) {
        const token = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.invite.create({
          data: {
            siteId,
            email: email.trim(),
            token,
            role: "MEMBER",
            expiresAt,
          },
        });
      }
    }
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${project.key}`);

  return { success: true, projectKey: project.key };
}
