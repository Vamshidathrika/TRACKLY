import { describe, test, expect } from "vitest";
import { ingestTelemetryCrash, analyzeRootCause, generateAutoPatch, type CrashPayload } from "./bugs/bug-engine";

describe("Autonomous Bug Superpowers Suite", () => {
  const sampleCrash: CrashPayload = {
    errorName: "TypeError",
    errorMessage: "Cannot read properties of null (reading 'user')",
    stacktrace: "TypeError: Cannot read properties of null at getAuthUser (lib/auth.ts:45:12)",
    filePath: "lib/auth.ts",
    lineNumber: 45,
    environment: "production",
    siteId: "site-123",
  };

  test("Bug Superpower 1: Telemetry Ingest creates formatted bug ticket summary", async () => {
    const ticketData = await ingestTelemetryCrash(sampleCrash);
    expect(ticketData.summary).toContain("TypeError in lib/auth.ts:45");
    expect(ticketData.description).toContain("Cannot read properties of null");
    expect(ticketData.status).toBe("OPEN");
  });

  test("Bug Superpower 2: AI Root Cause Engine analyzes AST dependencies", () => {
    const analysis = analyzeRootCause(sampleCrash);
    expect(analysis.targetFile).toBe("lib/auth.ts");
    expect(analysis.lineNumber).toBe(45);
    expect(analysis.suspectedCause).toContain("Session object");
    expect(analysis.affectedComponents).toContain("lib/tenant.ts");
  });

  test("Bug Superpower 3: Autonomous Patch Generator creates code diff and regression test", () => {
    const analysis = analyzeRootCause(sampleCrash);
    const patch = generateAutoPatch(analysis);
    expect(patch.branchName).toContain("rovo-bugfix/");
    expect(patch.patchDiff).toContain("--- a/lib/auth.ts");
    expect(patch.unitTestCode).toContain("Regression Immunity Test");
    expect(patch.confidenceScore).toBeGreaterThanOrEqual(0.9);
    expect(patch.prUrl).toContain("github.com");
  });
});
