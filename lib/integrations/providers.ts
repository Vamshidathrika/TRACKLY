import { prisma } from "../prisma";
import { extractIssueKeys, resolveIssueByKey } from "../git/processor";
import { createIssue } from "../issues";
import type { NormalizedDevEvent, ParsedFigmaUrl, ParsedLoomUrl, ParsedMiroUrl } from "./types";

/**
 * Resolves an issue reporter scoped to the target site instead of picking an
 * arbitrary user from the whole database. An ADMIN membership is used as the
 * stand-in "site owner" for auto-created issues (Sentry/Zendesk/Datadog have
 * no concept of a Trackly user to attribute the report to).
 */
async function resolveSiteReporterId(siteId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { siteId, role: "ADMIN" },
    select: { userId: true },
  });
  return membership?.userId ?? null;
}

/**
 * 1. Figma URL Parser & Embed Generator
 */
export function parseFigmaUrl(url: string): ParsedFigmaUrl | null {
  if (!url || typeof url !== "string") return null;
  try {
    const trimmed = url.trim();
    if (!trimmed.includes("figma.com/")) return null;

    const parsed = new URL(trimmed);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length < 2) return null;

    const fileKey = pathSegments[1];
    let nodeId = parsed.searchParams.get("node-id");
    if (nodeId) nodeId = nodeId.replace("-", ":");

    const embedUrl = `https://www.figma.com/embed?embed_host=trackly&url=${encodeURIComponent(trimmed)}`;

    return {
      fileKey,
      nodeId,
      embedUrl,
      originalUrl: trimmed,
    };
  } catch {
    return null;
  }
}

/**
 * 2. Loom Video URL Parser & Embed Generator
 */
export function parseLoomUrl(url: string): ParsedLoomUrl | null {
  if (!url || typeof url !== "string") return null;
  try {
    const trimmed = url.trim();
    if (!trimmed.includes("loom.com/")) return null;

    const parsed = new URL(trimmed);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    if (pathSegments.length < 2) return null;

    // Handles https://loom.com/share/VIDEO_ID or https://loom.com/embed/VIDEO_ID
    const videoId = pathSegments[pathSegments.length - 1];
    const embedUrl = `https://www.loom.com/embed/${videoId}?hide_owner=true&hide_share=true`;

    return {
      videoId,
      embedUrl,
      originalUrl: trimmed,
    };
  } catch {
    return null;
  }
}

/**
 * 3. Miro Whiteboard URL Parser & Embed Generator
 */
export function parseMiroUrl(url: string): ParsedMiroUrl | null {
  if (!url || typeof url !== "string") return null;
  try {
    const trimmed = url.trim();
    if (!trimmed.includes("miro.com/")) return null;

    const parsed = new URL(trimmed);
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const boardIdx = pathSegments.findIndex((s) => s === "board");
    if (boardIdx === -1 || boardIdx + 1 >= pathSegments.length) return null;

    const boardId = pathSegments[boardIdx + 1];
    const embedUrl = `https://miro.com/app/live-embed/${boardId}/?embedAutoplay=true`;

    return {
      boardId,
      embedUrl,
      originalUrl: trimmed,
    };
  } catch {
    return null;
  }
}

/**
 * 4. GitLab Webhook Processor
 */
export async function processGitLabWebhook(
  headers: Headers,
  payload: any,
  siteId: string
): Promise<{ success: boolean; eventType: string; issueKeys: string[] }> {
  const eventHeader = headers.get("x-gitlab-event") || "Push Hook";
  const issueKeys: string[] = [];

  if (eventHeader === "Push Hook" && Array.isArray(payload.commits)) {
    for (const c of payload.commits) {
      const keys = extractIssueKeys(c.message || "");
      issueKeys.push(...keys);

      if (keys.length > 0) {
        const issue = await resolveIssueByKey(siteId, keys[0]);
        if (issue && issue.status === "TO_DO") {
          await prisma.issue.update({
            where: { id: issue.id },
            data: { status: "IN_PROGRESS" },
          });
        }
      }
    }
    return { success: true, eventType: "gitlab:push", issueKeys };
  }

  if (eventHeader === "Merge Request Hook" && payload.object_attributes) {
    const mr = payload.object_attributes;
    const title = mr.title || "";
    const action = mr.action; // open, merge, close
    const keys = extractIssueKeys(`${title} ${mr.source_branch || ""}`);
    issueKeys.push(...keys);

    if (keys.length > 0) {
      const issue = await resolveIssueByKey(siteId, keys[0]);
      if (issue) {
        let newStatus = issue.status;
        if (action === "open" || action === "reopen") newStatus = "IN_REVIEW";
        if (action === "merge") newStatus = "DONE";

        if (newStatus !== issue.status) {
          await prisma.issue.update({
            where: { id: issue.id },
            data: { status: newStatus },
          });
        }
      }
    }
    return { success: true, eventType: "gitlab:merge_request", issueKeys };
  }

  return { success: true, eventType: `gitlab:${eventHeader}`, issueKeys };
}

