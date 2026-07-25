import { describe, it, expect } from "vitest";
import { extractIssueKeys } from "./processor";

describe("Jira-grade Git Issue Key Extractor Engine", () => {
  it("extracts issue key from commit message 'Fix login bug TRK-123'", () => {
    const keys = extractIssueKeys("Fix login bug TRK-123");
    expect(keys).toEqual(["TRK-123"]);
  });

  it("extracts issue key from PR title 'feat(VAM-14): add development panel UI'", () => {
    const keys = extractIssueKeys("feat(VAM-14): add development panel UI");
    expect(keys).toEqual(["VAM-14"]);
  });

  it("extracts issue key from branch name 'feature/PROJ_99-42-login'", () => {
    const keys = extractIssueKeys("feature/PROJ_99-42-login");
    expect(keys).toEqual(["PROJ_99-42"]);
  });

  it("returns unique issue keys when multiple keys exist in commit message", () => {
    const keys = extractIssueKeys("resolve VAM-14 and TRK-123 and VAM-14");
    expect(keys).toEqual(["VAM-14", "TRK-123"]);
  });

  it("returns empty array for commit message without issue keys", () => {
    const keys = extractIssueKeys("chore: update npm packages and lockfile");
    expect(keys).toEqual([]);
  });
});
