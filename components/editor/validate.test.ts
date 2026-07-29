import { describe, it, expect } from "vitest";
import { validateRichDoc } from "./validate";
import { MAX_DEPTH } from "./schema";

const para = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("validateRichDoc — structure", () => {
  it("accepts a plain document", () => {
    const result = validateRichDoc({ type: "doc", content: [para("hello")] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc).toEqual({ type: "doc", content: [para("hello")] });
  });

  it("rejects non-doc roots", () => {
    expect(validateRichDoc(null).ok).toBe(false);
    expect(validateRichDoc(undefined).ok).toBe(false);
    expect(validateRichDoc("hello").ok).toBe(false);
    expect(validateRichDoc({ type: "paragraph" }).ok).toBe(false);
  });

  it("rejects unknown node types outright", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [{ type: "script", content: [{ type: "text", text: "x" }] }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unsupported content type/);
  });

  it("rejects text nodes with no text", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text" }] }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects documents over the size cap", () => {
    const big = {
      type: "doc",
      content: Array.from({ length: 4000 }, () => para("a".repeat(40))),
    };
    const result = validateRichDoc(big);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too large/);
  });

  it("rejects documents nested past the depth cap", () => {
    let node: Record<string, unknown> = para("deep");
    for (let i = 0; i < MAX_DEPTH + 2; i++) {
      node = { type: "blockquote", content: [node] };
    }
    const result = validateRichDoc({ type: "doc", content: [node] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/nesting/);
  });

  it("returns a new document, not the input object", () => {
    const input = { type: "doc", content: [para("hi")] };
    const result = validateRichDoc(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc).not.toBe(input);
  });
});

describe("validateRichDoc — attribute stripping", () => {
  it("drops unknown attributes rather than copying them through", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2, onclick: "alert(1)", style: "color:red", class: "evil" },
          content: [{ type: "text", text: "Title" }],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const heading = result.doc.content?.[0];
    expect(heading?.attrs).toEqual({ level: 2 });
  });

  it("clamps out-of-range heading levels", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 99 }, content: [{ type: "text", text: "t" }] }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.content?.[0].attrs).toEqual({ level: 1 });
  });

  it("keeps the text but drops a link mark with an unsafe href", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click me",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const textNode = result.doc.content?.[0].content?.[0];
    expect(textNode?.text).toBe("click me");
    expect(textNode?.marks).toBeUndefined();
  });

  it("keeps a link mark with a safe href, and only the href", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "docs",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://example.com/", target: "_self", rel: "opener" },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.content?.[0].content?.[0].marks).toEqual([
      { type: "link", attrs: { href: "https://example.com/" } },
    ]);
  });

  it("drops unknown marks without failing the save", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x", marks: [{ type: "textStyle" }, { type: "bold" }] }],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.content?.[0].content?.[0].marks).toEqual([{ type: "bold" }]);
    }
  });

  it("drops an image whose src is not a safe scheme", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        { type: "image", attrs: { src: "javascript:alert(1)" } },
        { type: "image", attrs: { src: "https://cdn.example.com/a.png", alt: "ok" } },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.content).toHaveLength(1);
    expect(result.doc.content?.[0].attrs).toEqual({
      src: "https://cdn.example.com/a.png",
      alt: "ok",
    });
  });

  it("drops a mention with neither id nor label", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "mention", attrs: { foo: "bar" } }] },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.content?.[0].content).toBeUndefined();
  });

  it("keeps only id and label on a mention", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "mention", attrs: { id: "u_1", label: "Ada Lovelace", href: "javascript:1" } },
          ],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.content?.[0].content?.[0].attrs).toEqual({
        id: "u_1",
        label: "Ada Lovelace",
      });
    }
  });

  it("rejects a code block language that is not a plain token", () => {
    const result = validateRichDoc({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: '"><script>' },
          content: [{ type: "text", text: "x" }],
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.doc.content?.[0].attrs).toBeUndefined();
  });
});
