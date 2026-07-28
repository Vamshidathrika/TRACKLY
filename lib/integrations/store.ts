/**
 * Integration persistence for trusted server callers (server components and
 * OAuth callback routes) that have already resolved a siteId themselves.
 *
 * No "use server" directive here on purpose. These functions take a siteId
 * parameter and do NOT re-check membership, so exposing them as server actions
 * would let any authenticated user read another workspace's webhook secrets or
 * repoint its OAuth connection. Callers must resolve siteId from a tenant guard.
 */
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "./crypto";
import type { IntegrationConnection } from "./types";

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

export async function saveOAuthIntegration(
  siteId: string,
  provider: string,
  accessToken: string,
  accountName: string,
  accountAvatar?: string,
  refreshToken?: string,
  metadata?: string
): Promise<void> {
  const encryptedAccess = encryptToken(accessToken);
  const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : null;

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

/**
 * Decrypted access token for server-side provider calls.
 * Never return this to a client — it is the plaintext credential.
 */
export async function getDecryptedToken(siteId: string, provider: string): Promise<string | null> {
  const row = await prisma.siteIntegration.findUnique({
    where: { siteId_provider: { siteId, provider } },
    select: { accessToken: true },
  });
  if (!row?.accessToken) return null;
  return decryptToken(row.accessToken);
}
