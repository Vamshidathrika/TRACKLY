import { describe, it, expect } from "vitest";
import { parseJiraCsv } from "./csv";

function csv(header: string, ...rows: string[]) {
  return [header, ...rows].join("\n");
}

describe("parseJiraCsv", () => {
  it("throws when there is no Issue key column", () => {
    expect(() => parseJiraCsv(csv("Summary,Status", "First,Open"))).toThrow(/no "Issue key" column/);
  });

  it("parses a minimal row", () => {
    const result = parseJiraCsv(
      csv(
        "Issue key,Summary,Issue Type,Status,Priority",
        "ACME-1,Fix the bug,Bug,In Progress,High"
      )
    );
    expect(result.issues).toHaveLength(1);
    const issue = result.issues[0];
    expect(issue.jiraKey).toBe("ACME-1");
    expect(issue.jiraProjectKey).toBe("ACME");
    expect(issue.jiraNumber).toBe(1);
    expect(issue.summary).toBe("Fix the bug");
    expect(issue.typeName).toBe("Bug");
    expect(issue.statusName).toBe("In Progress");
    expect(issue.priorityName).toBe("High");
  });

  it("reports a row error for a malformed or missing key instead of throwing", () => {
    const result = parseJiraCsv(csv("Issue key,Summary", "not-a-key,Oops", "ACME-2,Fine"));
    expect(result.issues).toHaveLength(1);
    expect(result.rowIssues).toHaveLength(1);
    expect(result.rowIssues[0].severity).toBe("error");
    expect(result.rowIssues[0].row).toBe(2); // header + 1-based
    expect(result.sourceRowCount).toBe(2);
  });

  it("detects subtasks from the type name", () => {
    const result = parseJiraCsv(csv("Issue key,Summary,Issue Type", "ACME-3,Sub work,Sub-task"));
    expect(result.issues[0].isSubtask).toBe(true);
  });

  it("gathers repeated Comment columns positionally, ignoring header collisions", () => {
    const result = parseJiraCsv(
      csv(
        "Issue key,Comment,Comment",
        'ACME-4,"10/Mar/24 2:11 PM;557058:abc-1234;First comment","11/Mar/24 9:00 AM;557059:def-4567;Second comment"'
      )
    );
    expect(result.issues[0].comments).toHaveLength(2);
    expect(result.issues[0].comments[0].body).toBe("First comment");
    expect(result.issues[0].comments[0].author?.accountId).toBe("557058:abc-1234");
    expect(result.issues[0].comments[1].body).toBe("Second comment");
  });

  it("treats a comment cell with no metadata prefix as body-only", () => {
    const result = parseJiraCsv(csv("Issue key,Comment", "ACME-5,just some text"));
    expect(result.issues[0].comments).toEqual([{ author: null, body: "just some text", createdAt: new Date(0) }]);
  });

  it("parses work log cells as date;author;seconds;comment", () => {
    const result = parseJiraCsv(
      csv("Issue key,Log Work", 'ACME-6,"10/Mar/24 2:11 PM;Jane Doe;3600;did some work"')
    );
    expect(result.issues[0].workLogs).toHaveLength(1);
    expect(result.issues[0].workLogs[0].seconds).toBe(3600);
    expect(result.issues[0].workLogs[0].author?.displayName).toBe("Jane Doe");
    expect(result.issues[0].workLogs[0].comment).toBe("did some work");
  });

  it("drops work log cells with zero or unparsable time", () => {
    const result = parseJiraCsv(csv("Issue key,Log Work", 'ACME-7,"10/Mar/24 2:11 PM;Jane;0;nothing logged"'));
    expect(result.issues[0].workLogs).toHaveLength(0);
  });

  it("parses direction-tagged link columns", () => {
    const result = parseJiraCsv(
      csv("Issue key,Outward issue link (Blocks),Inward issue link (Blocks)", "ACME-8,ACME-9,ACME-10")
    );
    expect(result.issues[0].links).toEqual([
      { relationName: "Blocks", direction: "outward", otherKey: "ACME-9" },
      { relationName: "Blocks", direction: "inward", otherKey: "ACME-10" },
    ]);
  });

  it("parses Custom field (...) columns and excludes ones already mapped onto first-class fields", () => {
    const result = parseJiraCsv(
      csv(
        "Issue key,Custom field (Team),Custom field (Sprint)",
        "ACME-11,Platform,Sprint 3"
      )
    );
    expect(result.issues[0].customFields).toEqual([{ name: "Team", value: "Platform" }]);
  });

  it("records history as empty — CSV carries no changelog", () => {
    const result = parseJiraCsv(csv("Issue key,Summary", "ACME-12,No history here"));
    expect(result.issues[0].history).toEqual([]);
  });

  it("recognises an account-id-shaped reporter/assignee cell as an accountId, not a name", () => {
    const result = parseJiraCsv(csv("Issue key,Assignee", "ACME-13,JIRAUSER10100"));
    expect(result.issues[0].assignee).toEqual({ email: undefined, accountId: "JIRAUSER10100", displayName: undefined });
  });

  it("treats 'Unassigned' with no email as no user at all", () => {
    const result = parseJiraCsv(csv("Issue key,Assignee", "ACME-14,Unassigned"));
    expect(result.issues[0].assignee).toBeNull();
  });

  it("falls back to the key's own prefix when there is no Project key column", () => {
    const result = parseJiraCsv(csv("Issue key,Summary", "ZED-1,Hi"));
    expect(result.issues[0].jiraProjectKey).toBe("ZED");
  });
});
