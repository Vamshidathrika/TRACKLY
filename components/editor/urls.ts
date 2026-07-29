/**
 * URL scheme allowlists for link hrefs and image sources.
 *
 * This is one of the two places rich text content is sanitised (the other is
 * the node/mark allowlist in schema.ts + validate.ts). Both the write-time
 * validator and the render-time walker call these, so an unsafe URL cannot
 * reach the DOM even if it was written straight into the database.
 */

const SAFE_LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
const SAFE_IMAGE_PROTOCOLS = new Set(["http:", "https:"]);

// SVG is excluded on purpose: an <img src="data:image/svg+xml,..."> cannot run
// script in modern browsers, but the same string pasted into any other context
// (an <object>, a CSS url(), a future feature that re-hosts the data URI) can.
// Not worth the surface for a paste-a-screenshot feature.
const SAFE_IMAGE_DATA_URI = /^data:image\/(png|jpeg|jpg|gif|webp|avif);base64,[a-z0-9+/]+=*$/i;

// A data: image inlined into a document; bigger than this and it should have
// gone to blob storage. Also caps how much a single doc can weigh.
const MAX_DATA_URI_LENGTH = 512 * 1024;

/**
 * Returns a safe href, or null if the value must not be rendered as a link.
 *
 * Allows absolute http(s)/mailto URLs and site-relative paths ("/projects/X").
 * Rejects `javascript:`, `data:`, `vbscript:`, `file:`, and protocol-relative
 * "//evil.example" URLs.
 *
 * Scheme smuggling via whitespace or control characters ("java\nscript:") is
 * handled by the URL parser, which strips tab/newline/CR before parsing and
 * lowercases the protocol — so the check below sees the real scheme.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;

  // Site-relative, but never protocol-relative.
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? null : trimmed;
  }

  // Anchor links within the rendered document.
  if (trimmed.startsWith("#")) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Not an absolute URL and not relative in a form we accept. A bare
    // "example.com" is ambiguous enough that refusing it is the right call.
    return null;
  }

  if (!SAFE_LINK_PROTOCOLS.has(parsed.protocol)) return null;
  return parsed.toString();
}

/**
 * Returns a safe image src, or null.
 *
 * Allows http(s) URLs (Vercel Blob uploads land here) and small base64 raster
 * data URIs (an image pasted before its upload resolves).
 */
export function safeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;

  if (trimmed.toLowerCase().startsWith("data:")) {
    if (trimmed.length > MAX_DATA_URI_LENGTH) return null;
    return SAFE_IMAGE_DATA_URI.test(trimmed) ? trimmed : null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? null : trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!SAFE_IMAGE_PROTOCOLS.has(parsed.protocol)) return null;
  return parsed.toString();
}
