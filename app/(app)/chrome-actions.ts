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

export async function toggleStarAction(projectId: string) {
  const user = await getAuthUser();
  const res = await toggleStar(user.id, projectId);
  revalidatePath("/", "layout");
  return res;
}
