import "./globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { parseThemeCookie, THEME_COOKIE } from "@/lib/theme";
import { ThemeScript } from "@/components/theme/ThemeScript";

export const metadata: Metadata = { title: "Trackly", description: "Project tracking for teams" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pref = parseThemeCookie((await cookies()).get(THEME_COOKIE)?.value);
  const attr = pref === "system" ? undefined : pref;
  return (
    <html lang="en" {...(attr ? { "data-theme": attr } : {})} suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body>{children}</body>
    </html>
  );
}
