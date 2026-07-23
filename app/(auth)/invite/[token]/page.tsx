import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const messages = {
  INVALID: "This invite link is not valid.",
  EXPIRED: "This invite link has expired. Ask your admin to send a new one.",
  USED: "This invite has already been used.",
} as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await auth();

  // If not logged in, redirect to SIGNUP (not just login) so new users can create accounts
  if (!session?.user) {
    redirect(`/signup?callbackUrl=/invite/${token}`);
  }

  const result = await acceptInvite(token, (session.user as { id: string }).id);

  if (result.ok) {
    if (result.projectKey) {
      redirect(`/projects/${result.projectKey}`);
    }
    redirect("/your-work");
  }

  // Fetch invite details for a nicer error page
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { site: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col items-center gap-4 text-center max-w-md mx-auto py-16">
      <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center text-2xl">
        ⚠️
      </div>
      <h1 className="text-xl font-semibold text-text">Invitation Issue</h1>
      {invite?.site && (
        <p className="text-sm text-text-subtle">
          Workspace: <strong>{invite.site.name}</strong>
        </p>
      )}
      <p className="text-sm text-text-subtle">{messages[result.reason]}</p>
      <div className="flex gap-3 mt-2">
        <Link
          href="/your-work"
          className="px-4 py-2 text-sm font-medium rounded-md bg-brand text-white hover:bg-brand-hovered transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/login"
          className="px-4 py-2 text-sm font-medium rounded-md border border-border text-text hover:bg-neutral transition-colors"
        >
          Switch Account
        </Link>
      </div>
    </div>
  );
}
