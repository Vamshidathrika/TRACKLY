import { describe, it, expect } from "vitest";
import { generateAcceptanceCriteria, summarizeIssueContext } from "./aiAssistant";

describe("aiAssistant", () => {
  describe("generateAcceptanceCriteria", () => {
    it("generates structured acceptance criteria from title and description", () => {
      const result = generateAcceptanceCriteria(
        "User Profile Photo Upload",
        "Allow users to upload PNG/JPG avatars up to 5MB"
      );

      expect(result).toBeDefined();
      expect(result.summary).toContain("User Profile Photo Upload");
      expect(result.criteria.length).toBeGreaterThan(0);
      expect(result.suggestedStoryPoints).toBeGreaterThan(0);
    });

    it("handles title-only inputs gracefully", () => {
      const result = generateAcceptanceCriteria("Fix navigation bar flickering");
      expect(result.criteria.length).toBeGreaterThan(0);
    });
  });

  describe("summarizeIssueContext", () => {
    it("summarizes a list of comment strings into key takeaways", () => {
      const comments = [
        "Reproduced on Safari 17.2",
        "Caused by missing z-index in sticky header",
        "PR #42 opened with fix",
      ];
      const summary = summarizeIssueContext(comments);
      expect(summary).toContain("Key Discussion Points");
      expect(summary).toContain("z-index");
    });

    it("returns empty notice when no comments exist", () => {
      const summary = summarizeIssueContext([]);
      expect(summary).toBe("No discussion history available to summarize.");
    });
  });
});
