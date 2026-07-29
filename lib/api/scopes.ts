/**
 * API token scopes.
 *
 * A scope is a ceiling, never a grant. The effective permission for a request
 * is the *intersection* of
 *   1. what the key's owning user may do in the key's workspace
 *      (`Role` / `ProjectRole`, evaluated per request in `lib/api/access.ts`), and
 *   2. the scopes stamped on the key.
 *
 * So `issues:write` on a key held by a project VIEWER still cannot write, and a
 * workspace ADMIN's key without `issues:write` still cannot write. Neither side
 * can be widened by the other — that is the whole point of separating them.
 */

export const API_SCOPES = [
  "projects:read",
  "issues:read",
  "issues:write",
  "comments:read",
  "comments:write",
  "worklogs:read",
  "worklogs:write",
  "sprints:read",
  "sprints:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

const SCOPE_SET: ReadonlySet<string> = new Set(API_SCOPES);

export function isApiScope(value: string): value is ApiScope {
  return SCOPE_SET.has(value);
}

/**
 * Drops anything unrecognised. Persisting an unknown scope string would mean a
 * future release that adds `issues:delete` silently activates it on keys that
 * were issued before the permission existed.
 */
export function sanitiseScopes(input: readonly string[]): ApiScope[] {
  const seen = new Set<ApiScope>();
  for (const raw of input) {
    const value = raw.trim();
    if (isApiScope(value)) seen.add(value);
  }
  return API_SCOPES.filter((s) => seen.has(s));
}

export function hasScope(granted: readonly string[], required: ApiScope): boolean {
  return granted.includes(required);
}

/** Human labels for the settings UI. */
export const SCOPE_LABELS: Record<ApiScope, string> = {
  "projects:read": "Read projects",
  "issues:read": "Read issues",
  "issues:write": "Create and update issues",
  "comments:read": "Read comments",
  "comments:write": "Post comments",
  "worklogs:read": "Read work logs",
  "worklogs:write": "Log work",
  "sprints:read": "Read sprints",
  "sprints:write": "Create and update sprints",
};

/** Convenience presets offered in the UI; they expand to explicit scopes. */
export const SCOPE_PRESETS: { id: string; label: string; scopes: ApiScope[] }[] = [
  {
    id: "read-only",
    label: "Read only",
    scopes: ["projects:read", "issues:read", "comments:read", "worklogs:read", "sprints:read"],
  },
  {
    id: "read-write",
    label: "Read and write",
    scopes: [...API_SCOPES],
  },
];
