import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { delCache } from "@/lib/redis";
import { grantProjectAccess } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const user = await getAuthUser();
  const { key } = await context.params;
  const upperKey = key.toUpperCase();

  const project = await prisma.project.findFirst({
    where: {
      OR: [
        { key: upperKey },
        { name: { equals: key, mode: "insensitive" } },
        { id: key },
      ],
    },
    select: { id: true, key: true, siteId: true },
  });

  if (!project) {
    return NextResponse.redirect(new URL("/your-work", request.url));
  }

  // 1. Ensure user has workspace membership in the project's site (as MEMBER)
  await prisma.membership.upsert({
    where: { userId_siteId: { userId: user.id, siteId: project.siteId } },
    create: { userId: user.id, siteId: project.siteId, role: "MEMBER" },
    update: {}, // keep existing role if already a member/admin
  });

  // 2. Grant explicit per-project membership strictly for this board
  await grantProjectAccess(project.id, user.id, "MEMBER");

  // 3. Clear relevant navigation caches
  await delCache(`user:chrome:${user.id}`).catch(() => {});
  await delCache(`site:projects:${project.siteId}`).catch(() => {});

  // 4. Redirect seamlessly to the target board
  return NextResponse.redirect(new URL(`/projects/${project.key}/board`, request.url));
}
