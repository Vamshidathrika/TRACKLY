import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    issue: { update: vi.fn() },
    project: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
  },
}));

vi.mock("../issues", () => ({
  createIssue: vi.fn().mockResolvedValue({ id: "i100", key: "TRK-100" }),
}));

vi.mock("../git/processor", () => ({
  extractIssueKeys: vi.fn().mockImplementation((text: string) => {
    if (text.includes("TRK-123")) return ["TRK-123"];
    return [];
  }),
  resolveIssueByKey: vi.fn().mockImplementation((siteId: string, key: string) => {
    if (key === "TRK-123") return Promise.resolve({ id: "i123", status: "TO_DO" });
    return Promise.resolve(null);
  }),
}));

import {
  parseFigmaUrl,
  parseLoomUrl,
  parseMiroUrl,
  processGitLabWebhook,
  processBitbucketWebhook,
  processSentryWebhook,
  processZendeskWebhook,
  processDatadogWebhook,
  processVercelWebhook,
} from "./providers";

describe("Integrations Providers Suite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("parses valid Figma file and frame URLs into embed URL", () => {
    const res = parseFigmaUrl("https://www.figma.com/file/a1b2c3d4/Project-Spec?node-id=10-20");
    expect(res).not.toBeNull();
    expect(res?.fileKey).toBe("a1b2c3d4");
    expect(res?.nodeId).toBe("10:20");
    expect(res?.embedUrl).toContain("https%3A%2F%2Fwww.figma.com");
  });

  it("parses valid Loom video share URLs into embed URL", () => {
    const res = parseLoomUrl("https://www.loom.com/share/c1d2e3f4a5b678901234567890abcdef");
    expect(res).not.toBeNull();
    expect(res?.videoId).toBe("c1d2e3f4a5b678901234567890abcdef");
    expect(res?.embedUrl).toBe("https://www.loom.com/embed/c1d2e3f4a5b678901234567890abcdef?hide_owner=true&hide_share=true");
  });

  it("parses valid Miro board URLs into embed URL", () => {
    const res = parseMiroUrl("https://miro.com/app/board/uX9z_8kL2m0=");
    expect(res).not.toBeNull();
    expect(res?.boardId).toBe("uX9z_8kL2m0=");
    expect(res?.embedUrl).toBe("https://miro.com/app/live-embed/uX9z_8kL2m0=/?embedAutoplay=true");
  });

  it("returns null for invalid media URLs", () => {
    expect(parseFigmaUrl("https://google.com")).toBeNull();
    expect(parseLoomUrl("https://google.com")).toBeNull();
    expect(parseMiroUrl("https://google.com")).toBeNull();
  });

  it("processes GitLab Push webhook and extracts issue keys", async () => {
    const headers = new Headers({ "x-gitlab-event": "Push Hook" });
    const payload = {
      commits: [{ message: "fix(TRK-123): resolve bug" }],
    };

    const res = await processGitLabWebhook(headers, payload);
    expect(res.success).toBe(true);
    expect(res.eventType).toBe("gitlab:push");
    expect(res.issueKeys).toContain("TRK-123");
  });

  it("processes Bitbucket PR created webhook", async () => {
    const headers = new Headers({ "x-event-key": "pullrequest:created" });
    const payload = {
      pullrequest: { title: "feat(TRK-123): new feature", source: { branch: { name: "feature/TRK-123" } } },
    };

    const res = await processBitbucketWebhook(headers, payload);
    expect(res.success).toBe(true);
    expect(res.eventType).toBe("pullrequest:created");
    expect(res.issueKeys).toContain("TRK-123");
  });

  it("processes Sentry error alert and auto-creates BUG task", async () => {
    const { prisma } = await import("../prisma");
    (prisma.project.findFirst as any).mockResolvedValue({ id: "p1" });
    (prisma.user.findFirst as any).mockResolvedValue({ id: "u1" });

    const headers = new Headers();
    const payload = {
      data: {
        issue: {
          title: "TypeError: cannot read property of null",
          culprit: "app/page.tsx",
          permalink: "https://sentry.io/issues/123",
          environment: "production",
        },
      },
    };

    const res = await processSentryWebhook(headers, payload, "site-1", "p1");
    expect(res.success).toBe(true);
    expect(res.issueKey).toBe("TRK-100");
  });

  it("processes Zendesk customer ticket webhook and auto-creates BUG task", async () => {
    const { prisma } = await import("../prisma");
    (prisma.project.findFirst as any).mockResolvedValue({ id: "p1" });
    (prisma.user.findFirst as any).mockResolvedValue({ id: "u1" });

    const headers = new Headers();
    const payload = {
      ticket: {
        id: 1042,
        subject: "Payment 500 Error",
        description: "Customer cannot complete payment on enterprise tier.",
        priority: "URGENT",
        requester: { email: "customer@acme.com" },
      },
    };

    const res = await processZendeskWebhook(headers, payload, "site-1", "p1");
    expect(res.success).toBe(true);
    expect(res.issueKey).toBe("TRK-100");
  });

  it("processes Datadog APM alert webhook and auto-creates incident task", async () => {
    const { prisma } = await import("../prisma");
    (prisma.project.findFirst as any).mockResolvedValue({ id: "p1" });
    (prisma.user.findFirst as any).mockResolvedValue({ id: "u1" });

    const headers = new Headers();
    const payload = {
      event_title: "High Latency Detected",
      event_msg: "API response time exceeded 2500ms on checkout endpoint.",
      alert_status: "ALERT",
    };

    const res = await processDatadogWebhook(headers, payload, "site-1", "p1");
    expect(res.success).toBe(true);
    expect(res.issueKey).toBe("TRK-100");
  });

  it("processes Vercel deployment webhook", async () => {
    const headers = new Headers();
    const payload = {
      deployment: {
        url: "trackly-preview.vercel.app",
        meta: { githubCommitMessage: "fix(TRK-123): preview build" },
      },
    };

    const res = await processVercelWebhook(headers, payload);
    expect(res.success).toBe(true);
    expect(res.deploymentUrl).toBe("https://trackly-preview.vercel.app");
    expect(res.issueKeys).toContain("TRK-123");
  });
});
