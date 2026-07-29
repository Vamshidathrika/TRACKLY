import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../prisma", () => ({
  prisma: {
    project: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    sprint: { findMany: vi.fn(), create: vi.fn() },
    projectComponent: { findMany: vi.fn(), upsert: vi.fn() },
    customField: { findMany: vi.fn(), createMany: vi.fn() },
    issue: { findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    issueLink: { createMany: vi.fn() },
    comment: { findMany: vi.fn(), createMany: vi.fn() },
    workLog: { findMany: vi.fn(), createMany: vi.fn() },
    issueHistory: { findMany: vi.fn(), createMany: vi.fn() },
    attachment: { findMany: vi.fn(), createMany: vi.fn() },
    user: { findMany: vi.fn(), upsert: vi.fn() },
    membership: { upsert: vi.fn() },
  },
}));

vi.mock("../tenant", () => ({ grantProjectAccess: vi.fn() }));

import { prisma } from "../prisma";
import { grantProjectAccess } from "../tenant";
import { runImport } from "./run";
import { DEFAULT_IMPORT_OPTIONS, type ImportPlan, type NormalizedIssue, type PlannedIssue } from "./types";

const SITE_ID = "site-1";
const IMPORTER_ID = "importer-1";

function normalizedIssue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    sourceRow: 1,
    jiraKey: "ACME-1",
    jiraProjectKey: "ACME",
    jiraNumber: 1,
    summary: "Fix the bug",
    description: null,
    typeName: "Bug",
    isSubtask: false,
    statusName: "To Do",
    statusCategoryKey: "new",
    priorityName: "Medium",
    storyPoints: null,
    originalEstimateSeconds: null,
    reporter: { email: "reporter@example.com", displayName: "Reporter" },
    assignee: null,
    parentKey: null,
    labels: ["jira:ACME-1"],
    components: [],
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: null,
    startDate: null,
    dueDate: null,
    sprints: [],
    comments: [],
    workLogs: [],
    history: [],
    attachments: [],
    links: [],
    customFields: [],
    ...overrides,
  };
}

function plannedIssue(source: NormalizedIssue): PlannedIssue {
  return {
    source,
    type: "BUG",
    status: "TO_DO",
    priority: "MEDIUM",
    labels: source.labels,
    storyPoints: null,
    originalEstimateHours: null,
  };
}

function makePlan(issues: NormalizedIssue[]): ImportPlan {
  return {
    source: "JIRA_JSON",
    sourceRowCount: issues.length,
    projects: [
      {
        jiraProjectKey: "ACME",
        tracklyKey: "ACME",
        name: "ACME",
        issues: issues.map(plannedIssue),
        sprints: [],
        components: [],
        customFieldNames: [],
      },
    ],
    links: [],
    parents: [],
    unmapped: [],
    rowIssues: [],
    warnings: [],
  };
}

function resetChildFindManys() {
  (prisma.comment.findMany as any).mockResolvedValue([]);
  (prisma.workLog.findMany as any).mockResolvedValue([]);
  (prisma.issueHistory.findMany as any).mockResolvedValue([]);
  (prisma.attachment.findMany as any).mockResolvedValue([]);
  (prisma.sprint.findMany as any).mockResolvedValue([]);
  (prisma.projectComponent.findMany as any).mockResolvedValue([]);
  (prisma.customField.findMany as any).mockResolvedValue([]);
  (prisma.user.findMany as any).mockResolvedValue([]);
  (prisma.user.upsert as any).mockResolvedValue({ id: "reporter-1" });
}

describe("runImport — dry run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChildFindManys();
  });

  it("touches no mutating Prisma call for a brand-new project", async () => {
    (prisma.project.findFirst as any).mockResolvedValue(null);
    (prisma.issue.findMany as any).mockResolvedValue([]);

    const plan = makePlan([normalizedIssue()]);
    const report = await runImport({
      siteId: SITE_ID,
      importerUserId: IMPORTER_ID,
      plan,
      options: { ...DEFAULT_IMPORT_OPTIONS, dryRun: true },
    });

    expect(report.dryRun).toBe(true);
    expect(report.summary.projects.created).toBe(1);
    expect(report.summary.issues.created).toBe(1);

    expect(prisma.project.create).not.toHaveBeenCalled();
    expect(prisma.issue.upsert).not.toHaveBeenCalled();
    expect(grantProjectAccess).not.toHaveBeenCalled();
  });

  it("reports an update (not a create) when the issue already exists", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ id: "proj-1", key: "ACME", name: "ACME" });
    (prisma.issue.findMany as any).mockResolvedValue([{ id: "issue-1", number: 1 }]);

    const plan = makePlan([normalizedIssue()]);
    const report = await runImport({
      siteId: SITE_ID,
      importerUserId: IMPORTER_ID,
      plan,
      options: { ...DEFAULT_IMPORT_OPTIONS, dryRun: true },
    });

    expect(report.summary.projects.skipped).toBe(1); // project reused, not created
    expect(report.summary.issues.updated).toBe(1);
    expect(report.summary.issues.created).toBe(0);
  });
});

