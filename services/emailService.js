import nodemailer from 'nodemailer';
import crypto from 'crypto';

// ============================================================
// Email Service — OTP Delivery via Nodemailer / Gmail SMTP
// Falls back to console logging when SMTP is not configured.
// ============================================================

/**
 * Generate a cryptographically secure 6-digit OTP code.
 */
export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Create a Nodemailer transporter.
 * Returns null if SMTP credentials are not configured (dev fallback).
 */
function createTransporter() {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

  if (!smtpUser || !smtpPass) {
    return null; // No SMTP configured — will use dev fallback
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Build a professional HTML email template for OTP delivery.
 */
function buildOtpEmailHtml(otpCode, recipientName) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#047857 0%,#059669 100%);padding:32px 24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
            LendFlow Pro
          </h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">
            UC Cooperative Loan Monitoring
          </p>
        </div>

        <!-- Body -->
        <div style="padding:32px 24px;">
          <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;font-weight:600;">
            Hello${recipientName ? ` ${recipientName}` : ''},
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#525252;line-height:1.6;">
            Your one-time verification code for account registration is:
          </p>

          <!-- OTP Code Box -->
          <div style="text-align:center;margin:0 0 24px;">
            <div style="display:inline-block;background:#f0fdf4;border:2px solid #047857;border-radius:12px;padding:16px 32px;">
              <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#047857;font-family:'Courier New',monospace;">
                ${otpCode}
              </span>
            </div>
          </div>

          <p style="margin:0 0 8px;font-size:13px;color:#737373;line-height:1.5;">
            This code expires in <strong style="color:#1a1a1a;">10 minutes</strong>.
          </p>
          <p style="margin:0 0 0;font-size:13px;color:#737373;line-height:1.5;">
            If you did not request this verification, please ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#fafafa;padding:16px 24px;border-top:1px solid #e5e5e5;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a3a3a3;">
            &copy; ${new Date().getFullYear()} LendFlow Pro &mdash; UC COOP Loan Monitoring System
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send an OTP verification email.
 *
 * In development mode (no SMTP configured), the OTP is logged to console
 * and the function returns successfully so the flow still works for testing.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} [recipientName] - Optional name for personalization
 * @returns {Promise<{success: boolean, devMode: boolean}>}
 */
export async function sendOtpEmail(toEmail, otpCode, recipientName = '') {
  const transporter = createTransporter();

  if (!transporter) {
    // Development fallback — log OTP to console
    console.log('═══════════════════════════════════════════');
    console.log('  📧 DEV MODE — Email OTP (not sent)');
    console.log(`  To:   ${toEmail}`);
    console.log(`  OTP:  ${otpCode}`);
    console.log('═══════════════════════════════════════════');
    return { success: true, devMode: true };
  }

  // Production: send real email
  const mailOptions = {
    from: `"LendFlow Pro" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Your Verification Code — LendFlow Pro',
    html: buildOtpEmailHtml(otpCode, recipientName),
    text: `Your LendFlow Pro verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${toEmail}`);
    return { success: true, devMode: false };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${toEmail}:`, error.message);
    throw new Error('Failed to send verification email. Please try again later.');
  }
}
