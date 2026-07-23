import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Send a workspace invitation email via Resend.
 *
 * For testing without a verified domain, set:
 *   RESEND_FROM_EMAIL=onboarding@resend.dev
 *
 * For production with your own domain:
 *   RESEND_FROM_EMAIL=noreply@yourdomain.com
 */
export async function sendInviteEmail(
  toEmail: string,
  inviteUrl: string,
  inviterName: string,
  siteName: string
) {
  if (!resend) {
    console.log(`[Email] RESEND_API_KEY not set. Invite link for ${toEmail}: ${inviteUrl}`);
    return { sent: false, reason: "NOT_CONFIGURED" as const };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0052CC; margin-top: 0; font-size: 20px;">You&apos;re invited to join ${siteName} on Trackly!</h2>
      <p style="font-size: 15px; color: #334155; line-height: 1.5;">
        <strong>${inviterName}</strong> has invited you to join their workspace on Trackly.
      </p>
      <div style="margin: 28px 0;">
        <a href="${inviteUrl}" style="background-color: #0052CC; color: #ffffff; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
          Accept Invitation &amp; Join Workspace
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Or copy and paste this join link into your browser:</p>
      <p style="font-size: 12px; color: #0052CC; word-break: break-all;"><a href="${inviteUrl}" style="color: #0052CC;">${inviteUrl}</a></p>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: `Trackly Invites <${fromEmail}>`,
      to: toEmail,
      subject: `You're invited to join ${siteName} on Trackly`,
      html,
    });

    if (error) {
      console.error("Resend email error:", error);
      return { sent: false, reason: "SEND_FAILED" as const };
    }

    return { sent: true };
  } catch (err) {
    console.error("Error sending invite email:", err);
    return { sent: false, reason: "SEND_FAILED" as const };
  }
}
