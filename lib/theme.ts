export const THEME_COOKIE = "trackly-theme";
export type ThemePref = "light" | "dark" | "system";

export function parseThemeCookie(v: string | undefined): ThemePref {
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): "light" | "dark" {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}
