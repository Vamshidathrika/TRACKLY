/**
 * Typed access to ApiKey / WebhookEndpoint / WebhookDelivery.
 *
 * `.plan/api-schema.prisma` has been merged into `prisma/schema.prisma` and
 * `prisma generate` has run, so these are the real generated delegates —
 * this file is now a thin compatibility shim so the existing call sites in
 * lib/api/auth.ts, lib/api/keys.ts, lib/api/webhooks/{dispatch,store}.ts
 * don't need to change their imports.
 *
 * `isApiSchemaReady()` / the `require_` 503 path is kept for one more
 * deploy cycle in case a stale `@prisma/client` (pre-migration) is still
 * running against a DB that hasn't had `db push` applied — once every
 * environment is confirmed migrated, this indirection can be deleted and
 * call sites can import `prisma.apiKey` etc. directly.
 */
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { apiError } from "./errors";

export type ApiKeyRecord = Prisma.ApiKeyGetPayload<Record<string, never>>;
export type WebhookEndpointRecord = Prisma.WebhookEndpointGetPayload<Record<string, never>>;
export type WebhookDeliveryRecord = Prisma.WebhookDeliveryGetPayload<Record<string, never>>;

/** True once the ApiKey/WebhookEndpoint/WebhookDelivery tables exist in the connected DB. */
export function isApiSchemaReady(): boolean {
  return Boolean(prisma.apiKey && prisma.webhookEndpoint && prisma.webhookDelivery);
}

function require_<T>(delegate: T | undefined, model: string): T {
  if (!delegate) {
    throw apiError.serviceUnavailable(
      `The ${model} model has not been provisioned on this deployment yet.`
    );
  }
  return delegate;
}

export const apiKeyTable = () => require_(prisma.apiKey, "ApiKey");
export const webhookEndpointTable = () => require_(prisma.webhookEndpoint, "WebhookEndpoint");
export const webhookDeliveryTable = () => require_(prisma.webhookDelivery, "WebhookDelivery");
