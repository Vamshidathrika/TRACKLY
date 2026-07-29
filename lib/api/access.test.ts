import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findMany: vi.fn(), findFirst: vi.fn() },
    membership: { findUnique: vi.fn() },
    issue: { findFirst: vi.fn() },
    sprint: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/tenant", () => ({
  checkProjectAccess: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/tenant";
import type { ApiContext } from "./auth";
import {
  resolveProjectScope,
  projectWhere,
  issueWhere,
  scopeIsEmpty,
  requireProjectAccessById,
  requireProjectWriteAccess,
  requireProjectAdminAccess,
  resolveIssueByKey,
  resolveSprintById,
  resolveProjectByKeyOrId,
  assertWorkspaceUser,
  assertSprintInProject,
  assertParentInProject,
} from "./access";
import { ApiError } from "./errors";

const ctxFor = (overrides: Partial<ApiContext> = {}): ApiContext => ({
  keyId: "key1",
  keyName: "test key",
  siteId: "site-A",
  userId: "user-1",
  role: "MEMBER",
  scopes: [],
  rateLimitPerMinute: 120,
  requestId: "req-1",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveProjectScope", () => {
  it("gives a workspace ADMIN the whole site — no per-project narrowing", async () => {
    const scope = await resolveProjectScope(ctxFor({ role: "ADMIN" }));
    expect(scope).toEqual({ kind: "site", siteId: "site-A" });
    // An ADMIN's scope must never be derived from a project query result —
    // it is a direct consequence of the role, so no lookup should happen.
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it("scopes a non-admin to only the projects they lead or are a member of, within their own site", async () => {
    (prisma.project.findMany as any).mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    const scope = await resolveProjectScope(ctxFor({ role: "MEMBER", siteId: "site-A", userId: "user-1" }));
    expect(scope).toEqual({ kind: "projects", siteId: "site-A", projectIds: ["p1", "p2"] });
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          siteId: "site-A",
          OR: [{ leadId: "user-1" }, { members: { some: { userId: "user-1" } } }],
        }),
      })
    );
  });
});

describe("projectWhere / issueWhere / scopeIsEmpty", () => {
  it("a site-scoped where clause filters only by siteId", () => {
    expect(projectWhere({ kind: "site", siteId: "site-A" })).toEqual({ siteId: "site-A" });
    expect(issueWhere({ kind: "site", siteId: "site-A" })).toEqual({ project: { siteId: "site-A" } });
  });

  it("a projects-scoped where clause filters by BOTH siteId and the explicit id list — defense in depth", () => {
    const scope = { kind: "projects" as const, siteId: "site-A", projectIds: ["p1", "p2"] };
    expect(projectWhere(scope)).toEqual({ siteId: "site-A", id: { in: ["p1", "p2"] } });
    expect(issueWhere(scope)).toEqual({
      projectId: { in: ["p1", "p2"] },
      project: { siteId: "site-A" },
    });
  });

  it("scopeIsEmpty is true only for an empty projects list, never for a site scope", () => {
    expect(scopeIsEmpty({ kind: "site", siteId: "site-A" })).toBe(false);
    expect(scopeIsEmpty({ kind: "projects", siteId: "site-A", projectIds: [] })).toBe(true);
    expect(scopeIsEmpty({ kind: "projects", siteId: "site-A", projectIds: ["p1"] })).toBe(false);
  });
});

describe("requireProjectAccessById — the IDOR boundary", () => {
  it("resolves access for a project genuinely in the token's own site", async () => {
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "MEMBER" });
    const access = await requireProjectAccessById(ctxFor({ siteId: "site-A" }), "proj-1");
    expect(access.canWrite).toBe(true);
  });

  it("404s (not 403) when checkProjectAccess finds nothing — a genuinely absent project", async () => {
    (checkProjectAccess as any).mockResolvedValue(null);
    await expect(requireProjectAccessById(ctxFor(), "proj-x")).rejects.toMatchObject({ status: 404 });
  });

  it("404s when the project is real but belongs to a DIFFERENT site than the token — this is the cross-tenant case", async () => {
    // The user is a legitimate member of proj-1, but proj-1 lives in site-B
    // while the token is scoped to site-A (e.g. the user is also a member of
    // site-B and the token owner tries to use a site-A token to reach it).
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-B", projectRole: "ADMIN" });
    await expect(requireProjectAccessById(ctxFor({ siteId: "site-A" }), "proj-1")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("never returns a 403 for the cross-tenant case (that would confirm the id exists elsewhere)", async () => {
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-B", projectRole: "ADMIN" });
    try {
      await requireProjectAccessById(ctxFor({ siteId: "site-A" }), "proj-1");
      throw new Error("expected this to throw");
    } catch (e) {
      expect((e as ApiError).status).not.toBe(403);
      expect((e as ApiError).status).toBe(404);
    }
  });

  it("marks a VIEWER as read-only (canWrite: false)", async () => {
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "VIEWER" });
    const access = await requireProjectAccessById(ctxFor({ siteId: "site-A" }), "proj-1");
    expect(access.canWrite).toBe(false);
  });
});

