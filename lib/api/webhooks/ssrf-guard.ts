/**
 * SSRF guard for outbound webhook URLs.
 *
 * A webhook endpoint URL is attacker-supplied in the sense that mounts: any
 * workspace admin can type any URL, and — if this workspace's admin account
 * is itself compromised, or a lower-trust integration is ever allowed to
 * register endpoints — an attacker gets a server-side HTTP client that will
 * fire signed, authenticated-looking POSTs at whatever address they choose,
 * on a schedule, with retries. Unchecked, that is a standing SSRF primitive
 * against this deployment's own internal network and its cloud metadata
 * endpoint (`169.254.169.254`, which on most clouds hands out IAM
 * credentials to whoever can reach it).
 *
 * `assertSafeWebhookUrl` is called twice, not once:
 *   1. At registration time (lib/api/webhooks/store.ts) — reject obviously
 *      bad input immediately, with a message the admin can act on.
 *   2. Before every delivery attempt (lib/api/webhooks/dispatch.ts) — DNS can
 *      change after registration ("DNS rebinding" as a *slow*, not
 *      microsecond-timed, attack: register a hostname that resolves
 *      publicly, wait for it to pass review, then repoint it at an internal
 *      address). Re-checking on every attempt closes that window; it does
 *      NOT close the much narrower window between this check and the TCP
 *      connect `fetch()` performs microseconds later — see `.plan/api-deps.md`
 *      ("Known residual risk") for why that one is accepted rather than
 *      silently ignored, and what would close it.
 *
 * What this rejects, deliberately over-inclusive:
 *   - Non-`https:` schemes (no `http:`, `file:`, `gopher:`, `ftp:`, …).
 *   - Credentials embedded in the URL (`https://user:pass@host/`).
 *   - Literal IP-address hosts, and every hostname's *resolved* addresses,
 *     that fall in a loopback / private / link-local / CGNAT / reserved /
 *     multicast range — IPv4 and IPv6, including IPv4-mapped IPv6
 *     (`::ffff:127.0.0.1`) and the IPv6 cloud-metadata address some
 *     platforms use.
 *   - A bare `localhost` / `*.localhost` / `*.local` hostname, rejected
 *     before DNS even runs (some resolvers don't resolve it at all, and
 *     `/etc/hosts` on the server itself is not a boundary worth trusting).
 *
 * What this does NOT do: follow redirects. The HTTP call in
 * lib/api/webhooks/dispatch.ts uses `redirect: "manual"` for exactly this
 * reason — a validated public URL that 302s to `http://169.254.169.254/` is
 * the single most common real-world SSRF bypass, and the fix lives at the
 * fetch call, not here, because this module never sees a redirect.
 */
import { isIP } from "net";
import { lookup as dnsLookup } from "dns/promises";

export class UnsafeWebhookUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeWebhookUrlError";
  }
}

const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal", ".arpa"];
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata", "metadata.google.internal"]);

/** Scheme + shape checks that need no network access. Exported for cheap, deterministic tests. */
export function assertSafeWebhookUrlShape(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeWebhookUrlError("Not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new UnsafeWebhookUrlError("Webhook URLs must use https://.");
  }
  if (url.username || url.password) {
    throw new UnsafeWebhookUrlError("Webhook URLs may not embed credentials.");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_HOSTNAME_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new UnsafeWebhookUrlError("This hostname is not reachable from the public internet and cannot be used.");
  }

  const literalIpVersion = isIP(hostname);
  if (literalIpVersion !== 0 && isReservedAddress(hostname)) {
    throw new UnsafeWebhookUrlError(
      "That address resolves to a private or reserved network range and cannot be used."
    );
  }

  return url;
}

/**
 * Full check including DNS resolution. Throws `UnsafeWebhookUrlError` (safe
 * to surface to the admin who is registering the endpoint) on any rejection.
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<{ url: URL; resolvedAddresses: string[] }> {
  const url = assertSafeWebhookUrlShape(rawUrl);
  const hostname = url.hostname;

  // A literal IP host has nothing to resolve — the shape check already
  // covers it, but re-run the same range check for defense in depth in case
  // a future edit reorders these two functions.
  if (isIP(hostname) !== 0) {
    if (isReservedAddress(hostname)) {
      throw new UnsafeWebhookUrlError(
        "That address resolves to a private or reserved network range and cannot be used."
      );
    }
    return { url, resolvedAddresses: [hostname] };
  }

  let records: { address: string }[];
  try {
    records = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeWebhookUrlError("That hostname could not be resolved.");
  }

  if (records.length === 0) {
    throw new UnsafeWebhookUrlError("That hostname could not be resolved.");
  }

  const unsafe = records.find((r) => isReservedAddress(r.address));
  if (unsafe) {
    throw new UnsafeWebhookUrlError(
      "That hostname resolves to a private or reserved network range and cannot be used."
    );
  }

  return { url, resolvedAddresses: records.map((r) => r.address) };
}

// ─── Address range checks ───────────────────────────────────────────────────

function isReservedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isReservedIPv4(address);
  if (version === 6) return isReservedIPv6(address);
  return true; // Not a parseable IP at all — refuse rather than guess.
}

function isReservedIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8 — "this network"
  if (a === 10) return true; // 10.0.0.0/8 — RFC 1918
  if (a === 127) return true; // 127.0.0.0/8 — loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 — CGNAT
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 — link-local, incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 — RFC 1918
  if (a === 192 && b === 0 && parts[2] === 0) return true; // 192.0.0.0/24 — IETF protocol assignments
  if (a === 192 && b === 0 && parts[2] === 2) return true; // 192.0.2.0/24 — TEST-NET-1
  if (a === 192 && b === 88 && parts[2] === 99) return true; // 192.88.99.0/24 — 6to4 relay anycast
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 — RFC 1918
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 — benchmarking
  if (a === 198 && b === 51 && parts[2] === 100) return true; // 198.51.100.0/24 — TEST-NET-2
  if (a === 203 && b === 0 && parts[2] === 113) return true; // 203.0.113.0/24 — TEST-NET-3
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + 255.255.255.255 broadcast

  return false;
}

function isReservedIPv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::" || normalized === "::1") return true; // unspecified / loopback

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) addresses —
  // the classic normalization bypass. Extract the embedded IPv4 and recurse.
  const mappedMatch = /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(normalized);
  if (mappedMatch) return isReservedIPv4(mappedMatch[1]);

  if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true; // link-local fe80::/10
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // link-local fe80::/10 (remaining range)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 — unique local
  if (normalized.startsWith("ff")) return true; // ff00::/8 — multicast
  if (normalized.startsWith("2001:db8:")) return true; // documentation range
  if (normalized === "64:ff9b::1" || normalized.startsWith("64:ff9b:1:")) return true; // NAT64 well-known / local-use

  return false;
}
