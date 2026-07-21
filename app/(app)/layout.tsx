import { getAuthUser } from "@/lib/auth";
import { TopNav } from "@/components/nav/TopNav";
import { AICopilotDrawer } from "@/components/ai/AICopilotDrawer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={{ name: user.name, email: user.email, avatarUrl: user.image }} />
      <div className="flex flex-1">{children}</div>
      <AICopilotDrawer />
    </div>
  );
}
