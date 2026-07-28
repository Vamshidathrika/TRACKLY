"use server";

import { getAuthUser } from "@/lib/auth";
import { getIssueDetail } from "@/lib/dal/issue-detail";

/**
 * Loads the full issue payload for the detail drawer.
 *
 * Kept out of `actions.ts` so the read path stays separate from the mutation
 * path. `getIssueDetail` runs the tenant check itself and returns null when the
 * caller has no access to the owning project, so a bare issue id from the
 * client cannot read across workspaces.
 */
export async function getIssueDetailAction(issueId: string) {
  const user = await getAuthUser();
  if (!issueId || issueId.startsWith("demo-")) return null;
  return getIssueDetail(user.id, issueId);
}
