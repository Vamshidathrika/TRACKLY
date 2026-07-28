/**
 * AES-256-GCM helpers for integration tokens at rest.
 *
 * This module deliberately has NO "use server" directive. It used to live in
 * ./actions.ts, which does — that made `encryptToken`/`decryptToken` exported
 * server actions, i.e. unauthenticated endpoints any client could POST to.
 * A client-callable `decryptToken` is a decryption oracle: it turns the
 * ciphertext column into plaintext for anyone who can read a row.
 *
 * Import this only from server code. Never from a "use server" file's exports.
 */
import crypto from "crypto";

const DEV_FALLBACK_SECRET = "trackly-integration-secret-dev-32b";

function getEncryptionKey(): Buffer {
  const secret = process.env.INTEGRATION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "INTEGRATION_SECRET is not set. Integration tokens would be encrypted under a " +
          "key that is published in the source tree. Generate one with `openssl rand -base64 32`."
      );
    }
    return crypto.scryptSync(DEV_FALLBACK_SECRET, "trackly-salt", 32);
  }

  return crypto.scryptSync(secret, "trackly-salt", 32);
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptToken(ciphertext: string): string {
  try {
    const [ivHex, tagHex, encHex] = ciphertext.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return "";
  }
}
