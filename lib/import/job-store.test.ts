import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({ importJob: undefined as any, importRow: undefined as any }));

vi.mock("../prisma", () => ({ prisma: prismaMock }));

import { startImportJob, finishImportJob, failImportJob, isJobHistoryEnabled } from "./job-store";
import { emptySummary, type ImportReport } from "./types";

function baseReport(overrides: Partial<ImportReport> = {}): ImportReport {
  return {
    dryRun: false,
    source: "JIRA_JSON",
    sourceRowCount: 1,
    plannedIssueCount: 1,
    summary: emptySummary(),
    projects: [],
    unmapped: [],
    rowIssues: [],
    warnings: [],
    users: [],
    ...overrides,
  };
}

describe("job-store — schema not applied (models absent)", () => {
  beforeEach(() => {
    prismaMock.importJob = undefined;
    prismaMock.importRow = undefined;
  });

  it("isJobHistoryEnabled is false", () => {
    expect(isJobHistoryEnabled()).toBe(false);
  });

  it("startImportJob no-ops and returns null", async () => {
    const id = await startImportJob({ siteId: "s1", startedById: "u1", source: "JIRA_JSON", filename: null, dryRun: false });
    expect(id).toBeNull();
  });

  it("finishImportJob and failImportJob no-op silently on a null job id", async () => {
    await expect(finishImportJob(null, baseReport())).resolves.toBeUndefined();
    await expect(failImportJob(null, "boom")).resolves.toBeUndefined();
  });
});

describe("job-store — schema applied (models present)", () => {
  beforeEach(() => {
    prismaMock.importJob = { create: vi.fn(), update: vi.fn() };
    prismaMock.importRow = { createMany: vi.fn() };
  });

  it("isJobHistoryEnabled is true", () => {
    expect(isJobHistoryEnabled()).toBe(true);
  });

  it("startImportJob creates a RUNNING job and returns its id", async () => {
    prismaMock.importJob.create.mockResolvedValue({ id: "job-1" });
    const id = await startImportJob({ siteId: "s1", startedById: "u1", source: "JIRA_JSON", filename: "x.json", dryRun: false });
    expect(id).toBe("job-1");
    expect(prismaMock.importJob.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "RUNNING", siteId: "s1" }) })
    );
  });

  it("startImportJob swallows a write failure and returns null rather than blocking the import", async () => {
    prismaMock.importJob.create.mockRejectedValue(new Error("db down"));
    const id = await startImportJob({ siteId: "s1", startedById: "u1", source: "JIRA_JSON", filename: null, dryRun: false });
    expect(id).toBeNull();
  });

  it("finishImportJob marks SUCCEEDED when there are no row errors", async () => {
    await finishImportJob("job-1", baseReport());
    expect(prismaMock.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "job-1" }, data: expect.objectContaining({ status: "SUCCEEDED" }) })
    );
  });

  it("finishImportJob marks PARTIAL when there are row errors, and persists only failing rows", async () => {
    await finishImportJob(
      "job-1",
      baseReport({
        rowIssues: [
          { row: 1, jiraKey: "ACME-1", field: null, severity: "error", message: "bad" },
          { row: 2, jiraKey: "ACME-2", field: null, severity: "warning", message: "meh" },
        ],
      })
    );
    expect(prismaMock.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PARTIAL", errorCount: 1 }) })
    );
    expect(prismaMock.importRow.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ externalKey: "ACME-1", outcome: "ERROR" }),
          expect.objectContaining({ externalKey: "ACME-2", outcome: "SKIPPED" }),
        ],
      })
    );
  });

  it("failImportJob marks FAILED with the error message", async () => {
    await failImportJob("job-1", "everything broke");
    expect(prismaMock.importJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) })
    );
  });
});
