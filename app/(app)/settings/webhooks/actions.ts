"use server";

/**
 * CLIENT-CALLABLE ACTIONS ONLY. Every export here requires `requireAdmin()`
 * — see lib/api/webhooks/store.ts's header comment for why webhook
 * management is workspace-ADMIN-only rather than open to any member the way
 * lib/api/keys.ts's personal tokens are: a webhook secret can forge a
 * validly-signed event for anything downstream trusts, and one endpoint
 * receives every matching event for the whole site.
 */
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/tenant";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  listRecentDeliveries,
  listWebhookEndpoints,
  rotateWebhookSecret,
  sendTestWebhookEvent,
  updateWebhookEndpoint,
} from "@/lib/api/webhooks/store";
import type { UpdateWebhookEndpointInput, WebhookEndpointSummary } from "@/lib/api/webhooks/store";
import { WEBHOOK_EVENTS } from "@/lib/api/schemas";
import type { WebhookEndpointInput, WebhookEvent } from "@/lib/api/schemas";

export type { WebhookEndpointSummary };

export async function listMyWebhooksAction(): Promise<WebhookEndpointSummary[]> {
  const { siteId } = await requireAdmin();
  return listWebhookEndpoints(siteId);
}

export async function createWebhookAction(
  input: WebhookEndpointInput
): Promise<{ success: true; endpoint: WebhookEndpointSummary; secret: string } | { success: false; error: string }> {
  try {
    const { siteId, userId } = await requireAdmin();
    const result = await createWebhookEndpoint(siteId, userId, input);
    revalidatePath("/settings/webhooks");
    return { success: true, endpoint: result.endpoint, secret: result.secret };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

export async function updateWebhookAction(
  endpointId: string,
  input: UpdateWebhookEndpointInput
): Promise<{ success: true; endpoint: WebhookEndpointSummary } | { success: false; error: string }> {
  try {
    const { siteId } = await requireAdmin();
    const endpoint = await updateWebhookEndpoint(siteId, endpointId, input);
    revalidatePath("/settings/webhooks");
    return { success: true, endpoint };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

export async function deleteWebhookAction(endpointId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { siteId } = await requireAdmin();
    await deleteWebhookEndpoint(siteId, endpointId);
    revalidatePath("/settings/webhooks");
    return { success: true };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

export async function rotateWebhookSecretAction(
  endpointId: string
): Promise<{ success: true; secret: string } | { success: false; error: string }> {
  try {
    const { siteId } = await requireAdmin();
    const secret = await rotateWebhookSecret(siteId, endpointId);
    revalidatePath("/settings/webhooks");
    return { success: true, secret };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

export async function sendTestWebhookAction(
  endpointId: string
): Promise<{ success: boolean; status: number | null; error: string | null }> {
  try {
    const { siteId } = await requireAdmin();
    return await sendTestWebhookEvent(siteId, endpointId);
  } catch (e) {
    return { success: false, status: null, error: friendlyError(e) };
  }
}

export async function listWebhookDeliveriesAction(endpointId: string) {
  const { siteId } = await requireAdmin();
  const deliveries = await listRecentDeliveries(siteId, endpointId);
  // Payload is omitted from the settings-UI view — delivery status and
  // timing is what an admin needs to debug connectivity; the event body is
  // already visible to them as the issue/comment it was derived from.
  return deliveries.map((d) => ({
    id: d.id,
    event: d.event,
    status: d.status,
    attempt: d.attempt,
    maxAttempts: d.maxAttempts,
    responseStatus: d.responseStatus,
    errorCode: d.errorCode,
    nextAttemptAt: d.nextAttemptAt,
    deliveredAt: d.deliveredAt,
    createdAt: d.createdAt,
  }));
}

function friendlyError(e: unknown): string {
  if (e && typeof e === "object" && "name" in e) {
    const name = (e as { name?: string }).name;
    if (name === "UnsafeWebhookUrlError") return (e as Error).message;
    if (name === "ZodError") {
      const issues = (e as { issues?: { message: string }[] }).issues;
      return issues?.[0]?.message ?? "Invalid input.";
    }
  }
  if (!(e instanceof Error)) return "Something went wrong.";
  const known: Record<string, string> = {
    WEBHOOK_ENDPOINT_NOT_FOUND: "That webhook endpoint no longer exists.",
    INVALID_EVENT: "One or more selected events are not recognized.",
    API_SCHEMA_NOT_READY:
      "Webhook support is not provisioned on this deployment yet (WebhookEndpoint model pending — see .plan/api-schema.prisma).",
  };
  return known[e.message] ?? e.message ?? "Something went wrong.";
}
