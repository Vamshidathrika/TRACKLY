"use server";

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { createIssueAction } from "@/app/(app)/issues/actions";

export interface IdeaItem {
  id: string;
  title: string;
  description: string;
  impact: "HIGH" | "LOW";
  effort: "HIGH" | "LOW";
  votes: number;
  category: "Feature" | "UX Improvement" | "Performance" | "Integration";
  convertedToTask?: boolean;
  taskKey?: string;
  createdAt: string;
}

export async function fetchIdeasAction(projectKey: string): Promise<IdeaItem[]> {
  try {
    const { userId } = await requireMembership();
    if (!userId) return [];

    const project = await prisma.project.findFirst({
      where: { key: projectKey },
      select: { id: true },
    });

    if (!project) return [];

    const ideas = await prisma.idea.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    });

    return ideas.map((idea) => {
      const impact: "HIGH" | "LOW" = idea.impactScore >= 5 ? "HIGH" : "LOW";
      const effort: "HIGH" | "LOW" = idea.effortScore >= 5 ? "HIGH" : "LOW";

      let category: "Feature" | "UX Improvement" | "Performance" | "Integration" = "Feature";
      if (idea.title.toLowerCase().includes("ux") || idea.title.toLowerCase().includes("theme") || idea.title.toLowerCase().includes("cursor")) {
        category = "UX Improvement";
      } else if (idea.title.toLowerCase().includes("figma") || idea.title.toLowerCase().includes("integration")) {
        category = "Integration";
      } else if (idea.title.toLowerCase().includes("speed") || idea.title.toLowerCase().includes("performance")) {
        category = "Performance";
      }

      return {
        id: idea.id,
        title: idea.title,
        description: idea.description || "",
        impact,
        effort,
        votes: idea.upvotes,
        category,
        convertedToTask: idea.status === "CONVERTED_TO_TASK",
        createdAt: idea.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error("fetchIdeasAction error:", error);
    return [];
  }
}

export async function createIdeaAction(
  projectKey: string,
  data: {
    title: string;
    description: string;
    impact: "HIGH" | "LOW";
    effort: "HIGH" | "LOW";
    category?: "Feature" | "UX Improvement" | "Performance" | "Integration";
  }
): Promise<{ success: boolean; idea?: IdeaItem; error?: string }> {
  try {
    const { userId } = await requireMembership();
    if (!userId) return { success: false, error: "Unauthorized" };

    const project = await prisma.project.findFirst({
      where: { key: projectKey },
      select: { id: true },
    });

    if (!project) return { success: false, error: "Project not found" };

    const impactScore = data.impact === "HIGH" ? 8.0 : 3.0;
    const effortScore = data.effort === "HIGH" ? 8.0 : 3.0;

    const newIdea = await prisma.idea.create({
      data: {
        projectId: project.id,
        title: data.title,
        description: data.description,
        impactScore,
        effortScore,
        upvotes: 1,
        status: "UNDER_CONSIDERATION",
      },
    });

    return {
      success: true,
      idea: {
        id: newIdea.id,
        title: newIdea.title,
        description: newIdea.description || "",
        impact: data.impact,
        effort: data.effort,
        votes: newIdea.upvotes,
        category: data.category || "Feature",
        convertedToTask: false,
        createdAt: newIdea.createdAt.toISOString(),
      },
    };
  } catch (error: any) {
    console.error("createIdeaAction error:", error);
    return { success: false, error: error.message || "Failed to create idea" };
  }
}

export async function voteIdeaAction(
  ideaId: string
): Promise<{ success: boolean; votes?: number; error?: string }> {
  try {
    const { userId } = await requireMembership();
    if (!userId) return { success: false, error: "Unauthorized" };

    const updated = await prisma.idea.update({
      where: { id: ideaId },
      data: {
        upvotes: { increment: 1 },
      },
    });

    return { success: true, votes: updated.upvotes };
  } catch (error: any) {
    console.error("voteIdeaAction error:", error);
    return { success: false, error: error.message || "Failed to vote" };
  }
}

export async function convertIdeaToTaskAction(
  ideaId: string,
  projectKey: string
): Promise<{ success: boolean; taskKey?: string; error?: string }> {
  try {
    const { userId } = await requireMembership();
    if (!userId) return { success: false, error: "Unauthorized" };

    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
    });

    if (!idea) return { success: false, error: "Idea not found" };

    const projects = await prisma.project.findMany({
      select: { id: true, key: true },
    });

    const targetProject = projects.find((p) => p.key === projectKey) || projects[0];
    if (!targetProject) return { success: false, error: "No target project found" };

    const formData = new FormData();
    formData.set("projectId", targetProject.id);
    formData.set("summary", `[Idea] ${idea.title}`);
    formData.set(
      "description",
      `${idea.description || ""}\n\n*Converted from Product Discovery Idea #${idea.id} with ${idea.upvotes} votes.*`
    );
    formData.set("type", "STORY");
    formData.set("priority", idea.impactScore >= 5 ? "HIGH" : "MEDIUM");

    const created = await createIssueAction({}, formData);

    if (created && created.success) {
      await prisma.idea.update({
        where: { id: ideaId },
        data: { status: "CONVERTED_TO_TASK" },
      });

      return { success: true, taskKey: targetProject.key };
    }

    return { success: false, error: created?.error || "Failed to create issue from idea" };
  } catch (error: any) {
    console.error("convertIdeaToTaskAction error:", error);
    return { success: false, error: error.message || "Conversion failed" };
  }
}
