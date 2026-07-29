import { describe, it, expect } from "vitest";
import { safeHref, safeImageSrc } from "./urls";

describe("safeHref", () => {
  it("allows http, https and mailto", () => {
    expect(safeHref("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeHref("http://example.com/")).toBe("http://example.com/");
    expect(safeHref("mailto:dev@trackly.dev")).toBe("mailto:dev@trackly.dev");
  });

  it("allows site-relative paths and anchors", () => {
    expect(safeHref("/projects/DEMO/issues/DEMO-1")).toBe("/projects/DEMO/issues/DEMO-1");
    expect(safeHref("#section")).toBe("#section");
  });

  it("rejects javascript: in every disguise", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JavaScript:alert(1)")).toBeNull();
    expect(safeHref("  javascript:alert(1)  ")).toBeNull();
    // The URL parser strips tabs/newlines before reading the scheme, so this
    // classic filter bypass still resolves to javascript: and is caught.
    expect(safeHref("java\nscript:alert(1)")).toBeNull();
    expect(safeHref("java\tscript:alert(1)")).toBeNull();
  });

  it("rejects other dangerous schemes", () => {
    expect(safeHref("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(safeHref("vbscript:msgbox(1)")).toBeNull();
    expect(safeHref("file:///etc/passwd")).toBeNull();
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeHref("//evil.example/x")).toBeNull();
  });

  it("rejects non-strings, blanks and bare hostnames", () => {
    expect(safeHref(undefined)).toBeNull();
    expect(safeHref(null)).toBeNull();
    expect(safeHref(42)).toBeNull();
    expect(safeHref({ href: "https://example.com" })).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeHref("   ")).toBeNull();
    expect(safeHref("example.com")).toBeNull();
  });
});

describe("safeImageSrc", () => {
  it("allows https blob URLs", () => {
    const url = "https://abc.public.blob.vercel-storage.com/attachments/1/shot.png";
    expect(safeImageSrc(url)).toBe(url);
  });

  it("allows small base64 raster data URIs", () => {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    expect(safeImageSrc(png)).toBe(png);
  });

  it("rejects svg data URIs", () => {
    expect(safeImageSrc("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
  });

  it("rejects non-image data URIs", () => {
    expect(safeImageSrc("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
  });

  it("rejects oversized data URIs", () => {
    const huge = `data:image/png;base64,${"A".repeat(600_000)}`;
    expect(safeImageSrc(huge)).toBeNull();
  });

  it("rejects javascript: and mailto:", () => {
    expect(safeImageSrc("javascript:alert(1)")).toBeNull();
    expect(safeImageSrc("mailto:dev@trackly.dev")).toBeNull();
  });
});
