import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, any>();

vi.mock("./redis", () => ({
  getCache: vi.fn(async (key: string) => store.get(key) ?? null),
  setCache: vi.fn(async (key: string, value: any) => {
    store.set(key, value);
  }),
  delCache: vi.fn(async (...keys: string[]) => {
    for (const k of keys) store.delete(k);
  }),
  delCachePrefix: vi.fn(async (prefix: string) => {
    for (const k of Array.from(store.keys())) {
      if (k.startsWith(prefix)) store.delete(k);
    }
  }),
}));

import {
  getCachedMembership,
  setCachedMembership,
  getCachedProjectAccess,
  setCachedProjectAccess,
  invalidateUserAccess,
} from "./access-cache";

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

describe("access-cache", () => {
  it("returns null for an unseen membership", async () => {
    expect(await getCachedMembership("u1")).toBeNull();
  });

  it("round-trips a membership", async () => {
    await setCachedMembership("u1", { siteId: "s1", role: "ADMIN", siteName: "Acme" });
    expect(await getCachedMembership("u1")).toEqual({
      siteId: "s1",
      role: "ADMIN",
      siteName: "Acme",
    });
  });

  it("round-trips a project access grant", async () => {
    await setCachedProjectAccess("u1", "p1", {
      projectId: "p1",
      projectKey: "TRK",
      projectName: "Trackly",
      siteId: "s1",
      projectRole: "WORKSPACE_ADMIN",
    });
    expect(await getCachedProjectAccess("u1", "p1")).toMatchObject({ projectRole: "WORKSPACE_ADMIN" });
  });

  it("caches a denial so repeated denied loads do not re-query", async () => {
    await setCachedProjectAccess("u1", "p1", { denied: true });
    expect(await getCachedProjectAccess("u1", "p1")).toEqual({ denied: true });
  });

  it("invalidateUserAccess clears membership and every project grant for that user", async () => {
    await setCachedMembership("u1", { siteId: "s1", role: "ADMIN", siteName: "Acme" });
    await setCachedProjectAccess("u1", "p1", { denied: true });
    await setCachedProjectAccess("u1", "p2", { denied: true });
    await setCachedMembership("u2", { siteId: "s1", role: "MEMBER", siteName: "Acme" });

    await invalidateUserAccess("u1");

    expect(await getCachedMembership("u1")).toBeNull();
    expect(await getCachedProjectAccess("u1", "p1")).toBeNull();
    expect(await getCachedProjectAccess("u1", "p2")).toBeNull();
    expect(await getCachedMembership("u2")).not.toBeNull();
  });
});
