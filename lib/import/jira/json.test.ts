import { describe, it, expect } from "vitest";
import { parseJiraJson } from "./json";

function baseIssue(overrides: Record<string, any> = {}) {
  return {
    key: "ACME-1",
    fields: {
      summary: "Fix the login bug",
      issuetype: { name: "Bug", subtask: false },
      status: { name: "In Progress", statusCategory: { key: "indeterminate" } },
      priority: { name: "High" },
      project: { key: "ACME" },
      reporter: { emailAddress: "reporter@example.com", displayName: "Reporter Person" },
      ...overrides,
    },
    ...(overrides.__top ?? {}),
  };
}

describe("parseJiraJson", () => {
  it("parses a search-response envelope ({ issues: [...] })", () => {
    const result = parseJiraJson({ issues: [baseIssue()] });
    expect(result.issues).toHaveLength(1);
    expect(result.sourceRowCount).toBe(1);
    expect(result.issues[0].jiraKey).toBe("ACME-1");
    expect(result.issues[0].jiraProjectKey).toBe("ACME");
    expect(result.issues[0].summary).toBe("Fix the login bug");
    expect(result.issues[0].typeName).toBe("Bug");
    expect(result.issues[0].statusName).toBe("In Progress");
    expect(result.issues[0].priorityName).toBe("High");
    expect(result.issues[0].reporter).toEqual({
      email: "reporter@example.com",
      accountId: undefined,
      displayName: "Reporter Person",
    });
  });

  it("accepts a bare array of issues", () => {
    const result = parseJiraJson([baseIssue()]);
    expect(result.issues).toHaveLength(1);
  });

  it("accepts a single issue fetched by key (key + fields at top level)", () => {
    const result = parseJiraJson(baseIssue());
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].jiraKey).toBe("ACME-1");
  });

  it("throws for unrecognised shapes", () => {
    expect(() => parseJiraJson({ foo: "bar" })).toThrow(/Unrecognised Jira JSON/);
    expect(() => parseJiraJson("just a string")).toThrow(/Unrecognised Jira JSON/);
    expect(() => parseJiraJson(null)).toThrow(/Unrecognised Jira JSON/);
  });

  it("reports a row error instead of throwing for one malformed issue key", () => {
    const result = parseJiraJson({ issues: [baseIssue(), { key: "not-a-key", fields: {} }] });
    expect(result.issues).toHaveLength(1);
    expect(result.rowIssues).toHaveLength(1);
    expect(result.rowIssues[0].severity).toBe("error");
    expect(result.rowIssues[0].row).toBe(2);
    expect(result.sourceRowCount).toBe(2);
  });

  it("falls back to the key's own project prefix when fields.project is absent", () => {
    const result = parseJiraJson({ issues: [{ key: "ZED-9", fields: { summary: "x" } }] });
    expect(result.issues[0].jiraProjectKey).toBe("ZED");
  });

  it("uses the key as a placeholder summary when summary is missing", () => {
    const result = parseJiraJson({ issues: [{ key: "ACME-2", fields: {} }] });
    expect(result.issues[0].summary).toBe("ACME-2 (no summary in export)");
  });

  it("marks subtasks from issuetype.subtask regardless of the type name", () => {
    const result = parseJiraJson({
      issues: [baseIssue({ issuetype: { name: "Custom Sub Type", subtask: true } })],
    });
    expect(result.issues[0].isSubtask).toBe(true);
  });

  it("parses comments, preferring renderedFields HTML over ADF", () => {
    const raw = {
      issues: [
        {
          key: "ACME-3",
          fields: {
            summary: "x",
            comment: {
              comments: [
                {
                  id: "1",
                  author: { displayName: "Alice", emailAddress: "alice@example.com" },
                  created: "2024-01-01T00:00:00.000+0000",
                  body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "adf body" }] }] },
                },
              ],
            },
          },
          renderedFields: {
            comment: { comments: [{ body: "<p>rendered body</p>" }] },
          },
        },
      ],
    };
    const result = parseJiraJson(raw);
    expect(result.issues[0].comments).toHaveLength(1);
    expect(result.issues[0].comments[0].body).toBe("rendered body");
    expect(result.issues[0].comments[0].author?.email).toBe("alice@example.com");
  });

  it("parses worklogs and drops zero/negative time entries", () => {
    const raw = {
      issues: [
        {
          key: "ACME-4",
          fields: {
            summary: "x",
            worklog: {
              worklogs: [
                { timeSpentSeconds: 3600, started: "2024-01-01T00:00:00.000+0000", author: { displayName: "Bob" } },
                { timeSpentSeconds: 0, started: "2024-01-02T00:00:00.000+0000" },
              ],
            },
          },
        },
      ],
    };
    const result = parseJiraJson(raw);
    expect(result.issues[0].workLogs).toHaveLength(1);
    expect(result.issues[0].workLogs[0].seconds).toBe(3600);
  });

  it("flattens the changelog into one history row per field item", () => {
    const raw = {
      issues: [
        {
          key: "ACME-5",
          fields: { summary: "x" },
          changelog: {
            histories: [
              {
                id: "100",
                author: { displayName: "Carol" },
                created: "2024-01-01T00:00:00.000+0000",
                items: [
                  { field: "status", fromString: "To Do", toString: "In Progress" },
                  { field: "assignee", fromString: null, toString: "Carol" },
                ],
              },
            ],
          },
        },
      ],
    };
    const result = parseJiraJson(raw);
    expect(result.issues[0].history).toHaveLength(2);
    expect(result.issues[0].history[0].field).toBe("status");
    expect(result.issues[0].history[0].toValue).toBe("In Progress");
  });

  it("parses issue links using direction and honours the other issue's key", () => {
    const raw = {
      issues: [
        {
          key: "ACME-6",
          fields: {
            summary: "x",
            issuelinks: [
              { type: { name: "Blocks" }, outwardIssue: { key: "ACME-7" } },
              { type: { name: "Blocks" }, inwardIssue: { key: "ACME-8" } },
            ],
          },
        },
      ],
    };
    const result = parseJiraJson(raw);
    expect(result.issues[0].links).toEqual([
      { relationName: "Blocks", direction: "outward", otherKey: "ACME-7" },
      { relationName: "Blocks", direction: "inward", otherKey: "ACME-8" },
    ]);
  });

  it("resolves story points via expand=names field labels", () => {
    const raw = {
      names: { customfield_99999: "Story Points" },
      issues: [{ key: "ACME-9", fields: { summary: "x", customfield_99999: 5 } }],
    };
    const result = parseJiraJson(raw);
    expect(result.issues[0].storyPoints).toBe(5);
  });

  it("falls back to known story point field ids without expand=names", () => {
    const raw = { issues: [{ key: "ACME-10", fields: { summary: "x", customfield_10016: 8 } }] };
    const result = parseJiraJson(raw);
    expect(result.issues[0].storyPoints).toBe(8);
  });

  it("collects unnamed customfield_ entries as custom fields, excluding first-class ones", () => {
    const raw = {
      names: { customfield_20000: "Team", customfield_99999: "Story Points" },
      issues: [{ key: "ACME-11", fields: { summary: "x", customfield_20000: "Platform", customfield_99999: 3 } }],
    };
    const result = parseJiraJson(raw);
    expect(result.issues[0].customFields).toEqual([{ name: "Team", value: "Platform" }]);
  });

  it("parses legacy greenhopper sprint strings", () => {
    const raw = {
      issues: [
        {
          key: "ACME-12",
          fields: {
            summary: "x",
            customfield_10020: [
              "com.atlassian.greenhopper.service.sprint.Sprint@1a2b[id=5,name=Sprint 3,state=CLOSED,startDate=<null>,endDate=<null>]",
            ],
          },
        },
      ],
    };
    const result = parseJiraJson(raw);
    expect(result.issues[0].sprints).toEqual([{ externalId: "5", name: "Sprint 3", state: "CLOSED", startDate: null, endDate: null }]);
  });
});
