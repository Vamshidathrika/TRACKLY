import { describe, it, expect } from "vitest";
import {
  mapStatus,
  mapIssueType,
  mapPriority,
  mapLinkRelation,
  mapSprintStatus,
  parseJiraKey,
  sanitiseProjectKey,
  stripReservedLabels,
  jiraKeyLabel,
  componentLabel,
  FALLBACK_STATUS,
  FALLBACK_TYPE,
  FALLBACK_PRIORITY,
  FALLBACK_LINK,
} from "./mapping";

describe("mapStatus", () => {
  it("maps exact Jira status names case-insensitively", () => {
    expect(mapStatus("To Do").value).toBe("TO_DO");
    expect(mapStatus("in progress").value).toBe("IN_PROGRESS");
    expect(mapStatus("Done").value).toBe("DONE");
    expect(mapStatus("To Do").exact).toBe(true);
  });

  it("routes review-ish keywords to IN_REVIEW ahead of the status category", () => {
    // Jira lumps "Code Review" into the "indeterminate" category, which would
    // otherwise collapse to IN_PROGRESS — the keyword check must win.
    const mapped = mapStatus("Code Review", "indeterminate");
    expect(mapped.value).toBe("IN_REVIEW");
    expect(mapped.exact).toBe(true);
  });

  it("falls back to the status category when the name is unrecognised", () => {
    const mapped = mapStatus("Some Custom Column", "done");
    expect(mapped.value).toBe("DONE");
    expect(mapped.exact).toBe(false);
    expect(mapped.sourceValue).toBe("Some Custom Column");
  });

  it("falls back to TO_DO when nothing matches at all", () => {
    const mapped = mapStatus(null, null);
    expect(mapped.value).toBe(FALLBACK_STATUS);
    expect(mapped.exact).toBe(true); // no source value at all -> not a lossy mapping
    expect(mapped.sourceValue).toBeNull();
  });

  it("marks an unrecognised status with no category as inexact", () => {
    const mapped = mapStatus("Triage", undefined);
    expect(mapped.value).toBe(FALLBACK_STATUS);
    expect(mapped.exact).toBe(false);
  });
});

describe("mapIssueType", () => {
  it("maps common Jira type names", () => {
    expect(mapIssueType("Epic").value).toBe("EPIC");
    expect(mapIssueType("Story").value).toBe("STORY");
    expect(mapIssueType("Bug").value).toBe("BUG");
    expect(mapIssueType("Task").value).toBe("TASK");
  });

  it("treats Jira's subtask flag as authoritative over the type name", () => {
    const mapped = mapIssueType("QA Step", true);
    expect(mapped.value).toBe("SUBTASK");
    expect(mapped.exact).toBe(true);
  });

  it("falls back to TASK for unknown types", () => {
    const mapped = mapIssueType("Weird Custom Type");
    expect(mapped.value).toBe(FALLBACK_TYPE);
    expect(mapped.exact).toBe(false);
  });
});

describe("mapPriority", () => {
  it("maps names and numeric shorthand", () => {
    expect(mapPriority("Highest").value).toBe("HIGHEST");
    expect(mapPriority("P1").value).toBe("HIGH");
    expect(mapPriority("3").value).toBe("MEDIUM");
    expect(mapPriority("Trivial").value).toBe("LOWEST");
  });

  it("falls back to MEDIUM for unknown priorities", () => {
    const mapped = mapPriority("Mega Urgent");
    expect(mapped.value).toBe(FALLBACK_PRIORITY);
    expect(mapped.exact).toBe(false);
  });
});

describe("mapLinkRelation", () => {
  it("resolves Blocks by direction", () => {
    expect(mapLinkRelation({ relationName: "Blocks", direction: "outward" }).value).toBe("BLOCKS");
    expect(mapLinkRelation({ relationName: "Blocks", direction: "inward" }).value).toBe("IS_BLOCKED_BY");
  });

  it("maps Duplicates and Relates regardless of direction", () => {
    expect(mapLinkRelation({ relationName: "Duplicate", direction: "outward" }).value).toBe("DUPLICATES");
    expect(mapLinkRelation({ relationName: "Relates", direction: "inward" }).value).toBe("RELATES_TO");
  });

  it("collapses unknown link types to the fallback and marks them inexact", () => {
    const mapped = mapLinkRelation({ relationName: "Cloners", direction: "outward" });
    expect(mapped.value).toBe(FALLBACK_LINK);
    expect(mapped.exact).toBe(false);
  });
});

describe("mapSprintStatus", () => {
  it("maps active and closed, defaulting to future", () => {
    expect(mapSprintStatus("active")).toBe("ACTIVE");
    expect(mapSprintStatus("Closed")).toBe("CLOSED");
    expect(mapSprintStatus("future")).toBe("FUTURE");
    expect(mapSprintStatus(undefined)).toBe("FUTURE");
  });
});

describe("parseJiraKey", () => {
  it("splits a valid key into project key and number", () => {
    expect(parseJiraKey("ACME-42")).toEqual({ projectKey: "ACME", number: 42 });
  });

  it("upper-cases the project key", () => {
    expect(parseJiraKey("acme-7")).toEqual({ projectKey: "ACME", number: 7 });
  });

  it("returns null for malformed keys", () => {
    expect(parseJiraKey("not-a-key")).toBeNull();
    expect(parseJiraKey("ACME-")).toBeNull();
    expect(parseJiraKey("")).toBeNull();
    expect(parseJiraKey(null)).toBeNull();
    expect(parseJiraKey(undefined)).toBeNull();
  });

  it("rejects a zero or negative number", () => {
    expect(parseJiraKey("ACME-0")).toBeNull();
  });
});

describe("sanitiseProjectKey", () => {
  it("upper-cases and strips non-alphanumerics", () => {
    expect(sanitiseProjectKey("acme-1!")).toBe("ACME1");
  });

  it("truncates to 10 characters", () => {
    expect(sanitiseProjectKey("abcdefghijklmnop")).toBe("ABCDEFGHIJ");
    expect(sanitiseProjectKey("abcdefghijklmnop").length).toBe(10);
  });

  it("falls back to IMPORT when nothing usable remains", () => {
    expect(sanitiseProjectKey("!!!")).toBe("IMPORT");
  });
});

describe("label helpers", () => {
  it("builds and strips reserved label prefixes", () => {
    const labels = ["bug", jiraKeyLabel("ACME-1"), componentLabel("Backend")];
    expect(stripReservedLabels(labels)).toEqual(["bug"]);
  });

  it("upper-cases the jira key in the label", () => {
    expect(jiraKeyLabel("acme-9")).toBe("jira:ACME-9");
  });
});
