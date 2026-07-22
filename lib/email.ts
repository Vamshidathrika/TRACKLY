import nodemailer from "nodemailer";

export async function sendInviteEmail(
  toEmail: string,
  inviteUrl: string,
  inviterName: string,
  siteName: string
) {
  const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const smtpPass = process.env.GMAIL_PASS || process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  if (!smtpUser || !smtpPass) {
    console.log(`[Email Notice] SMTP credentials not set. Invite link for ${toEmail}: ${inviteUrl}`);
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0052CC; margin-top: 0; font-size: 20px;">You're invited to join ${siteName} on Trackly!</h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.5;">
          <strong>${inviterName}</strong> has invited you to join their workspace on Trackly.
        </p>
        <div style="margin: 28px 0;">
          <a href="${inviteUrl}" style="background-color: #0052CC; color: #ffffff; padding: 12px 24px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">
            Accept Invitation & Join Workspace
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Or copy and paste this join link into your browser:</p>
        <p style="font-size: 12px; color: #0052CC; word-break: break-all;"><a href="${inviteUrl}" style="color: #0052CC;">${inviteUrl}</a></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Trackly Invites" <${smtpUser}>`,
      to: toEmail,
      subject: `You're invited to join ${siteName} on Trackly`,
      html,
    });

    return { sent: true };
  } catch (err) {
    console.error("Error sending invite email:", err);
    return { sent: false, reason: "SEND_FAILED" };
  }
}
