/**
 * Caching and invalidation for the tenant guards in lib/tenant.ts.
 *
 * These guards run on every navigation. React's cache() dedupes them only
 * within a single request, so without this layer each navigation re-queries
 * membership and project access from the database.
 *
 * Every mutation that can change what a user may see MUST call
 * invalidateUserAccess for the affected user. TTL alone is not sufficient:
 * a revoked role would otherwise keep working until it expired.
 */
import { getCache, setCache, delCache, delCachePrefix } from "./redis";
import type { Role, ProjectRole } from "@prisma/client";

const MEMBERSHIP_TTL_SECONDS = 300;
const PROJECT_ACCESS_TTL_SECONDS = 300;

export type CachedMembership = {
  siteId: string;
  role: Role;
  siteName: string;
};

export type CachedProjectAccess =
  | {
      projectId: string;
      projectKey: string;
      projectName: string;
      siteId: string;
      projectRole: ProjectRole | "WORKSPACE_ADMIN";
    }
  | { denied: true };

const membershipKey = (userId: string) => `access:membership:${userId}`;
const projectAccessKey = (userId: string, projectId: string) =>
  `access:project:${userId}:${projectId}`;
const projectAccessPrefix = (userId: string) => `access:project:${userId}:`;

export async function getCachedMembership(userId: string): Promise<CachedMembership | null> {
  return getCache<CachedMembership>(membershipKey(userId));
}

export async function setCachedMembership(userId: string, value: CachedMembership): Promise<void> {
  await setCache(membershipKey(userId), value, MEMBERSHIP_TTL_SECONDS);
}

export async function getCachedProjectAccess(
  userId: string,
  projectId: string
): Promise<CachedProjectAccess | null> {
  return getCache<CachedProjectAccess>(projectAccessKey(userId, projectId));
}

export async function setCachedProjectAccess(
  userId: string,
  projectId: string,
  value: CachedProjectAccess
): Promise<void> {
  await setCache(projectAccessKey(userId, projectId), value, PROJECT_ACCESS_TTL_SECONDS);
}

const ACCESS_VERSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const versionKey = (userId: string) => `access:version:${userId}`;

export async function getAccessVersion(userId: string): Promise<number> {
  const raw = await getCache<number>(versionKey(userId));
  return typeof raw === "number" ? raw : 0;
}

export async function bumpAccessVersion(userId: string): Promise<number> {
  const next = (await getAccessVersion(userId)) + 1;
  await setCache(versionKey(userId), next, ACCESS_VERSION_TTL_SECONDS);
  return next;
}

/**
 * Drops every cached access decision for a user. Call from any mutation that
 * changes membership, role, project membership, or project visibility.
 */
export async function invalidateUserAccess(userId: string): Promise<void> {
  await delCache(membershipKey(userId)).catch(() => {});
  await delCachePrefix(projectAccessPrefix(userId)).catch(() => {});
  await bumpAccessVersion(userId).catch(() => {});
}
