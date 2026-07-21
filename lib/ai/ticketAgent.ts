import { prisma } from "../prisma";
import { getPlatformKnowledgeBase } from "./knowledgeBase";
import { createIssue, updateIssue, addComment } from "../issues";
import { createSprint, moveIssueToSprint } from "../sprints";
import type { IssueType, IssueStatus, IssuePriority } from "@prisma/client";

export type AgentActionResult = {
  success: boolean;
  message: string;
  actionTaken?: string;
  data?: any;
};

export async function executeAgentCommand(
  userId: string,
  siteId: string,
  command: string
): Promise<AgentActionResult> {
  const kb = await getPlatformKnowledgeBase(siteId);
  const cmd = command.toLowerCase().trim();

  // 1. INTENT: Create Issue
  if (cmd.includes("create issue") || cmd.includes("new issue") || cmd.includes("add issue") || cmd.includes("create bug") || cmd.includes("new story")) {
    const isBug = cmd.includes("bug");
    const isTask = cmd.includes("task");
    const type: IssueType = isBug ? "BUG" : isTask ? "TASK" : "STORY";

    // Extract summary: look for text after keywords or in quotes
    let summary = "AI Generated Issue";
    const quoteMatch = command.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      summary = quoteMatch[1];
    } else {
      const parts = command.split(/(?:create issue|new issue|add issue|create bug|new story)\s+/i);
      if (parts.length > 1) {
        summary = parts[1].split(/(?:for|with|assign|priority)/i)[0].trim();
      }
    }

    // Resolve project (default to first project or match project key/name)
    let project = kb.projects[0];
    for (const p of kb.projects) {
      if (cmd.includes(p.key.toLowerCase()) || cmd.includes(p.name.toLowerCase())) {
        project = p;
        break;
      }
    }
    if (!project) return { success: false, message: "No active project found to create issue in." };

    // Resolve priority
    let priority: IssuePriority = "MEDIUM";
    if (cmd.includes("highest")) priority = "HIGHEST";
    else if (cmd.includes("high")) priority = "HIGH";
    else if (cmd.includes("low")) priority = "LOW";
    else if (cmd.includes("lowest")) priority = "LOWEST";

    // Resolve assignee
    let assigneeId: string | undefined = undefined;
    for (const m of kb.members) {
      if (cmd.includes(m.name.toLowerCase())) {
        assigneeId = m.id;
        break;
      }
    }

    const issue = await createIssue({
      projectId: project.id,
      summary,
      type,
      priority,
      reporterId: userId,
      assigneeId,
    });

    return {
      success: true,
      message: `Successfully created issue ${issue.key}: "${issue.summary}"`,
      actionTaken: "CREATE_ISSUE",
      data: issue,
    };
  }

  // 2. INTENT: Update status
  if ((cmd.includes("status") || cmd.includes("move") || cmd.includes("transition") || cmd.includes("change")) && !cmd.includes("sprint")) {
    // Resolve issue key (e.g. DEMO-1)
    const keyMatch = command.match(/([a-zA-Z]+-\d+)/);
    if (!keyMatch) return { success: false, message: "Could not find issue key (e.g., DEMO-3) in command." };
    const issueKey = keyMatch[1].toUpperCase();

    const dbIssue = await prisma.issue.findFirst({
      where: { key: issueKey, project: { siteId } },
    });
    if (!dbIssue) return { success: false, message: `Issue ${issueKey} not found.` };

    // Resolve status
    let status: IssueStatus = "IN_PROGRESS";
    if (cmd.includes("todo") || cmd.includes("to do")) status = "TO_DO";
    else if (cmd.includes("review") || cmd.includes("in review")) status = "IN_REVIEW";
    else if (cmd.includes("done") || cmd.includes("completed") || cmd.includes("close")) status = "DONE";

    try {
      await updateIssue(dbIssue.id, userId, { status });
      return {
        success: true,
        message: `Successfully changed status of ${issueKey} to ${status.replace("_", " ")}`,
        actionTaken: "UPDATE_STATUS",
      };
    } catch (e) {
      if (e instanceof Error && e.message === "PERMISSION_DENIED_ASSIGNEE_ONLY") {
        return {
          success: false,
          message: `Permission denied: Status updates on ${issueKey} are restricted to its Assignee or Admin.`,
        };
      }
      throw e;
    }
  }

  // 3. INTENT: Assign issue
  if (cmd.includes("assign") || cmd.includes("set assignee")) {
    const keyMatch = command.match(/([a-zA-Z]+-\d+)/);
    if (!keyMatch) return { success: false, message: "Could not find issue key in command." };
    const issueKey = keyMatch[1].toUpperCase();

    const dbIssue = await prisma.issue.findFirst({
      where: { key: issueKey, project: { siteId } },
    });
    if (!dbIssue) return { success: false, message: `Issue ${issueKey} not found.` };

    let assigneeId: string | null = null;
    let assigneeName = "Unassigned";
    for (const m of kb.members) {
      if (cmd.includes(m.name.toLowerCase())) {
        assigneeId = m.id;
        assigneeName = m.name;
        break;
      }
    }

    await updateIssue(dbIssue.id, userId, { assigneeId });
    return {
      success: true,
      message: `Successfully assigned issue ${issueKey} to ${assigneeName}`,
      actionTaken: "ASSIGN_ISSUE",
    };
  }

  // 4. INTENT: Add Comment
  if (cmd.includes("comment") || cmd.includes("post comment")) {
    const keyMatch = command.match(/([a-zA-Z]+-\d+)/);
    if (!keyMatch) return { success: false, message: "Could not find issue key in command." };
    const issueKey = keyMatch[1].toUpperCase();

    const dbIssue = await prisma.issue.findFirst({
      where: { key: issueKey, project: { siteId } },
    });
    if (!dbIssue) return { success: false, message: `Issue ${issueKey} not found.` };

    let body = "Comment added by AI Agent";
    const quoteMatch = command.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      body = quoteMatch[1];
    } else {
      const parts = command.split(/(?:comment|post comment)\s+/i);
      if (parts.length > 1) {
        body = parts[1].replace(keyMatch[1], "").trim();
      }
    }

    await addComment({ issueId: dbIssue.id, authorId: userId, body });
    return {
      success: true,
      message: `Successfully added comment to ${issueKey}: "${body}"`,
      actionTaken: "ADD_COMMENT",
    };
  }

  // 5. INTENT: Create Sprint / Manage Sprint
  if (cmd.includes("sprint")) {
    let project = kb.projects[0];
    for (const p of kb.projects) {
      if (cmd.includes(p.key.toLowerCase())) {
        project = p;
        break;
      }
    }

    if (cmd.includes("create") || cmd.includes("new")) {
      const numMatch = command.match(/sprint\s+(\d+)/i);
      const sprintName = numMatch ? `Sprint ${numMatch[1]}` : `Sprint ${kb.sprints.length + 1}`;
      const sprint = await createSprint({ projectId: project.id, name: sprintName });
      return {
        success: true,
        message: `Successfully created ${sprintName} for project ${project.name}`,
        actionTaken: "CREATE_SPRINT",
        data: sprint,
      };
    }

    if (cmd.includes("move") || cmd.includes("add to")) {
      const keyMatch = command.match(/([a-zA-Z]+-\d+)/);
      if (!keyMatch) return { success: false, message: "Could not find issue key in command." };
      const issueKey = keyMatch[1].toUpperCase();

      const dbIssue = await prisma.issue.findFirst({
        where: { key: issueKey, project: { siteId } },
      });
      if (!dbIssue) return { success: false, message: `Issue ${issueKey} not found.` };

      // Match target sprint name
      let targetSprintId: string | null = null;
      let targetSprintName = "Backlog";
      for (const s of kb.sprints) {
        if (cmd.includes(s.name.toLowerCase())) {
          targetSprintId = s.id;
          targetSprintName = s.name;
          break;
        }
      }

      await moveIssueToSprint(dbIssue.id, targetSprintId);
      return {
        success: true,
        message: `Successfully moved issue ${issueKey} to ${targetSprintName}`,
        actionTaken: "MOVE_TO_SPRINT",
      };
    }
  }

  return {
    success: false,
    message: "I recognized your intent but could not map it to an action. Try: 'create issue \"My Summary\"', 'move DEMO-1 to IN_PROGRESS', 'assign DEMO-1 to Demo User', or 'comment on DEMO-1 \"Work in progress\"'.",
  };
}