describe("runImport — real run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChildFindManys();
  });

  it("creates a new project, grants the importer access, and upserts the issue", async () => {
    (prisma.project.findFirst as any).mockResolvedValue(null);
    (prisma.project.create as any).mockResolvedValue({ id: "proj-1", key: "ACME", name: "ACME" });
    (prisma.issue.findMany as any).mockResolvedValue([]);
    (prisma.issue.upsert as any).mockResolvedValue({ id: "issue-1" });
    (prisma.project.findUnique as any).mockResolvedValue({ issueCounter: 0 });

    const plan = makePlan([normalizedIssue()]);
    const report = await runImport({
      siteId: SITE_ID,
      importerUserId: IMPORTER_ID,
      plan,
      options: { ...DEFAULT_IMPORT_OPTIONS, dryRun: false },
    });

    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ siteId: SITE_ID, key: "ACME", leadId: IMPORTER_ID }) })
    );
    expect(grantProjectAccess).toHaveBeenCalledWith("proj-1", IMPORTER_ID, "ADMIN");
    expect(prisma.issue.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_number: { projectId: "proj-1", number: 1 } },
        create: expect.objectContaining({ projectId: "proj-1", number: 1, key: "ACME-1" }),
      })
    );
    expect(report.summary.issues.created).toBe(1);
    expect(prisma.project.update).toHaveBeenCalledWith({ where: { id: "proj-1" }, data: { issueCounter: 1 } });
  });

  it("reuses an existing project matched by key and warns about it", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ id: "proj-1", key: "ACME", name: "ACME" });
    (prisma.issue.findMany as any).mockResolvedValue([]);
    (prisma.issue.upsert as any).mockResolvedValue({ id: "issue-1" });
    (prisma.project.findUnique as any).mockResolvedValue({ issueCounter: 5 });

    const plan = makePlan([normalizedIssue()]);
    const report = await runImport({
      siteId: SITE_ID,
      importerUserId: IMPORTER_ID,
      plan,
      options: { ...DEFAULT_IMPORT_OPTIONS, dryRun: false },
    });

    expect(prisma.project.create).not.toHaveBeenCalled();
    expect(grantProjectAccess).not.toHaveBeenCalled();
    expect(report.warnings.some((w) => w.code === "project-reused")).toBe(true);
  });

  it("does not reassign reporterId on an update — re-running never overwrites corrected authorship", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ id: "proj-1", key: "ACME", name: "ACME" });
    (prisma.issue.findMany as any).mockResolvedValue([{ id: "issue-1", number: 1 }]);
    (prisma.issue.upsert as any).mockResolvedValue({ id: "issue-1" });
    (prisma.project.findUnique as any).mockResolvedValue({ issueCounter: 5 });

    const plan = makePlan([normalizedIssue()]);
    await runImport({
      siteId: SITE_ID,
      importerUserId: IMPORTER_ID,
      plan,
      options: { ...DEFAULT_IMPORT_OPTIONS, dryRun: false },
    });

    const call = (prisma.issue.upsert as any).mock.calls[0][0];
    expect(call.update.reporterId).toBeUndefined();
    expect(call.create.reporterId).toBeDefined();
  });

  it("applies parent links only after both issues exist", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ id: "proj-1", key: "ACME", name: "ACME" });
    (prisma.issue.findMany as any).mockResolvedValue([]);
    (prisma.issue.upsert as any)
      .mockResolvedValueOnce({ id: "issue-parent" })
      .mockResolvedValueOnce({ id: "issue-child" });
    (prisma.project.findUnique as any).mockResolvedValue({ issueCounter: 0 });

    const parent = normalizedIssue({ jiraKey: "ACME-1", jiraNumber: 1 });
    const child = normalizedIssue({ jiraKey: "ACME-2", jiraNumber: 2, parentKey: "ACME-1" });
    const plan = makePlan([parent, child]);
    plan.parents = [{ childKey: "ACME-2", parentKey: "ACME-1" }];

    await runImport({
      siteId: SITE_ID,
      importerUserId: IMPORTER_ID,
      plan,
      options: { ...DEFAULT_IMPORT_OPTIONS, dryRun: false },
    });

    expect(prisma.issue.update).toHaveBeenCalledWith({ where: { id: "issue-child" }, data: { parentId: "issue-parent" } });
  });

  it("applies issue links via createMany with skipDuplicates", async () => {
    (prisma.project.findFirst as any).mockResolvedValue({ id: "proj-1", key: "ACME", name: "ACME" });
    (prisma.issue.findMany as any).mockResolvedValue([]);
    (prisma.issue.upsert as any)
      .mockResolvedValueOnce({ id: "issue-a" })
      .mockResolvedValueOnce({ id: "issue-b" });
    (prisma.project.findUnique as any).mockResolvedValue({ issueCounter: 0 });

    const a = normalizedIssue({ jiraKey: "ACME-1", jiraNumber: 1 });
    const b = normalizedIssue({ jiraKey: "ACME-2", jiraNumber: 2 });
    const plan = makePlan([a, b]);
    plan.links = [{ sourceKey: "ACME-1", targetKey: "ACME-2", relation: "BLOCKS" }];

    const report = await runImport({
      siteId: SITE_ID,
      importerUserId: IMPORTER_ID,
      plan,
      options: { ...DEFAULT_IMPORT_OPTIONS, dryRun: false },
    });

    expect(prisma.issueLink.createMany).toHaveBeenCalledWith({
      data: [{ sourceIssueId: "issue-a", targetIssueId: "issue-b", relation: "BLOCKS" }],
      skipDuplicates: true,
    });
    expect(report.summary.links.created).toBe(1);
  });
});
