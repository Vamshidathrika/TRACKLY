import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Send a workspace invitation email via Resend with a high-impact Trackly design template.
 *
 * For testing without a verified domain:
 *   RESEND_FROM_EMAIL=onboarding@resend.dev
 *
 * For production with your domain:
 *   RESEND_FROM_EMAIL=noreply@yourdomain.com
 */
export async function sendInviteEmail(
  toEmail: string,
  inviteUrl: string,
  inviterName: string,
  siteName: string,
  options?: {
    role?: string;
    projectName?: string;
  }
) {
  if (!resend) {
    console.log(`[Email] RESEND_API_KEY not set. Invite link for ${toEmail}: ${inviteUrl}`);
    return { sent: false, reason: "NOT_CONFIGURED" as const };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const roleDisplay = options?.role ? options.role.charAt(0).toUpperCase() + options.role.slice(1).toLowerCase() : "Member";
  const scopeDisplay = options?.projectName ? `Project: ${options.projectName}` : "All Workspace Projects";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${siteName} on Trackly</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header Banner with Trackly Brand -->
          <tr>
            <td style="background: linear-gradient(135deg, #0747A6 0%, #0052CC 60%, #2684FF 100%); padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); border-radius: 10px; padding: 8px 14px; border: 1px solid rgba(255, 255, 255, 0.25);">
                      <span style="color: #ffffff; font-size: 18px; font-weight: 800; tracking-tight: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                        ⚡ TRACKLY
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; line-height: 1.25; letter-spacing: -0.5px;">
                      You&apos;re invited to join <span style="text-decoration: underline decoration-blue-300 decoration-2;">${siteName}</span>
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <p style="font-size: 16px; color: #1e293b; line-height: 1.6; margin: 0 0 24px 0;">
                <strong style="color: #0f172a;">${inviterName}</strong> has invited you to collaborate on Trackly, the high-velocity project tracking platform.
              </p>

              <!-- Invitation Details Card -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          Workspace Details
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #334155; padding: 4px 0;">
                          <strong style="color: #0f172a;">Workspace:</strong> ${siteName}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #334155; padding: 4px 0;">
                          <strong style="color: #0f172a;">Assigned Role:</strong> 
                          <span style="display: inline-block; background-color: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-left: 4px;">
                            ${roleDisplay}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 14px; color: #334155; padding: 4px 0;">
                          <strong style="color: #0f172a;">Scope:</strong> ${scopeDisplay}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; padding-top: 8px;">
                          ⏱️ <em>This invitation link is valid for 7 days.</em>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="background-color: #0052CC; color: #ffffff; padding: 14px 32px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3); transition: background-color 0.2s ease;">
                      Accept Invitation &amp; Join Workspace →
                    </a>
                  </td>
                </tr>
              </table>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />

              <!-- Fallback Direct URL Box -->
              <p style="font-size: 13px; color: #64748b; margin: 0 0 8px 0; font-weight: 500;">
                Button not working? Copy and paste this URL directly into your browser:
              </p>
              <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #0052CC;">
                <a href="${inviteUrl}" style="color: #0052CC; text-decoration: underline;">${inviteUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0;">
                If you weren&apos;t expecting an invite to ${siteName}, you can safely ignore this email.
              </p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
                &copy; ${new Date().getFullYear()} Trackly. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `You're invited to join ${siteName} on Trackly!

${inviterName} has invited you to join their workspace on Trackly as a ${roleDisplay}.

Workspace: ${siteName}
Role: ${roleDisplay}
Scope: ${scopeDisplay}

Accept your invitation here:
${inviteUrl}

(This link is valid for 7 days)
`;

  try {
    const { error } = await resend.emails.send({
      from: `Trackly Invites <${fromEmail}>`,
      to: toEmail,
      subject: `You're invited to join ${siteName} on Trackly`,
      html,
      text,
    });

    if (error) {
      console.error("Resend email error:", error);
      return { sent: false, reason: "SEND_FAILED" as const, errorDetails: error.message };
    }

    return { sent: true };
  } catch (err: any) {
    console.error("Error sending invite email:", err);
    return { sent: false, reason: "SEND_FAILED" as const, errorDetails: err?.message || String(err) };
  }
}

