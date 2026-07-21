import { describe, it, expect } from "vitest";
import { parseJQLToPrisma, getJQLSuggestions } from "./jql";

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

  it("provides value suggestions after status =", () => {
    const suggestions = getJQLSuggestions("status = ");
    expect(suggestions).toContain("IN_PROGRESS");
    expect(suggestions).toContain("DONE");
  });
});
