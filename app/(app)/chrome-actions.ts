"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { THEME_COOKIE, type ThemePref, parseThemeCookie } from "@/lib/theme";
import { toggleStar } from "@/lib/stars";

export async function setThemeAction(pref: ThemePref) {
  (await cookies()).set(THEME_COOKIE, parseThemeCookie(pref), {
    path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax",
  });
}

import { checkProjectAccess } from "@/lib/tenant";

export async function toggleStarAction(projectId: string) {
  const user = await getAuthUser();
  const access = await checkProjectAccess(user.id, projectId);
  if (!access) return { starred: false, count: 0, error: "You don't have access to this project" };

  const res = await toggleStar(user.id, projectId);
  revalidatePath("/your-work");
  revalidatePath("/projects");
  return res;
}
