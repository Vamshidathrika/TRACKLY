import { describe, it, expect } from "vitest";
import { parseJQLToPrisma, getJQLSuggestions, convertNaturalLanguageToJQL } from "./jql";

describe("jql engine", () => {
  it("parses single condition status = IN_PROGRESS", () => {
    const where = parseJQLToPrisma("status = IN_PROGRESS");
    expect(where).toEqual({ status: "IN_PROGRESS" });
  });

  it("parses multiple AND conditions", () => {
    const where = parseJQLToPrisma("type = BUG AND priority = HIGH");
    expect(where).toEqual({
      type: "BUG",
      priority: "HIGH",
    });
  });

  it("parses multiple OR conditions", () => {
    const where = parseJQLToPrisma("status = IN_PROGRESS OR status = TO_DO");
    expect(where).toEqual({
      OR: [
        { status: "IN_PROGRESS" },
        { status: "TO_DO" },
      ],
    });
  });

  it("parses summary contains query", () => {
    const where = parseJQLToPrisma('summary ~ "layout"');
    expect(where).toEqual({
      summary: { contains: "layout", mode: "insensitive" },
    });
  });

  it("provides autocomplete suggestions for empty string", () => {
    const suggestions = getJQLSuggestions("");
    expect(suggestions).toContain("status");
    expect(suggestions).toContain("priority");
    expect(suggestions).toContain("type");
  });

  it("parses status with spaces into normalized enum", () => {
    const where = parseJQLToPrisma('status = "To Do"');
    expect(where).toEqual({ status: "TO_DO" });
  });

  it("provides value suggestions after status =", () => {
    const suggestions = getJQLSuggestions("status = ");
    expect(suggestions).toContain("IN_PROGRESS");
    expect(suggestions).toContain("DONE");
  });

  it("converts natural language text to valid JQL syntax", () => {
    const jql1 = convertNaturalLanguageToJQL("high priority open bugs");
    expect(jql1).toContain('priority = "HIGH"');
    expect(jql1).toContain('type = "BUG"');
    expect(jql1).toContain('status = "TO_DO"');

    const jql2 = convertNaturalLanguageToJQL("urgent tasks in progress");
    expect(jql2).toContain('priority = "HIGH"');
    expect(jql2).toContain('type = "TASK"');
    expect(jql2).toContain('status = "IN_PROGRESS"');
  });
});
