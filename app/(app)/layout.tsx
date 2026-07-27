import { getAuthUser } from "@/lib/auth";
import { requireMembership } from "@/lib/tenant";
import { getChromeData } from "@/lib/stars";
import { AppShell } from "@/components/chrome/AppShell";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await getAuthUser();
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.message?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    redirect("/login");
  }

  let projects: { id: string; key: string; name: string }[] = [];
  let starredProjectIds: string[] = [];

  if (user?.id) {
    try {
      const { siteId } = await requireMembership();
      const chromeData = await getChromeData(user.id, siteId);
      projects = chromeData.projects || [];
      starredProjectIds = chromeData.starredProjectIds || [];
    } catch (err) {
      console.error("[AppLayout getChromeData Recoverable Error]:", err);
    }
  }

  return (
    <AppShell
      user={{
        name: user?.name ?? user?.email ?? "Teammate",
        email: user?.email ?? "",
        avatarUrl: user?.image ?? null,
      }}
      projects={projects}
      starredProjectIds={starredProjectIds}
    >
      {children}
    </AppShell>
  );
}
