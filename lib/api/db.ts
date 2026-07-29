/**
 * Typed access to the three models this feature needs that do NOT yet exist in
 * `prisma/schema.prisma`.
 *
 * `prisma/schema.prisma` is owned by another agent for the duration of this
 * work, so `ApiKey`, `WebhookEndpoint` and `WebhookDelivery` live as reviewed
 * proposals in `.plan/api-schema.prisma`. Rather than sprinkle `(prisma as any)`
 * across a dozen call sites — which would silently swallow a rename or a type
 * change once the models land — the cast is made exactly once, here, behind
 * hand-written delegate interfaces that mirror the proposal.
 *
 * When the models are added to the schema and `prisma generate` has run, delete
 * this file and import the generated types directly; every call site already
 * uses the same field names and shapes.
 *
 * `assertApiSchemaReady()` gives an honest 503 instead of a
 * `Cannot read properties of undefined` stack when the migration has not been
 * applied yet.
 */
import { prisma } from "@/lib/prisma";
import { apiError } from "./errors";

// ─── Record shapes (mirror .plan/api-schema.prisma) ─────────────────────────

export type ApiKeyRecord = {
  id: string;
  siteId: string;
  userId: string;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedById: string | null;
  createdById: string;
  createdAt: Date;
};

export type WebhookEndpointRecord = {
  id: string;
  siteId: string;
  url: string;
  description: string | null;
  events: string[];
  /** AES-256-GCM ciphertext — never hand this to a client without decrypting. */
  secretCiphertext: string;
  enabled: boolean;
  consecutiveFailures: number;
  disabledReason: string | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type WebhookDeliveryRecord = {
  id: string;
  siteId: string;
  endpointId: string;
  event: string;
  payload: unknown;
  status: "PENDING" | "DELIVERED" | "FAILED" | "EXHAUSTED";
  attempt: number;
  maxAttempts: number;
  responseStatus: number | null;
  errorCode: string | null;
  nextAttemptAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Minimal delegate surface actually used by this feature ─────────────────

type Where = Record<string, unknown>;

type Delegate<Row> = {
  findUnique(args: { where: Where; select?: Record<string, boolean> }): Promise<Row | null>;
  findFirst(args: {
    where: Where;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    select?: Record<string, boolean>;
  }): Promise<Row | null>;
  findMany(args?: {
    where?: Where;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    take?: number;
    skip?: number;
    select?: Record<string, boolean>;
  }): Promise<Row[]>;
  count(args?: { where?: Where }): Promise<number>;
  create(args: { data: Record<string, unknown> }): Promise<Row>;
  createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
  update(args: { where: Where; data: Record<string, unknown> }): Promise<Row>;
  updateMany(args: { where: Where; data: Record<string, unknown> }): Promise<{ count: number }>;
  deleteMany(args: { where: Where }): Promise<{ count: number }>;
};

type ApiSchema = {
  apiKey?: Delegate<ApiKeyRecord>;
  webhookEndpoint?: Delegate<WebhookEndpointRecord>;
  webhookDelivery?: Delegate<WebhookDeliveryRecord>;
};

const client = prisma as unknown as ApiSchema;

/** True once `.plan/api-schema.prisma` has been merged and generated. */
export function isApiSchemaReady(): boolean {
  return Boolean(client.apiKey && client.webhookEndpoint && client.webhookDelivery);
}

function require_<T>(delegate: T | undefined, model: string): T {
  if (!delegate) {
    throw apiError.serviceUnavailable(
      `The ${model} model has not been provisioned on this deployment yet.`
    );
  }
  return delegate;
}

export const apiKeyTable = (): Delegate<ApiKeyRecord> => require_(client.apiKey, "ApiKey");
export const webhookEndpointTable = (): Delegate<WebhookEndpointRecord> =>
  require_(client.webhookEndpoint, "WebhookEndpoint");
export const webhookDeliveryTable = (): Delegate<WebhookDeliveryRecord> =>
  require_(client.webhookDelivery, "WebhookDelivery");
