"use server";

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type IntegrationConnection = {
  provider: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  accountName?: string | null;
  accountAvatar?: string | null;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
  connectedAt?: Date | null;
  metadata?: string | null;
};

// ─────────────────────────────────────────────────────────────────
// Encryption helpers (AES-256-GCM via INTEGRATION_SECRET env var)
// ─────────────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const secret = process.env.INTEGRATION_SECRET || "trackly-integration-secret-dev-32b";
  return crypto.scryptSync(secret, "trackly-salt", 32);
}

export async function encryptToken(plaintext: string): Promise<string> {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export async function decryptToken(ciphertext: string): Promise<string> {
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

// ─────────────────────────────────────────────────────────────────
// READ: Fetch all connection states for a site
// ─────────────────────────────────────────────────────────────────

export async function getIntegrationConnections(siteId: string): Promise<IntegrationConnection[]> {
  const rows = await prisma.siteIntegration.findMany({
    where: { siteId },
    select: {
      provider: true,
      status: true,
      accountName: true,
      accountAvatar: true,
      webhookSecret: true,
      webhookUrl: true,
      connectedAt: true,
      metadata: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    status: r.status as "CONNECTED" | "DISCONNECTED" | "ERROR",
  }));
}

// ─────────────────────────────────────────────────────────────────
// WRITE: Save/update an API-key-based integration
// ─────────────────────────────────────────────────────────────────

export async function saveApiKeyIntegration(
  provider: string,
  apiKey: string,
  webhookSecret?: string,
  extra?: { accountName?: string; webhookUrl?: string; metadata?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { siteId } = await requireMembership();
    const encryptedKey = await encryptToken(apiKey);

    await prisma.siteIntegration.upsert({
      where: { siteId_provider: { siteId, provider } },
      create: {
        siteId,
        provider,
        status: "CONNECTED",
        accessToken: encryptedKey,
        webhookSecret: webhookSecret || null,
        accountName: extra?.accountName || null,
        webhookUrl: extra?.webhookUrl || null,
        metadata: extra?.metadata || null,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedKey,
        webhookSecret: webhookSecret || null,
        accountName: extra?.accountName || null,
        webhookUrl: extra?.webhookUrl || null,
        metadata: extra?.metadata || null,
        connectedAt: new Date(),
      },
    });

    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─────────────────────────────────────────────────────────────────
// WRITE: Save an OAuth-based integration after callback
// ─────────────────────────────────────────────────────────────────

export async function saveOAuthIntegration(
  siteId: string,
  provider: string,
  accessToken: string,
  accountName: string,
  accountAvatar?: string,
  refreshToken?: string,
  metadata?: string
): Promise<void> {
  const encryptedAccess = await encryptToken(accessToken);
  const encryptedRefresh = refreshToken ? await encryptToken(refreshToken) : null;

  await prisma.siteIntegration.upsert({
    where: { siteId_provider: { siteId, provider } },
    create: {
      siteId,
      provider,
      status: "CONNECTED",
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      accountName,
      accountAvatar: accountAvatar || null,
      metadata: metadata || null,
      connectedAt: new Date(),
    },
    update: {
      status: "CONNECTED",
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      accountName,
      accountAvatar: accountAvatar || null,
      metadata: metadata || null,
      connectedAt: new Date(),
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// DELETE: Disconnect / revoke an integration
// ─────────────────────────────────────────────────────────────────

export async function disconnectIntegration(
  provider: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { siteId } = await requireMembership();

    await prisma.siteIntegration.deleteMany({
      where: { siteId, provider },
    });

    revalidatePath("/settings/integrations");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ─────────────────────────────────────────────────────────────────
// TEST: Validate an API key by hitting the provider's /me endpoint
// ─────────────────────────────────────────────────────────────────

export async function testIntegrationConnection(
  provider: string,
  apiKey: string
): Promise<{ success: boolean; accountName?: string; error?: string }> {
  try {
    switch (provider.toUpperCase()) {
      case "SENTRY": {
        const res = await fetch("https://sentry.io/api/0/", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Sentry auth token" };
        return { success: true, accountName: "Sentry" };
      }
      case "DATADOG": {
        // Datadog uses api-key + app-key; we validate with the validate endpoint
        const [ddApiKey, ddAppKey] = apiKey.split("||");
        const res = await fetch("https://api.datadoghq.com/api/v1/validate", {
          headers: {
            "DD-API-KEY": ddApiKey || apiKey,
            "DD-APPLICATION-KEY": ddAppKey || "",
          },
        });
        if (!res.ok) return { success: false, error: "Invalid Datadog API key" };
        return { success: true, accountName: "Datadog" };
      }
      case "VERCEL": {
        const res = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Vercel token" };
        const data = await res.json();
        return { success: true, accountName: data.user?.name || data.user?.username || "Vercel" };
      }
      case "ZENDESK": {
        // API key format: subdomain||email/token:apikey
        const [subdomain] = apiKey.split("||");
        if (!subdomain) return { success: false, error: "Format: subdomain||email/token:apitoken" };
        const creds = apiKey.split("||")[1] || "";
        const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
          headers: { Authorization: `Basic ${Buffer.from(creds).toString("base64")}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Zendesk credentials" };
        const data = await res.json();
        return { success: true, accountName: data.user?.name || subdomain };
      }
      case "INTERCOM": {
        const res = await fetch("https://api.intercom.io/me", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        });
        if (!res.ok) return { success: false, error: "Invalid Intercom token" };
        const data = await res.json();
        return { success: true, accountName: data.app?.name || "Intercom" };
      }
      default:
        // For webhook-only providers (Sentry inbound, Zapier, etc.) just mark as connected
        return { success: true, accountName: provider };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Connection test failed" };
  }
}

// ─────────────────────────────────────────────────────────────────
// UTIL: Generate a cryptographically secure webhook signing secret
// ─────────────────────────────────────────────────────────────────

export async function generateWebhookSecret(
  provider: string
): Promise<{ secret: string }> {
  const secret = `whsec_${provider.toLowerCase()}_${crypto.randomBytes(20).toString("hex")}`;
  return { secret };
}

// ─────────────────────────────────────────────────────────────────
// UTIL: Get decrypted access token (server-only — never sent to client)
// ─────────────────────────────────────────────────────────────────

export async function getDecryptedToken(siteId: string, provider: string): Promise<string | null> {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId, provider } },
    select: { accessToken: true },
  });
  if (!row?.accessToken) return null;
  return await decryptToken(row.accessToken);
}
