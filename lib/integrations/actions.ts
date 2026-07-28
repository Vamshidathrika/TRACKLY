"use server";

/**
 * CLIENT-CALLABLE ACTIONS ONLY.
 *
 * Every export in a "use server" file is a public endpoint reachable by any
 * authenticated user with a crafted POST — the client component that imports
 * this file cannot restrict that. So each export below must resolve its own
 * siteId from a tenant guard and must never accept one from the caller.
 *
 * Crypto helpers live in ./crypto, and siteId-parameterised persistence lives
 * in ./store. Both are plain server modules, deliberately not actions.
 */

import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { encryptToken } from "./crypto";
import type { IntegrationConnection } from "./types";

// ─────────────────────────────────────────────────────────────────
// READ: Connection states for the CALLER'S OWN site
// ─────────────────────────────────────────────────────────────────

export async function getMyIntegrationConnections(): Promise<IntegrationConnection[]> {
  const { siteId } = await requireMembership();
  const { getIntegrationConnections } = await import("./store");
  return getIntegrationConnections(siteId);
}

// ─────────────────────────────────────────────────────────────────
// WRITE: Save/update an API-key-based integration
// ─────────────────────────────────────────────────────────────────

export async function saveApiKeyIntegration(
  provider: string,
  apiKey: string,
  webhookSecret?: string,
  extra?: { accountName?: string; accountAvatar?: string; webhookUrl?: string; metadata?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { siteId } = await requireMembership();
    const encryptedKey = encryptToken(apiKey);

    await prisma.siteIntegration.upsert({
      where: { siteId_provider: { siteId, provider } },
      create: {
        siteId,
        provider,
        status: "CONNECTED",
        accessToken: encryptedKey,
        webhookSecret: webhookSecret || null,
        accountName: extra?.accountName || null,
        accountAvatar: extra?.accountAvatar || null,
        webhookUrl: extra?.webhookUrl || null,
        metadata: extra?.metadata || null,
        connectedAt: new Date(),
      },
      update: {
        status: "CONNECTED",
        accessToken: encryptedKey,
        webhookSecret: webhookSecret || null,
        accountName: extra?.accountName || null,
        accountAvatar: extra?.accountAvatar || null,
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
): Promise<{ success: boolean; accountName?: string; accountAvatar?: string; error?: string }> {
  try {
    // Makes outbound requests with a caller-supplied credential — gate it so it
    // cannot be driven by an unauthenticated caller as a request relay.
    await requireMembership();
    const cleanKey = apiKey.trim();

    switch (provider.toUpperCase()) {
      case "GITHUB": {
        const res = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            "User-Agent": "Trackly-App",
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return { success: false, error: errData.message || "Invalid GitHub token or missing scopes" };
        }
        const data = await res.json();
        return {
          success: true,
          accountName: data.name ? `${data.name} (@${data.login})` : `@${data.login}`,
          accountAvatar: data.avatar_url,
        };
      }

      case "GITLAB": {
        const res = await fetch("https://gitlab.com/api/v4/user", {
          headers: { "PRIVATE-TOKEN": cleanKey },
        });
        if (!res.ok) {
          const resBearer = await fetch("https://gitlab.com/api/v4/user", {
            headers: { Authorization: `Bearer ${cleanKey}` },
          });
          if (!resBearer.ok) return { success: false, error: "Invalid GitLab Personal Access Token" };
          const dataBearer = await resBearer.json();
          return {
            success: true,
            accountName: dataBearer.name ? `${dataBearer.name} (@${dataBearer.username})` : `@${dataBearer.username}`,
            accountAvatar: dataBearer.avatar_url,
          };
        }
        const data = await res.json();
        return {
          success: true,
          accountName: data.name ? `${data.name} (@${data.username})` : `@${data.username}`,
          accountAvatar: data.avatar_url,
        };
      }

      case "BITBUCKET": {
        const res = await fetch("https://api.bitbucket.org/2.0/user", {
          headers: { Authorization: `Bearer ${cleanKey}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Bitbucket access token" };
        const data = await res.json();
        return {
          success: true,
          accountName: data.display_name || `@${data.username}`,
          accountAvatar: data.links?.avatar?.href,
        };
      }

      case "VERCEL": {
        const res = await fetch("https://api.vercel.com/v2/user", {
          headers: { Authorization: `Bearer ${cleanKey}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Vercel API Token" };
        const data = await res.json();
        return {
          success: true,
          accountName: data.user?.name || `@${data.user?.username}` || "Vercel Account",
          accountAvatar: data.user?.avatar ? `https://avatar.vercel.sh/${data.user.username}` : undefined,
        };
      }

      case "SENTRY": {
        const res = await fetch("https://sentry.io/api/0/users/me/", {
          headers: { Authorization: `Bearer ${cleanKey}` },
        });
        if (!res.ok) {
          const resFallback = await fetch("https://sentry.io/api/0/", {
            headers: { Authorization: `Bearer ${cleanKey}` },
          });
          if (!resFallback.ok) return { success: false, error: "Invalid Sentry auth token" };
          return { success: true, accountName: "Sentry Integration" };
        }
        const data = await res.json();
        return { success: true, accountName: data.email || data.username || "Sentry Account" };
      }

      case "DATADOG": {
        const [ddApiKey, ddAppKey] = cleanKey.split("||");
        const res = await fetch("https://api.datadoghq.com/api/v1/validate", {
          headers: {
            "DD-API-KEY": ddApiKey || cleanKey,
            "DD-APPLICATION-KEY": ddAppKey || "",
          },
        });
        if (!res.ok) return { success: false, error: "Invalid Datadog API / App Key" };
        return { success: true, accountName: "Datadog Workspace" };
      }

      case "SLACK": {
        const res = await fetch("https://slack.com/api/auth.test", {
          headers: { Authorization: `Bearer ${cleanKey}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Slack token" };
        const data = await res.json();
        if (!data.ok) return { success: false, error: data.error || "Slack token invalid" };
        return { success: true, accountName: `${data.team} (${data.user})` };
      }

      case "DISCORD": {
        if (!cleanKey.startsWith("https://discord.com/api/webhooks/")) {
          return { success: false, error: "Must be a valid Discord Webhook URL starting with https://discord.com/api/webhooks/" };
        }
        const res = await fetch(cleanKey);
        if (!res.ok) return { success: false, error: "Discord Webhook URL invalid or not found" };
        const data = await res.json();
        return { success: true, accountName: `#${data.name || "Discord Channel"}` };
      }

      case "FIGMA": {
        const res = await fetch("https://api.figma.com/v1/me", {
          headers: { "X-Figma-Token": cleanKey },
        });
        if (!res.ok) return { success: false, error: "Invalid Figma Personal Access Token" };
        const data = await res.json();
        return {
          success: true,
          accountName: data.handle || data.email || "Figma Account",
          accountAvatar: data.img_url,
        };
      }

      case "LOOM": {
        if (cleanKey.length < 10) return { success: false, error: "Loom API Key must be at least 10 characters" };
        return { success: true, accountName: "Loom Workspace" };
      }

      case "MIRO": {
        const res = await fetch("https://api.miro.com/v1/users/me", {
          headers: { Authorization: `Bearer ${cleanKey}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Miro Access Token" };
        const data = await res.json();
        return { success: true, accountName: data.name || "Miro Account" };
      }

      case "ZENDESK": {
        const [subdomain] = cleanKey.split("||");
        if (!subdomain) return { success: false, error: "Format: subdomain||email/token:apitoken" };
        const creds = cleanKey.split("||")[1] || "";
        const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me.json`, {
          headers: { Authorization: `Basic ${Buffer.from(creds).toString("base64")}` },
        });
        if (!res.ok) return { success: false, error: "Invalid Zendesk subdomain or API token" };
        const data = await res.json();
        return { success: true, accountName: data.user?.name || subdomain };
      }

      case "INTERCOM": {
        const res = await fetch("https://api.intercom.io/me", {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            Accept: "application/json",
          },
        });
        if (!res.ok) return { success: false, error: "Invalid Intercom token" };
        const data = await res.json();
        return { success: true, accountName: data.app?.name || data.name || "Intercom App" };
      }

      default:
        return { success: true, accountName: `${provider} Account` };
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
  await requireMembership();
  const secret = `whsec_${provider.toLowerCase()}_${crypto.randomBytes(20).toString("hex")}`;
  return { secret };
}
