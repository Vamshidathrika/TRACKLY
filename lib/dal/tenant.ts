import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "../prisma";
import { redis } from "../redis";
import { getAuthUser } from "../auth";
import { requireMembership, requireAdmin, checkProjectAccess, requireProjectAccess } from "../tenant";
import type { TenantContext, ProjectContext } from "../tenant";

export { requireMembership, requireAdmin, checkProjectAccess, requireProjectAccess };
export type { TenantContext, ProjectContext };

/**
 * Get tenant by slug — Redis-cached (5 min TTL).
 */
export const getTenantBySlug = cache(async (slug: string) => {
  const cacheKey = `tenant:slug:${slug}`;

  try {
    if (redis) {
      const cached = await redis.get<string | object>(cacheKey);
      if (cached) {
        return typeof cached === "string" ? JSON.parse(cached) : cached;
      }
    }
  } catch (err) {
    console.error(`[Redis Tenant Cache Error] ${slug}:`, err);
  }

  const tenant = await prisma.site.findUnique({
    where: { slug },
  });

  if (tenant && redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(tenant), { ex: 300 });
    } catch (err) {
      console.error(`[Redis Tenant Set Error]:`, err);
    }
  }

  return tenant;
});

/**
 * Resolves current tenant context and sets CockroachDB RLS session variable.
 */
export const resolveTenant = cache(async () => {
  const user = await getAuthUser();
  const headerList = await headers();

  const tenantSlug = headerList.get("x-tenant-slug");

  let tenant: { id: string; name: string; slug: string } | null = null;
  if (tenantSlug) {
    tenant = await getTenantBySlug(tenantSlug);
  }

  if (!tenant) {
    // Fall back to primary user workspace membership
    const tenantCtx = await requireMembership();
    tenant = { id: tenantCtx.siteId, name: tenantCtx.siteName, slug: "primary" };
  }

  const membership = await prisma.membership.findFirst({
    where: {
      siteId: tenant.id,
      userId: user.id,
    },
  });

  if (!membership) {
    throw new Error("User is not a member of this tenant");
  }

  // Set CockroachDB RLS session variable for shared tenancy
  try {
    await prisma.$executeRaw`SET LOCAL app.current_tenant = ${tenant.id}`;
  } catch {
    // Fallback if RLS session setting is disabled in local DB environment
  }

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      tenancyMode: "SHARED" as const,
      plan: "FREE",
      status: "ACTIVE",
    },
    membership: {
      id: membership.id,
      tenantId: membership.siteId,
      userId: membership.userId,
      role: membership.role,
      status: "ACTIVE",
    },
    user,
  };
});
