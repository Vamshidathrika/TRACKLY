import { describe, it, expect } from "vitest";
import { adfToText, htmlToText } from "./adf";

describe("adfToText", () => {
  it("passes plain strings through untouched (Jira Server v2 bodies)", () => {
    expect(adfToText("plain text")).toBe("plain text");
  });

  it("returns null for null/undefined/empty input", () => {
    expect(adfToText(null)).toBeNull();
    expect(adfToText(undefined)).toBeNull();
    expect(adfToText("   ")).toBeNull();
  });

  it("renders a paragraph of plain text", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }],
    };
    expect(adfToText(doc)).toBe("Hello world");
  });

  it("applies bold, italic, code, and strike marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "strong" }] },
            { type: "text", text: " and " },
            { type: "text", text: "code", marks: [{ type: "code" }] },
          ],
        },
      ],
    };
    expect(adfToText(doc)).toBe("**bold** and `code`");
  });

  it("renders a link mark with its href", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "docs", marks: [{ type: "link", attrs: { href: "https://x.test" } }] }],
        },
      ],
    };
    expect(adfToText(doc)).toBe("[docs](https://x.test)");
  });

  it("renders bullet and ordered lists", () => {
    const bulletDoc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "two" }] }] },
          ],
        },
      ],
    };
    expect(adfToText(bulletDoc)).toBe("- one\n- two");

    const orderedDoc = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "first" }] }] }],
        },
      ],
    };
    expect(adfToText(orderedDoc)).toBe("1. first");
  });

  it("renders a code block with language fence", () => {
    const doc = {
      type: "doc",
      content: [{ type: "codeBlock", attrs: { language: "ts" }, content: [{ type: "text", text: "const x = 1;" }] }],
    };
    expect(adfToText(doc)).toBe("```ts\nconst x = 1;\n```");
  });

  it("renders a mention with @ prefix", () => {
    const doc = { type: "doc", content: [{ type: "mention", attrs: { text: "@Alex" } }] };
    expect(adfToText(doc)).toBe("@Alex");
  });

  it("recurses into unknown node types instead of dropping their text", () => {
    const doc = {
      type: "doc",
      content: [{ type: "someWeirdExtension", content: [{ type: "text", text: "still here" }] }],
    };
    expect(adfToText(doc)).toBe("still here");
  });

  it("renders a table row as a pipe-delimited line", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "text", text: "a" }] },
            { type: "tableCell", content: [{ type: "text", text: "b" }] },
          ],
        },
      ],
    };
    expect(adfToText(doc)).toBe("| a | b |");
  });
});

describe("htmlToText", () => {
  it("strips tags and decodes entities", () => {
    expect(htmlToText("<p>Hello &amp; welcome</p>")).toBe("Hello & welcome");
  });

  it("returns null for empty or null input", () => {
    expect(htmlToText(null)).toBeNull();
    expect(htmlToText(undefined)).toBeNull();
    expect(htmlToText("")).toBeNull();
  });

  it("strips script and style blocks entirely", () => {
    expect(htmlToText("<p>keep</p><script>evil()</script>")).toBe("keep");
  });

  it("converts block tags into newlines", () => {
    const text = htmlToText("<p>one</p><p>two</p>");
    expect(text).toBe("one\n\ntwo");
  });
});
