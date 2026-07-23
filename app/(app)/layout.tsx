import { getAuthUser } from "@/lib/auth";
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
      const chromeData = await getChromeData(user.id);
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
