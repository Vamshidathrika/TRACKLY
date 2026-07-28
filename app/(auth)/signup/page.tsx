import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // /invite/[token] sends unauthenticated visitors here as
  // ?callbackUrl=/invite/<token>. Lifting the token out lets signup consume the
  // invite directly, and the callbackUrl still drives the post-signup redirect.
  const isLocal = !!callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//");
  const inviteToken = isLocal ? callbackUrl.match(/^\/invite\/([^/?#]+)/)?.[1] : undefined;

  return <SignupForm inviteToken={inviteToken} callbackUrl={isLocal ? callbackUrl : undefined} />;
}
