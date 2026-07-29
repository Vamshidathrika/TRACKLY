import { describe, it, expect } from "vitest";
import {
  buildSignedContent,
  signWebhookPayload,
  verifyWebhookSignature,
  isTimestampFresh,
  REPLAY_WINDOW_SECONDS,
} from "./signature";

const SECRET = "whsec_test_secret_value";

describe("buildSignedContent", () => {
  it("joins timestamp and body with a single dot, matching the documented wire format", () => {
    expect(buildSignedContent(1700000000, '{"a":1}')).toBe('1700000000.{"a":1}');
  });
});

describe("signWebhookPayload / verifyWebhookSignature", () => {
  it("a signature verifies against the exact (secret, timestamp, body) it was made from", () => {
    const body = JSON.stringify({ event: "issue.created" });
    const ts = 1700000000;
    const sig = signWebhookPayload(SECRET, ts, body);
    expect(verifyWebhookSignature(SECRET, ts, body, sig)).toBe(true);
  });

  it("is deterministic — same inputs always produce the same signature", () => {
    const body = "{}";
    expect(signWebhookPayload(SECRET, 1, body)).toBe(signWebhookPayload(SECRET, 1, body));
  });

  it("fails verification if the body is altered after signing", () => {
    const ts = 1700000000;
    const sig = signWebhookPayload(SECRET, ts, "original body");
    expect(verifyWebhookSignature(SECRET, ts, "tampered body", sig)).toBe(false);
  });

  it("fails verification if the timestamp is altered — the timestamp is signed, not a free-standing field", () => {
    const body = "{}";
    const sig = signWebhookPayload(SECRET, 1700000000, body);
    expect(verifyWebhookSignature(SECRET, 1700000999, body, sig)).toBe(false);
  });

  it("fails verification against a different secret", () => {
    const body = "{}";
    const ts = 1700000000;
    const sig = signWebhookPayload(SECRET, ts, body);
    expect(verifyWebhookSignature("a-different-secret", ts, body, sig)).toBe(false);
  });

  it("rejects a signature of the wrong length rather than throwing", () => {
    expect(verifyWebhookSignature(SECRET, 1700000000, "{}", "not-hex-and-too-short")).toBe(false);
  });

  it("rejects an empty signature", () => {
    expect(verifyWebhookSignature(SECRET, 1700000000, "{}", "")).toBe(false);
  });
});

describe("isTimestampFresh", () => {
  const now = 1_700_000_000;

  it("accepts a timestamp exactly at the boundary of the replay window", () => {
    expect(isTimestampFresh(now - REPLAY_WINDOW_SECONDS, now)).toBe(true);
    expect(isTimestampFresh(now + REPLAY_WINDOW_SECONDS, now)).toBe(true);
  });

  it("rejects a timestamp one second past the replay window in either direction", () => {
    expect(isTimestampFresh(now - REPLAY_WINDOW_SECONDS - 1, now)).toBe(false);
    expect(isTimestampFresh(now + REPLAY_WINDOW_SECONDS + 1, now)).toBe(false);
  });

  it("accepts the current instant", () => {
    expect(isTimestampFresh(now, now)).toBe(true);
  });
});