describe("requireProjectWriteAccess", () => {
  it("403s a VIEWER rather than 404 — they can see the project, just not write to it", async () => {
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "VIEWER" });
    await expect(requireProjectWriteAccess(ctxFor({ siteId: "site-A" }), "proj-1")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("allows a MEMBER through", async () => {
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "MEMBER" });
    await expect(requireProjectWriteAccess(ctxFor({ siteId: "site-A" }), "proj-1")).resolves.toBeTruthy();
  });
});

describe("requireProjectAdminAccess", () => {
  it("allows a project ADMIN and a workspace ADMIN (WORKSPACE_ADMIN)", async () => {
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "ADMIN" });
    await expect(requireProjectAdminAccess(ctxFor({ siteId: "site-A" }), "proj-1")).resolves.toBeTruthy();

    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "WORKSPACE_ADMIN" });
    await expect(requireProjectAdminAccess(ctxFor({ siteId: "site-A" }), "proj-1")).resolves.toBeTruthy();
  });

  it("403s a plain MEMBER", async () => {
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "MEMBER" });
    await expect(requireProjectAdminAccess(ctxFor({ siteId: "site-A" }), "proj-1")).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("resolveIssueByKey", () => {
  it("filters by project.siteId in the query itself — a key from another site never comes back", async () => {
    (prisma.issue.findFirst as any).mockResolvedValue(null);
    await expect(resolveIssueByKey(ctxFor({ siteId: "site-A" }), "trk-1")).rejects.toMatchObject({ status: 404 });
    expect(prisma.issue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "TRK-1", project: { siteId: "site-A" } },
      })
    );
  });

  it("upper-cases the key before querying", async () => {
    (prisma.issue.findFirst as any).mockResolvedValue({ id: "i1", projectId: "p1", key: "TRK-1" });
    (checkProjectAccess as any).mockResolvedValue({ siteId: "site-A", projectRole: "MEMBER" });
    await resolveIssueByKey(ctxFor({ siteId: "site-A" }), "trk-1");
    expect((prisma.issue.findFirst as any).mock.calls[0][0].where.key).toBe("TRK-1");
  });
});

describe("resolveSprintById / resolveProjectByKeyOrId", () => {
  it("resolveSprintById site-filters before returning", async () => {
    (prisma.sprint.findFirst as any).mockResolvedValue(null);
    await expect(resolveSprintById(ctxFor({ siteId: "site-A" }), "sprint-1")).rejects.toMatchObject({ status: 404 });
    expect(prisma.sprint.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sprint-1", project: { siteId: "site-A" } } })
    );
  });

  it("resolveProjectByKeyOrId matches by key OR id, scoped to the token's site", async () => {
    (prisma.project.findFirst as any).mockResolvedValue(null);
    await expect(resolveProjectByKeyOrId(ctxFor({ siteId: "site-A" }), "trk")).rejects.toMatchObject({
      status: 404,
    });
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: "site-A", OR: [{ key: "TRK" }, { id: "trk" }] },
      })
    );
  });
});

describe("assertWorkspaceUser — blocks writing a foreign user id into this workspace's data", () => {
  it("throws invalid_request when the user id is not a member of the token's site", async () => {
    (prisma.membership.findUnique as any).mockResolvedValue(null);
    await expect(assertWorkspaceUser(ctxFor({ siteId: "site-A" }), "some-other-user", "assigneeId")).rejects.toMatchObject(
      { status: 400 }
    );
  });

  it("passes silently for a real member of the token's site", async () => {
    (prisma.membership.findUnique as any).mockResolvedValue({ id: "m1" });
    await expect(
      assertWorkspaceUser(ctxFor({ siteId: "site-A" }), "user-2", "assigneeId")
    ).resolves.toBeUndefined();
  });
});

describe("assertSprintInProject / assertParentInProject", () => {
  it("rejects a sprint that does not belong to the given project", async () => {
    (prisma.sprint.findFirst as any).mockResolvedValue(null);
    await expect(assertSprintInProject("sprint-1", "proj-1", "sprintId")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a parent issue that does not belong to the given project", async () => {
    (prisma.issue.findFirst as any).mockResolvedValue(null);
    await expect(assertParentInProject("issue-1", "proj-1", "parentId")).rejects.toMatchObject({ status: 400 });
  });
});
