import { describe, it, expect } from "vitest";
import { planImport } from "./plan";
import type { NormalizedIssue } from "./types";

function issue(overrides: Partial<NormalizedIssue> & { jiraKey: string }): NormalizedIssue {
  const parsed = /^([A-Z]+)-(\d+)$/.exec(overrides.jiraKey)!;
  return {
    sourceRow: 1,
    jiraProjectKey: parsed[1],
    jiraNumber: Number(parsed[2]),
    summary: "Summary",
    description: null,
    typeName: "Task",
    isSubtask: false,
    statusName: "To Do",
    statusCategoryKey: "new",
    priorityName: "Medium",
    storyPoints: null,
    originalEstimateSeconds: null,
    reporter: { email: "reporter@example.com", displayName: "Reporter" },
    assignee: null,
    parentKey: null,
    labels: [],
    components: [],
    createdAt: null,
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

describe("planImport — grouping", () => {
  it("groups issues by Jira project key and sanitises the Trackly key", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1" }), issue({ jiraKey: "ACME-2" }), issue({ jiraKey: "ZED-1" })],
      rowIssues: [],
      sourceRowCount: 3,
    });
    expect(plan.projects.map((p) => p.jiraProjectKey)).toEqual(["ACME", "ZED"]);
    expect(plan.projects[0].tracklyKey).toBe("ACME");
    expect(plan.projects[0].issues).toHaveLength(2);
  });

  it("applies a project key override", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1" })],
      rowIssues: [],
      sourceRowCount: 1,
      projectKeyOverrides: { ACME: "LEGACY" },
    });
    expect(plan.projects[0].tracklyKey).toBe("LEGACY");
  });
});

describe("planImport — dedupe", () => {
  it("keeps the last occurrence of a duplicate key and reports the earlier one", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1", summary: "First" }), issue({ jiraKey: "ACME-1", summary: "Second" })],
      rowIssues: [],
      sourceRowCount: 2,
    });
    expect(plan.projects[0].issues).toHaveLength(1);
    expect(plan.projects[0].issues[0].source.summary).toBe("Second");
    expect(plan.rowIssues.some((r) => r.severity === "warning" && /Duplicate/.test(r.message))).toBe(true);
  });
});

describe("planImport — enum mapping and unmapped tracking", () => {
  it("records inexact status/type/priority mappings, aggregating counts", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [
        issue({ jiraKey: "ACME-1", statusName: "Triage", statusCategoryKey: null }),
        issue({ jiraKey: "ACME-2", statusName: "Triage", statusCategoryKey: null }),
      ],
      rowIssues: [],
      sourceRowCount: 2,
    });
    const statusUnmapped = plan.unmapped.find((u) => u.kind === "status" && u.sourceValue === "Triage");
    expect(statusUnmapped).toBeDefined();
    expect(statusUnmapped!.count).toBe(2);
    expect(statusUnmapped!.fallback).toBe("TO_DO");
  });

  it("reports custom field values as dropped, since Trackly has no per-issue value store", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1", customFields: [{ name: "Team", value: "Platform" }] })],
      rowIssues: [],
      sourceRowCount: 1,
    });
    expect(plan.rowIssues.some((r) => r.field === "custom fields" && r.severity === "warning")).toBe(true);
  });
});

describe("planImport — parent/child hierarchy", () => {
  it("links a child to its parent when both are present in the same project", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1" }), issue({ jiraKey: "ACME-2", parentKey: "ACME-1" })],
      rowIssues: [],
      sourceRowCount: 2,
    });
    expect(plan.parents).toEqual([{ childKey: "ACME-2", parentKey: "ACME-1" }]);
  });

  it("warns instead of linking when the parent is missing from the export", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-2", parentKey: "ACME-1" })],
      rowIssues: [],
      sourceRowCount: 1,
    });
    expect(plan.parents).toHaveLength(0);
    expect(plan.rowIssues.some((r) => r.field === "parent" && /not in this export/.test(r.message))).toBe(true);
  });

  it("warns instead of linking when the parent belongs to a different project", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ZED-1" }), issue({ jiraKey: "ACME-2", parentKey: "ZED-1" })],
      rowIssues: [],
      sourceRowCount: 2,
    });
    expect(plan.parents).toHaveLength(0);
    expect(plan.rowIssues.some((r) => r.field === "parent" && /different project/.test(r.message))).toBe(true);
  });
});