/**
 * 5. Bitbucket Webhook Processor
 */
export async function processBitbucketWebhook(
  headers: Headers,
  payload: any,
  siteId: string
): Promise<{ success: boolean; eventType: string; issueKeys: string[] }> {
  const eventHeader = headers.get("x-event-key") || "repo:push";
  const issueKeys: string[] = [];

  if (eventHeader === "repo:push" && payload.push?.changes) {
    for (const change of payload.push.changes) {
      if (Array.isArray(change.commits)) {
        for (const c of change.commits) {
          const keys = extractIssueKeys(c.message || "");
          issueKeys.push(...keys);

          if (keys.length > 0) {
            const issue = await resolveIssueByKey(siteId, keys[0]);
            if (issue && issue.status === "TO_DO") {
              await prisma.issue.update({
                where: { id: issue.id },
                data: { status: "IN_PROGRESS" },
              });
            }
          }
        }
      }
    }
    return { success: true, eventType: "bitbucket:push", issueKeys };
  }

  if (eventHeader.startsWith("pullrequest:") && payload.pullrequest) {
    const pr = payload.pullrequest;
    const keys = extractIssueKeys(`${pr.title || ""} ${pr.source?.branch?.name || ""}`);
    issueKeys.push(...keys);

    if (keys.length > 0) {
      const issue = await resolveIssueByKey(siteId, keys[0]);
      if (issue) {
        let newStatus = issue.status;
        if (eventHeader === "pullrequest:created") newStatus = "IN_REVIEW";
        if (eventHeader === "pullrequest:fulfilled") newStatus = "DONE";

        if (newStatus !== issue.status) {
          await prisma.issue.update({
            where: { id: issue.id },
            data: { status: newStatus },
          });
        }
      }
    }
    return { success: true, eventType: eventHeader, issueKeys };
  }

  return { success: true, eventType: eventHeader, issueKeys };
}

/**
 * 6. Sentry Error Webhook Processor
 */
export async function processSentryWebhook(
  headers: Headers,
  payload: any,
  siteId: string,
  projectId?: string
): Promise<{ success: boolean; issueKey?: string; createdIssueId?: string }> {
  const issueData = payload.data?.issue || payload.issue || payload;
  const title = issueData.title || payload.message || "Sentry Error Captured";
  const culprit = issueData.culprit || issueData.metadata?.value || "Unknown Location";
  const permalink = issueData.permalink || "https://sentry.io";
  const env = issueData.environment || "production";

  let targetProjectId = projectId;
  if (!targetProjectId) {
    const firstProject = await prisma.project.findFirst({ where: { siteId } });
    if (!firstProject) return { success: false };
    targetProjectId = firstProject.id;
  }

  const leadUser = await prisma.user.findFirst();
  if (!leadUser) return { success: false };

  const stacktraceMarkdown = `### 🚨 Automated Sentry Error Report\n**Environment:** \`${env}\`\n**Culprit:** \`${culprit}\`\n**Timestamp:** ${new Date().toISOString()}\n\n\`\`\`\n${title}\n  at ${culprit}\n\`\`\`\n\n[🔗 View Error in Sentry](${permalink})`;

  const issue = await createIssue({
    projectId: targetProjectId,
    summary: `[Sentry Alert] ${title.slice(0, 100)}`,
    description: stacktraceMarkdown,
    type: "BUG",
    priority: "HIGH",
    reporterId: leadUser.id,
  });

  return {
    success: true,
    issueKey: issue.key,
    createdIssueId: issue.id,
  };
}

