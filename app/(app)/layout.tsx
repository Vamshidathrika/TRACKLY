import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TopNav } from "@/components/nav/TopNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const u = session.user as { name?: string; email?: string; image?: string };
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav user={{ name: u.name ?? "", email: u.email ?? "", avatarUrl: u.image ?? null }} />
      <div className="flex flex-1">{children}</div>
    </div>
  );
}
