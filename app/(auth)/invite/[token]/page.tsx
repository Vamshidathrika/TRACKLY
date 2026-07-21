import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";

const messages = {
  INVALID: "This invite link is not valid.",
  EXPIRED: "This invite link has expired. Ask your admin to send a new one.",
  USED: "This invite has already been used.",
} as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/invite/${token}`);
  const result = await acceptInvite(token, (session.user as { id: string }).id);
  if (result.ok) redirect("/your-work");
  return (
    <div className="flex flex-col gap-3 text-center">
      <p className="text-sm text-text">{messages[result.reason]}</p>
      <Link href="/your-work" className="text-sm text-brand hover:underline">Go to Trackly</Link>
    </div>
  );
}