/**
 * 7. Zendesk Customer Ticket Converter
 */
export async function processZendeskWebhook(
  headers: Headers,
  payload: any,
  siteId: string,
  projectId?: string
): Promise<{ success: boolean; issueKey?: string }> {
  const ticket = payload.ticket || payload;
  const subject = ticket.subject || "Zendesk Customer Ticket";
  const description = ticket.description || "No customer feedback details provided.";
  const priority = (ticket.priority || "NORMAL").toUpperCase();
  const ticketNumber = ticket.id || Date.now();

  let targetProjectId = projectId;
  if (!targetProjectId) {
    const firstProject = await prisma.project.findFirst({ where: { siteId } });
    if (!firstProject) return { success: false };
    targetProjectId = firstProject.id;
  }

  const leadUser = await prisma.user.findFirst();
  if (!leadUser) return { success: false };

  const formattedDescription = `### 🎧 Linked Zendesk Customer Ticket #${ticketNumber}\n**Requester Email:** \`${ticket.requester?.email || "customer@acme.com"}\`\n**Zendesk Priority:** \`${priority}\`\n\n> ${description}\n\n[🔗 Open in Zendesk Agent Portal](https://support.zendesk.com/agent/tickets/${ticketNumber})`;

  const issue = await createIssue({
    projectId: targetProjectId,
    summary: `[Zendesk #${ticketNumber}] ${subject.slice(0, 100)}`,
    description: formattedDescription,
    type: "BUG",
    priority: priority === "URGENT" ? "HIGHEST" : priority === "HIGH" ? "HIGH" : "MEDIUM",
    reporterId: leadUser.id,
  });

  return { success: true, issueKey: issue.key };
}

/**
 * 8. Datadog APM Alert Processor
 */
export async function processDatadogWebhook(
  headers: Headers,
  payload: any,
  siteId: string,
  projectId?: string
): Promise<{ success: boolean; issueKey?: string }> {
  const alertTitle = payload.event_title || payload.title || "Datadog APM Incident";
  const alertMsg = payload.event_msg || payload.body || "High latency/error rate spike detected.";
  const alertStatus = (payload.alert_status || "ALERT").toUpperCase();

  let targetProjectId = projectId;
  if (!targetProjectId) {
    const firstProject = await prisma.project.findFirst({ where: { siteId } });
    if (!firstProject) return { success: false };
    targetProjectId = firstProject.id;
  }

  const leadUser = await prisma.user.findFirst();
  if (!leadUser) return { success: false };

  const issue = await createIssue({
    projectId: targetProjectId,
    summary: `[Datadog Incident] ${alertTitle.slice(0, 100)}`,
    description: `### 📊 Datadog APM Alert (${alertStatus})\n\n> ${alertMsg}\n\n[🔗 Open Datadog APM Dashboard](https://app.datadoghq.com)`,
    type: "BUG",
    priority: alertStatus === "ALERT" ? "HIGHEST" : "HIGH",
    reporterId: leadUser.id,
  });

  return { success: true, issueKey: issue.key };
}

/**
 * 9. Vercel Deployment Webhook Processor
 */
export async function processVercelWebhook(
  headers: Headers,
  payload: any,
  siteId: string
): Promise<{ success: boolean; deploymentUrl?: string; issueKeys: string[] }> {
  const deployment = payload.payload?.deployment || payload.deployment || payload;
  const url = deployment.url ? `https://${deployment.url}` : undefined;
  const meta = deployment.meta || {};
  const commitMsg = meta.githubCommitMessage || meta.gitlabCommitMessage || meta.bitbucketCommitMessage || "";
  const branch = meta.githubCommitRef || meta.gitlabCommitRef || meta.bitbucketCommitRef || "";

  const issueKeys = extractIssueKeys(`${commitMsg} ${branch}`);

  if (issueKeys.length > 0) {
    for (const key of issueKeys) {
      const issue = await resolveIssueByKey(siteId, key);
      if (issue && url) {
        if (!issue.description?.includes(url)) {
          await prisma.issue.update({
            where: { id: issue.id },
            data: {
              description: `${issue.description || ""}\n\n▲ **Vercel Preview Deployment:** [${url}](${url})`,
            },
          });
        }
      }
    }
  }

  return { success: true, deploymentUrl: url, issueKeys };
}
