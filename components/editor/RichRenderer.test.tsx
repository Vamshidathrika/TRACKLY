import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichRenderer } from "./RichRenderer";
import type { RichDoc } from "./types";

const para = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("RichRenderer — legacy plain-text fallback", () => {
  it("renders fallbackText when doc is absent", () => {
    render(<RichRenderer fallbackText="hello there" />);
    expect(screen.getByText("hello there")).toBeInTheDocument();
  });

  it("preserves blank-line paragraph breaks in plain text", () => {
    const { container } = render(<RichRenderer fallbackText={"first\n\nsecond"} />);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("first");
    expect(paragraphs[1].textContent).toBe("second");
  });

  it("preserves single newlines as <br> within one paragraph", () => {
    const { container } = render(<RichRenderer fallbackText={"line one\nline two"} />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("never treats plain text as markup — a literal <script> tag renders as text, not an element", () => {
    const { container } = render(<RichRenderer fallbackText={"<script>alert(1)</script>"} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });

  it("renders nothing (or the empty label) when there is neither doc nor text", () => {
    const { container } = render(<RichRenderer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the empty label when provided and content is empty", () => {
    render(<RichRenderer emptyLabel="No description" />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("falls through to the empty state for a doc that is present but visually empty", () => {
    const emptyDoc: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };
    render(<RichRenderer doc={emptyDoc} emptyLabel="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});

describe("RichRenderer — allowlisted rendering", () => {
  it("renders headings at the requested level", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] }],
    };
    render(<RichRenderer doc={doc} />);
    expect(screen.getByRole("heading", { level: 2, name: "Title" })).toBeInTheDocument();
  });

  it("renders bold/italic/strike/code marks as their respective elements", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "bold", marks: [{ type: "bold" }] },
            { type: "text", text: "italic", marks: [{ type: "italic" }] },
            { type: "text", text: "struck", marks: [{ type: "strike" }] },
            { type: "text", text: "coded", marks: [{ type: "code" }] },
          ],
        },
      ],
    };
    const { container } = render(<RichRenderer doc={doc} />);
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("s")?.textContent).toBe("struck");
    expect(container.querySelector("code")?.textContent).toBe("coded");
  });

  it("renders a safe link with target=_blank and rel hardening", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "click",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    };
    render(<RichRenderer doc={doc} />);
    const link = screen.getByRole("link", { name: "click" });
    // safeHref() round-trips the href through `new URL(...).toString()`,
    // which normalises a bare origin to add the trailing slash.
    expect(link).toHaveAttribute("href", "https://example.com/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("renders task items with a disabled, read-only checkbox reflecting checked state", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [para("done thing")],
            },
          ],
        },
      ],
    };
    const { container } = render(<RichRenderer doc={doc} />);
    const checkbox = container.querySelector("input[type=checkbox]") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
  });

  it("renders an ordered list honouring a custom start attribute", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          attrs: { start: 5 },
          content: [{ type: "listItem", content: [para("fifth")] }],
        },
      ],
    };
    const { container } = render(<RichRenderer doc={doc} />);
    expect(container.querySelector("ol")).toHaveAttribute("start", "5");
  });

  it("renders a mention as a labelled, non-interactive span carrying the user id", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [para("")],
    };
    doc.content = [
      {
        type: "paragraph",
        content: [{ type: "mention", attrs: { id: "u1", label: "Ada Lovelace" } }],
      },
    ];
    const { container } = render(<RichRenderer doc={doc} />);
    const mention = container.querySelector("[data-mention-id='u1']");
    expect(mention?.textContent).toBe("@Ada Lovelace");
    expect(mention?.tagName).toBe("SPAN");
  });

  it("renders an image with a lazy-loaded plain <img>", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://x.example/y.png", alt: "chart" } }],
    };
    const { container } = render(<RichRenderer doc={doc} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://x.example/y.png");
    expect(img).toHaveAttribute("alt", "chart");
    expect(img).toHaveAttribute("loading", "lazy");
  });
});

describe("RichRenderer — XSS and allowlist attack surface", () => {
  it("drops an unknown/unlisted node type entirely rather than rendering it", () => {
    const doc = {
      type: "doc",
      content: [{ type: "script", content: [{ type: "text", text: "alert(1)" }] }],
    } as unknown as RichDoc;
    const { container } = render(<RichRenderer doc={doc} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).not.toContain("alert(1)");
  });

  it("refuses to render a javascript: link — text survives, href does not", () => {
    const doc: RichDoc = {
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
    };
    const { container } = render(<RichRenderer doc={doc} />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toContain("click me");
  });

  it("refuses to render an image with a javascript: src", () => {
    const doc: RichDoc = {
      type: "doc",
      content: [{ type: "image", attrs: { src: "javascript:alert(1)", alt: "x" } }],
    };
    const { container } = render(<RichRenderer doc={doc} />);
    expect(container.querySelector("img")).toBeNull();
  });

  it("ignores attacker-supplied attribute keys that are not in the allowlist (no onClick/style/srcSet survive)", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            src: "https://x.example/y.png",
            onClick: "alert(1)",
            style: "background:url(javascript:alert(1))",
            dangerouslySetInnerHTML: { __html: "<b>x</b>" },
          },
        },
      ],
    } as unknown as RichDoc;
    const { container } = render(<RichRenderer doc={doc} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("onclick")).toBeNull();
    expect(img?.getAttribute("style")).toBeNull();
  });

  it("stops recursing past MAX_DEPTH instead of blowing the stack on a deeply nested doc", () => {
    let node: any = { type: "text", text: "bottom" };
    for (let i = 0; i < 200; i++) {
      node = { type: "blockquote", content: [node] };
    }
    const doc = { type: "doc", content: [node] } as unknown as RichDoc;
    expect(() => render(<RichRenderer doc={doc} />)).not.toThrow();
  });

  it("does not crash when doc is malformed garbage instead of a real document", () => {
    const garbage = { type: "doc", content: "not-an-array" } as unknown as RichDoc;
    expect(() => render(<RichRenderer doc={garbage} />)).not.toThrow();
  });

  it("falls back to fallbackText when doc is not a recognisable RichDoc at all", () => {
    render(<RichRenderer doc={"just a string"} fallbackText="legacy text" />);
    expect(screen.getByText("legacy text")).toBeInTheDocument();
  });
});
