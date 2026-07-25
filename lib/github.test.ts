import { describe, it, expect } from "vitest";
import { extractTaskKeys } from "./github";

describe("github helper engine", () => {
  it("extracts single task key from commit message", () => {
    const keys = extractTaskKeys("feat(VAM-14): implement real git integrations");
    expect(keys).toEqual(["VAM-14"]);
  });

  it("extracts multiple unique task keys from commit message", () => {
    const keys = extractTaskKeys("fix: resolve blockers for PROJ-101 and VAM-42");
    expect(keys).toEqual(["PROJ-101", "VAM-42"]);
  });

  it("extracts task key from branch name", () => {
    const keys = extractTaskKeys("feature/VAM-88-add-webhooks");
    expect(keys).toEqual(["VAM-88"]);
  });

  it("returns empty array when no task key exists", () => {
    const keys = extractTaskKeys("chore: update dependencies");
    expect(keys).toEqual([]);
  });
});