describe("planImport — links", () => {
  it("creates one link row per issue's own perspective, since Trackly only renders an issue's outward links", () => {
    // lib/issues.ts's getIssueByKey only ever includes `linksOut`, never
    // `linksIn` — so both ACME-1 and ACME-2 need their own row for each to
    // show the relationship on its own issue page. Only a literal repeat of
    // the exact same directional entry should be deduped.
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [
        issue({ jiraKey: "ACME-1", links: [{ relationName: "Blocks", direction: "outward", otherKey: "ACME-2" }] }),
        issue({ jiraKey: "ACME-2", links: [{ relationName: "Blocks", direction: "inward", otherKey: "ACME-1" }] }),
      ],
      rowIssues: [],
      sourceRowCount: 2,
    });
    expect(plan.links).toHaveLength(2);
    expect(plan.links).toContainEqual({ sourceKey: "ACME-1", targetKey: "ACME-2", relation: "BLOCKS" });
    expect(plan.links).toContainEqual({ sourceKey: "ACME-2", targetKey: "ACME-1", relation: "IS_BLOCKED_BY" });
  });

  it("dedupes a literal repeat of the same directional link entry", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [
        issue({
          jiraKey: "ACME-1",
          links: [
            { relationName: "Blocks", direction: "outward", otherKey: "ACME-2" },
            { relationName: "Blocks", direction: "outward", otherKey: "ACME-2" },
          ],
        }),
        issue({ jiraKey: "ACME-2" }),
      ],
      rowIssues: [],
      sourceRowCount: 2,
    });
    expect(plan.links).toHaveLength(1);
  });

  it("warns and drops a link whose target is not in the export", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1", links: [{ relationName: "Blocks", direction: "outward", otherKey: "ACME-99" }] })],
      rowIssues: [],
      sourceRowCount: 1,
    });
    expect(plan.links).toHaveLength(0);
    expect(plan.rowIssues.some((r) => r.field === "issue link")).toBe(true);
  });

  it("records an unknown link type as unmapped", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [
        issue({ jiraKey: "ACME-1", links: [{ relationName: "Cloners", direction: "outward", otherKey: "ACME-2" }] }),
        issue({ jiraKey: "ACME-2" }),
      ],
      rowIssues: [],
      sourceRowCount: 2,
    });
    expect(plan.unmapped.some((u) => u.kind === "linkType" && u.sourceValue === "Cloners")).toBe(true);
  });
});

describe("planImport — row-level and run-level warnings", () => {
  it("warns when an issue has no reporter", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1", reporter: null })],
      rowIssues: [],
      sourceRowCount: 1,
    });
    expect(plan.rowIssues.some((r) => r.field === "reporter")).toBe(true);
  });

  it("warns about attachments not being copied", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [
        issue({
          jiraKey: "ACME-1",
          attachments: [{ uploader: null, filename: "a.png", url: "https://x", mimeType: "image/png", sizeBytes: 1, createdAt: new Date() }],
        }),
      ],
      rowIssues: [],
      sourceRowCount: 1,
    });
    expect(plan.rowIssues.some((r) => r.field === "attachments")).toBe(true);
    expect(plan.warnings.some((w) => w.code === "attachments-not-copied")).toBe(true);
  });

  it("emits CSV-specific warnings only for the CSV source", () => {
    const jsonPlan = planImport({ source: "JIRA_JSON", issues: [issue({ jiraKey: "ACME-1" })], rowIssues: [], sourceRowCount: 1 });
    expect(jsonPlan.warnings.some((w) => w.code === "csv-no-changelog")).toBe(false);

    const csvPlan = planImport({ source: "JIRA_CSV", issues: [issue({ jiraKey: "ACME-1" })], rowIssues: [], sourceRowCount: 1 });
    expect(csvPlan.warnings.some((w) => w.code === "csv-no-changelog")).toBe(true);
    expect(csvPlan.warnings.some((w) => w.code === "csv-weak-user-identity")).toBe(true);
  });

  it("warns about multiple Jira projects landing in separate Trackly projects", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1" }), issue({ jiraKey: "ZED-1" })],
      rowIssues: [],
      sourceRowCount: 2,
    });
    expect(plan.warnings.some((w) => w.code === "multi-project")).toBe(true);
  });
});

describe("planImport — labels", () => {
  it("adds a jira: provenance label and component: labels, stripping any pre-existing reserved ones", () => {
    const plan = planImport({
      source: "JIRA_JSON",
      issues: [issue({ jiraKey: "ACME-1", labels: ["bug", "jira:SPOOFED-1"], components: ["Backend"] })],
      rowIssues: [],
      sourceRowCount: 1,
    });
    const labels = plan.projects[0].issues[0].labels;
    expect(labels).toContain("bug");
    expect(labels).toContain("jira:ACME-1");
    expect(labels).toContain("component:Backend");
    expect(labels).not.toContain("jira:SPOOFED-1");
  });
});
