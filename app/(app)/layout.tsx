import { getAuthUser } from "@/lib/auth";
import { getChromeData } from "@/lib/stars";
import { AppShell } from "@/components/chrome/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  const { projects, starredProjectIds } = await getChromeData(user.id);
  return (
    <AppShell
      user={{ name: user.name, email: user.email, avatarUrl: user.image }}
      projects={projects}
      starredProjectIds={starredProjectIds}
    >
      {children}
    </AppShell>
  );
}
