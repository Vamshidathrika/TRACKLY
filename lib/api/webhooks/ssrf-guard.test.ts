import { describe, it, expect, vi, beforeEach } from "vitest";

const dnsLookupMock = vi.fn();
vi.mock("dns/promises", () => ({
  default: { lookup: (...args: unknown[]) => dnsLookupMock(...args) },
  lookup: (...args: unknown[]) => dnsLookupMock(...args),
}));

import { assertSafeWebhookUrlShape, assertSafeWebhookUrl, UnsafeWebhookUrlError } from "./ssrf-guard";

beforeEach(() => {
  dnsLookupMock.mockReset();
});

describe("assertSafeWebhookUrlShape", () => {
  it("accepts a well-formed public https URL", () => {
    expect(() => assertSafeWebhookUrlShape("https://hooks.example.com/trackly")).not.toThrow();
  });

  it("rejects a garbage string", () => {
    expect(() => assertSafeWebhookUrlShape("not a url at all")).toThrow(UnsafeWebhookUrlError);
  });

  it.each(["http://example.com", "ftp://example.com", "file:///etc/passwd", "gopher://example.com"])(
    "rejects non-https scheme: %s",
    (url) => {
      expect(() => assertSafeWebhookUrlShape(url)).toThrow(UnsafeWebhookUrlError);
    }
  );

  it("rejects embedded credentials", () => {
    expect(() => assertSafeWebhookUrlShape("https://user:pass@example.com/hook")).toThrow(UnsafeWebhookUrlError);
  });

  it.each(["localhost", "foo.localhost", "bar.local", "svc.internal", "x.arpa", "metadata", "metadata.google.internal"])(
    "rejects the blocked hostname: %s",
    (host) => {
      expect(() => assertSafeWebhookUrlShape(`https://${host}/hook`)).toThrow(UnsafeWebhookUrlError);
    }
  );

  it.each([
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254", // cloud metadata address — the canonical SSRF target
    "0.0.0.0",
    "100.64.0.1", // CGNAT
  ])("rejects a literal reserved/private IPv4 host: %s", (ip) => {
    expect(() => assertSafeWebhookUrlShape(`https://${ip}/hook`)).toThrow(UnsafeWebhookUrlError);
  });

  it("rejects the literal IPv6 loopback address", () => {
    expect(() => assertSafeWebhookUrlShape("https://[::1]/hook")).toThrow(UnsafeWebhookUrlError);
  });

  it("rejects an IPv4-mapped IPv6 loopback (the classic normalization bypass)", () => {
    expect(() => assertSafeWebhookUrlShape("https://[::ffff:127.0.0.1]/hook")).toThrow(UnsafeWebhookUrlError);
  });

  it("accepts a literal public IPv4 address", () => {
    expect(() => assertSafeWebhookUrlShape("https://93.184.216.34/hook")).not.toThrow();
  });
});

describe("assertSafeWebhookUrl (DNS-resolving)", () => {
  it("accepts a hostname whose every resolved address is public", async () => {
    dnsLookupMock.mockResolvedValue([{ address: "93.184.216.34" }]);
    const { resolvedAddresses } = await assertSafeWebhookUrl("https://hooks.example.com/trackly");
    expect(resolvedAddresses).toEqual(["93.184.216.34"]);
  });

  it("rejects when the hostname resolves to ANY private address, not just the first", async () => {
    dnsLookupMock.mockResolvedValue([{ address: "93.184.216.34" }, { address: "10.0.0.1" }]);
    await expect(assertSafeWebhookUrl("https://hooks.example.com/trackly")).rejects.toThrow(UnsafeWebhookUrlError);
  });

  it("rejects the cloud-metadata address even when it is only the resolved IP, not the literal host", async () => {
    dnsLookupMock.mockResolvedValue([{ address: "169.254.169.254" }]);
    await expect(assertSafeWebhookUrl("https://sneaky.example.com/hook")).rejects.toThrow(UnsafeWebhookUrlError);
  });

  it("rejects when DNS resolution fails", async () => {
    dnsLookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertSafeWebhookUrl("https://does-not-resolve.example.com/hook")).rejects.toThrow(
      UnsafeWebhookUrlError
    );
  });

  it("rejects when DNS resolves to zero addresses", async () => {
    dnsLookupMock.mockResolvedValue([]);
    await expect(assertSafeWebhookUrl("https://empty.example.com/hook")).rejects.toThrow(UnsafeWebhookUrlError);
  });

  it("never calls DNS for a literal IP host — the shape check alone decides it", async () => {
    await expect(assertSafeWebhookUrl("https://127.0.0.1/hook")).rejects.toThrow(UnsafeWebhookUrlError);
    expect(dnsLookupMock).not.toHaveBeenCalled();
  });

  it("rejects before DNS runs at all for an unsafe scheme", async () => {
    await expect(assertSafeWebhookUrl("http://example.com/hook")).rejects.toThrow(UnsafeWebhookUrlError);
    expect(dnsLookupMock).not.toHaveBeenCalled();
  });
});
