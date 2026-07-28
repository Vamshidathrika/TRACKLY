import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/tenant";

/**
 * Deep link to a board.
 *
 * This route used to look a project up by key alone and then upsert a
 * Membership into whatever site owned it, so `GET /projects/ENG/join` enrolled
 * any authenticated user into a stranger's workspace — project keys are two or
 * three characters and trivially enumerable.
 *
 * It now resolves access rather than granting it, which is how Jira treats a
 * board URL: if you already have access you land on the board, otherwise you
 * are told you don't. Access is granted only through a tokenised invite
 * (`/invite/[token]`) — authenticated, expiring, and admin-issued.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const user = await getAuthUser();
  const { key } = await context.params;
  const upperKey = key.toUpperCase();

  // Only consider projects in workspaces the caller already belongs to.
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { siteId: true },
  });
  const siteIds = memberships.map((m) => m.siteId);

  if (siteIds.length === 0) {
    return NextResponse.redirect(new URL("/your-work?error=no-access", request.url));
  }

  const project = await prisma.project.findFirst({
    where: { siteId: { in: siteIds }, key: upperKey },
    select: { id: true, key: true },
  });

  if (!project) {
    return NextResponse.redirect(new URL("/your-work?error=board-not-found", request.url));
  }

  const access = await checkProjectAccess(user.id, project.id);
  if (!access) {
    return NextResponse.redirect(
      new URL(`/your-work?error=no-board-access&board=${project.key}`, request.url)
    );
  }

  return NextResponse.redirect(new URL(`/projects/${project.key}/board`, request.url));
}
