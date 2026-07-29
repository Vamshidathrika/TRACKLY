"use server";

/**
 * CLIENT-CALLABLE ACTIONS ONLY — see lib/api/keys.ts's header comment for why
 * `siteId` and the acting user's identity are always resolved here, from
 * `requireMembership()`, and never accepted as a parameter from the client.
 */
import { revalidatePath } from "next/cache";
import { requireMembership } from "@/lib/tenant";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api/keys";
import type { ApiKeySummary, CreateApiKeyInput } from "@/lib/api/keys";
import { API_SCOPES, SCOPE_LABELS, SCOPE_PRESETS } from "@/lib/api/scopes";
import type { ApiScope } from "@/lib/api/scopes";

export type { ApiKeySummary };
export { API_SCOPES, SCOPE_LABELS, SCOPE_PRESETS };

export async function listMyApiKeysAction(): Promise<{
  keys: ApiKeySummary[];
  isWorkspaceAdmin: boolean;
  currentUserId: string;
}> {
  const { siteId, userId, role } = await requireMembership();
  const isWorkspaceAdmin = role === "ADMIN";
  const keys = await listApiKeys(siteId, userId, isWorkspaceAdmin);
  return { keys, isWorkspaceAdmin, currentUserId: userId };
}

export async function createApiKeyAction(
  input: CreateApiKeyInput
): Promise<{ success: true; key: ApiKeySummary; token: string } | { success: false; error: string }> {
  try {
    const { siteId, userId } = await requireMembership();
    const result = await createApiKey(siteId, userId, {
      name: input.name,
      scopes: (input.scopes ?? []).filter((s): s is ApiScope => (API_SCOPES as readonly string[]).includes(s)),
      expiresInDays: input.expiresInDays ?? null,
      rateLimitPerMinute: input.rateLimitPerMinute,
    });
    revalidatePath("/settings/api-keys");
    return { success: true, key: result.key, token: result.token };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

export async function revokeApiKeyAction(keyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { siteId, userId, role } = await requireMembership();
    await revokeApiKey(siteId, keyId, userId, role === "ADMIN");
    revalidatePath("/settings/api-keys");
    return { success: true };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

function friendlyError(e: unknown): string {
  if (!(e instanceof Error)) return "Something went wrong.";
  const known: Record<string, string> = {
    NAME_REQUIRED: "Give this key a name.",
    AT_LEAST_ONE_SCOPE_REQUIRED: "Select at least one permission scope.",
    API_KEY_NOT_FOUND: "That key no longer exists.",
    FORBIDDEN_NOT_KEY_OWNER: "You can only revoke your own keys.",
    API_SCHEMA_NOT_READY:
      "API key support is not provisioned on this deployment yet (ApiKey model pending — see .plan/api-schema.prisma).",
  };
  return known[e.message] ?? "Something went wrong.";
}
