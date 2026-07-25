import { prisma } from "../prisma";
import { extractIssueKeys, resolveIssueByKey } from "../git/processor";
import { createIssue } from "../issues";
import type { NormalizedDevEvent, ParsedFigmaUrl } from "./types";

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
 * 2. GitLab Webhook Processor
 */
export async function processGitLabWebhook(
  headers: Headers,
  payload: any,
  siteId = "demo-site"
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
 * 3. Bitbucket Webhook Processor
 */
export async function processBitbucketWebhook(
  headers: Headers,
  payload: any,
  siteId = "demo-site"
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
 * 4. Sentry Error Webhook Processor (Automated Bug Task Generator)
 */
export async function processSentryWebhook(
  headers: Headers,
  payload: any,
  siteId = "demo-site",
  projectId?: string
): Promise<{ success: boolean; issueKey?: string; createdIssueId?: string }> {
  const issueData = payload.data?.issue || payload.issue || payload;
  const title = issueData.title || payload.message || "Sentry Error Captured";
  const culprit = issueData.culprit || issueData.metadata?.value || "Unknown Location";
  const permalink = issueData.permalink || "https://sentry.io";
  const env = issueData.environment || "production";

  // Find target project if not provided
  let targetProjectId = projectId;
  if (!targetProjectId) {
    const firstProject = await prisma.project.findFirst({ where: { siteId } });
    if (!firstProject) return { success: false };
    targetProjectId = firstProject.id;
  }

  // Find bot or lead reporter ID
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
 * 5. Vercel Deployment Webhook Processor
 */
export async function processVercelWebhook(
  headers: Headers,
  payload: any,
  siteId = "demo-site"
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
        // Log Vercel preview link in issue description if not already present
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
