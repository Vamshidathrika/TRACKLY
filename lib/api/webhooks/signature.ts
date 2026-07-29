/**
 * HMAC-SHA256 signing for outbound webhooks.
 *
 * Wire format (headers on every delivery POST):
 *
 *   X-Trackly-Event:     issue.created
 *   X-Trackly-Delivery:  <WebhookDelivery id>
 *   X-Trackly-Timestamp: <unix seconds when this attempt was signed>
 *   X-Trackly-Signature: <hex HMAC-SHA256 of "${timestamp}.${rawBody}">
 *
 * The timestamp is signed *inside* the HMAC input (not sent alongside as a
 * separate, unverified field) so an attacker who captures one valid delivery
 * cannot replay it later with a forged fresh-looking timestamp — changing the
 * timestamp changes the signature. A receiver is expected to:
 *
 *   1. Recompute `hmac(secret, "${timestamp}.${body}")` and compare it to the
 *      header with a constant-time comparison (never `===` on secret material).
 *   2. Reject the delivery if `Math.abs(now - timestamp) > REPLAY_WINDOW_SECONDS`,
 *      independently of whether the signature is valid — a valid signature on
 *      a stale timestamp is exactly the replay this exists to catch.
 *
 * This module deliberately does not touch the network or Prisma — signing is
 * a pure function of (secret, timestamp, body), which is what makes it cheap
 * to unit test and safe to call from both the live delivery path
 * (lib/api/webhooks/dispatch.ts) and a "send test event" settings action.
 */
import { createHmac, timingSafeEqual } from "crypto";

export const WEBHOOK_EVENT_HEADER = "X-Trackly-Event";
export const WEBHOOK_DELIVERY_ID_HEADER = "X-Trackly-Delivery";
export const WEBHOOK_TIMESTAMP_HEADER = "X-Trackly-Timestamp";
export const WEBHOOK_SIGNATURE_HEADER = "X-Trackly-Signature";

/** A signature older or newer than this is rejected by a correct receiver. */
export const REPLAY_WINDOW_SECONDS = 5 * 60;

/**
 * Builds the exact string that is HMAC'd. Exported so a receiver's reference
 * implementation (and this module's own tests) construct it identically —
 * any drift here (a different separator, a different field order) breaks
 * every integrator's verification code silently.
 */
export function buildSignedContent(timestampSeconds: number, rawBody: string): string {
  return `${timestampSeconds}.${rawBody}`;
}

/** Hex HMAC-SHA256 of the timestamp-prefixed body, using the endpoint's plaintext secret. */
export function signWebhookPayload(secret: string, timestampSeconds: number, rawBody: string): string {
  return createHmac("sha256", secret).update(buildSignedContent(timestampSeconds, rawBody), "utf8").digest("hex");
}

/**
 * Constant-time verification, for symmetry with the receiver's expected
 * implementation and for this module's own tests. Not used on the delivery
 * path (Trackly only ever signs, it does not receive its own webhooks), but
 * used by `sendTestWebhookEvent` to prove the signature it just generated is
 * self-consistent before it is ever sent.
 */
export function verifyWebhookSignature(
  secret: string,
  timestampSeconds: number,
  rawBody: string,
  signatureHex: string
): boolean {
  const expected = signWebhookPayload(secret, timestampSeconds, rawBody);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signatureHex, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/** Reference check a receiver should also perform — exported so tests cover the exact boundary. */
export function isTimestampFresh(timestampSeconds: number, nowSeconds: number = Math.floor(Date.now() / 1000)): boolean {
  return Math.abs(nowSeconds - timestampSeconds) <= REPLAY_WINDOW_SECONDS;
}
