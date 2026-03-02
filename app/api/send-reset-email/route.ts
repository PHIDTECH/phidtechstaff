import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { to_email, to_name, reset_link, expires_in } = await req.json();

    if (!to_email || !reset_link) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST ?? "smtp.gmail.com",
      port: Number(process.env.MAIL_PORT ?? 587),
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"PHIDTECH Management System" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: to_email,
      subject: "Password Reset — PHIDTECH Management System",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:12px 20px;">
              <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">PHIDTECH MS</span>
            </div>
            <p style="color:#bfdbfe;font-size:13px;margin:8px 0 0;">Management System · by Phid Technologies</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1e293b;font-size:22px;margin:0 0 8px;">Password Reset Request</h2>
            <p style="color:#64748b;font-size:15px;margin:0 0 28px;">Hello <strong>${to_name ?? "Administrator"}</strong>,</p>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">
              We received a request to reset the password for your PHIDTECH Management System administrator account.
              Click the button below to set a new password.
            </p>
            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="background:#2563eb;border-radius:8px;padding:0;">
                  <a href="${reset_link}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:8px;">
                    Reset My Password
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:12px;color:#475569;word-break:break-all;margin:0 0 28px;">
              ${reset_link}
            </p>
            <!-- Warning -->
            <table cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;width:100%;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="color:#92400e;font-size:13px;margin:0;">
                    ⏱ This link will expire in <strong>${expires_in ?? "1 hour"}</strong>.
                    If you did not request a password reset, you can safely ignore this email — your password will not change.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">© 2026 Phid Technologies Ltd · All rights reserved</p>
            <p style="color:#cbd5e1;font-size:11px;margin:6px 0 0;">phidtechnology@gmail.com · www.phidtechstaff.co.tz</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
      `,
      text: `Hello ${to_name ?? "Administrator"},\n\nYou requested a password reset for your PHIDTECH Management System account.\n\nReset link: ${reset_link}\n\nThis link expires in ${expires_in ?? "1 hour"}.\n\nIf you did not request this, please ignore this email.\n\n— PHIDTECH Management System`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email send error:", err);
    return NextResponse.json({ error: "Failed to send email. Please check SMTP configuration." }, { status: 500 });
  }
}
