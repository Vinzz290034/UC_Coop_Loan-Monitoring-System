import nodemailer from 'nodemailer';
import crypto from 'crypto';

// ============================================================
// Email Service — OTP & Notification Delivery
// Supports Brevo (API / SMTP), Gmail, and custom SMTP providers.
// Falls back to console logging in development mode when unconfigured.
// ============================================================

/**
 * Generate a cryptographically secure 6-digit OTP code.
 */
export function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Resolve unified email configuration from environment variables.
 * Supports:
 * - EMAIL_SERVICE / SMTP_SERVICE ('brevo', 'gmail', etc.)
 * - EMAIL_FROM / SMTP_FROM / SMTP_USER / EMAIL_USER
 * - EMAIL_PASSWORD / EMAIL_PASS / SMTP_PASS / BREVO_API_KEY
 * - SMTP_HOST / EMAIL_HOST
 * - SMTP_PORT / EMAIL_PORT
 */
function getEmailConfig() {
  const service = (process.env.EMAIL_SERVICE || process.env.SMTP_SERVICE || '').trim().toLowerCase();
  const fromEmail = (process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const apiKey = (process.env.BREVO_API_KEY || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const host = (process.env.SMTP_HOST || process.env.EMAIL_HOST || (service === 'brevo' ? 'smtp-relay.brevo.com' : 'smtp.gmail.com')).trim();
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || fromEmail).trim();

  const isBrevo = service === 'brevo' || apiKey.startsWith('xkeysib-') || host.includes('brevo') || host.includes('sendinblue');
  const isGmail = service === 'gmail' || (!isBrevo && (host.includes('gmail') || fromEmail.toLowerCase().endsWith('@gmail.com')));

  return {
    service,
    fromEmail,
    apiKey,
    user,
    host,
    port,
    isBrevo,
    isGmail,
  };
}

/**
 * Send an email directly via Brevo REST API (HTTPS).
 * Highly reliable on cloud platforms (Railway, Render, Vercel) with no SMTP port blockage.
 */
async function sendViaBrevoApi({ apiKey, fromEmail, toEmail, recipientName, subject, html, text }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Coop Sync',
          email: fromEmail || 'noreply@ucmetc.coop',
        },
        to: [
          {
            email: toEmail,
            name: recipientName || 'Member',
          },
        ],
        subject: subject,
        htmlContent: html,
        textContent: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Brevo API returned status ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    console.log(`✅ [Brevo API] Email delivered successfully to ${toEmail} (messageId: ${data.messageId || 'ok'})`);
    return { success: true, devMode: false };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Brevo API request timed out after 12 seconds');
    }
    throw error;
  }
}

/**
 * Create a Nodemailer transporter for SMTP delivery.
 */
function createTransporter(config) {
  const { user, apiKey, host, port, isBrevo, isGmail } = config;

  if (!user || !apiKey) {
    return null; // No SMTP configured — will use dev fallback
  }

  if (isBrevo) {
    return nodemailer.createTransport({
      host: host || 'smtp-relay.brevo.com',
      port: port || 587,
      secure: port === 465,
      auth: {
        user: user,
        pass: apiKey,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: user,
        pass: apiKey,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465,
    auth: {
      user: user,
      pass: apiKey,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' && process.env.SMTP_ALLOW_INVALID_CERTS !== 'true',
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Build a professional HTML email template for OTP delivery.
 */
function buildOtpEmailHtml(otpCode, recipientName, purpose = 'registration') {
  const purposeText = purpose === 'password_reset'
    ? 'Your one-time verification code for password reset is:'
    : 'Your one-time verification code for account registration is:';

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
            Coop Sync
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
            ${purposeText}
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
            &copy; ${new Date().getFullYear()} Coop Sync &mdash; UC COOP Loan Monitoring System
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
 * In development mode (no credentials configured), the OTP is logged to console
 * and the function returns successfully so the flow works for testing.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} [recipientName] - Optional name for personalization
 * @param {string} [purpose] - Purpose of OTP ('registration' or 'password_reset')
 * @returns {Promise<{success: boolean, devMode: boolean}>}
 */
export async function sendOtpEmail(toEmail, otpCode, recipientName = '', purpose = 'registration') {
  const config = getEmailConfig();
  const emailSubject = purpose === 'password_reset'
    ? 'Reset Your Password — Coop Sync'
    : 'Your Verification Code — Coop Sync';

  const plainText = purpose === 'password_reset'
    ? `Your Coop Sync password reset verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`
    : `Your Coop Sync verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.`;

  const htmlContent = buildOtpEmailHtml(otpCode, recipientName, purpose);

  if (!config.apiKey) {
    // Development fallback — log OTP to console
    console.log('═══════════════════════════════════════════');
    console.log(`  📧 DEV MODE — Email OTP for ${purpose} (not sent)`);
    console.log(`  To:   ${toEmail}`);
    console.log(`  OTP:  ${otpCode}`);
    console.log('═══════════════════════════════════════════');
    return { success: true, devMode: true };
  }

  // 1. If Brevo is configured, try Brevo HTTPS API first (fastest, immune to cloud SMTP port blocks)
  if (config.isBrevo) {
    try {
      return await sendViaBrevoApi({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        toEmail,
        recipientName,
        subject: emailSubject,
        html: htmlContent,
        text: plainText,
      });
    } catch (brevoApiErr) {
      console.warn(`⚠️ Brevo API failed (${brevoApiErr.message}), falling back to SMTP...`);
    }
  }

  // 2. SMTP Transporter (Brevo SMTP / Gmail / Custom SMTP)
  const transporter = createTransporter(config);
  if (!transporter) {
    throw new Error('Email credentials incomplete. Please check EMAIL_FROM and EMAIL_PASSWORD.');
  }

  const mailOptions = {
    from: `"Coop Sync" <${config.fromEmail || config.user}>`,
    to: toEmail,
    subject: emailSubject,
    html: htmlContent,
    text: plainText,
  };

  try {
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP email connection timed out after 12 seconds.')), 12000)
    );
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ [SMTP] OTP email sent successfully to ${toEmail}`);
    return { success: true, devMode: false };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${toEmail}:`, error.message);
    throw new Error(`Failed to send verification email (${error.message || 'connection timeout'}). Please try again or contact support.`);
  }
}

/**
 * Build a professional HTML email template for contact inquiry replies.
 */
function buildContactReplyHtml(recipientName, replyContent) {
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
            Coop Sync
          </h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:700;">
            UC Cooperative — Support Response
          </p>
        </div>

        <!-- Body -->
        <div style="padding:32px 24px;">
          <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;font-weight:600;">
            Hello${recipientName ? ` ${recipientName}` : ''},
          </p>
          <p style="margin:0 0 16px;font-size:14px;color:#525252;line-height:1.6;">
            Thank you for reaching out to us. Here is our response to your inquiry:
          </p>

          <!-- Reply Content Box -->
          <div style="background:#f0fdf4;border-left:4px solid #047857;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
            <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.7;white-space:pre-wrap;">${replyContent}</p>
          </div>

          <p style="margin:0;font-size:13px;color:#737373;line-height:1.5;">
            If you have further questions, feel free to reply to this email or submit a new inquiry through our website.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#fafafa;padding:16px 24px;border-top:1px solid #e5e5e5;text-align:center;">
          <p style="margin:0;font-size:11px;color:#a3a3a3;">
            &copy; ${new Date().getFullYear()} Coop Sync &mdash; UC COOP Loan Monitoring System
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send a reply email to a contact inquiry sender.
 *
 * @param {string} toEmail - Recipient email address
 * @param {string} recipientName - Contact sender's name
 * @param {string} replyContent - The reply message content
 * @returns {Promise<{success: boolean, devMode: boolean}>}
 */
export async function sendContactReply(toEmail, recipientName, replyContent) {
  const config = getEmailConfig();
  const subject = 'Re: Your Inquiry — Coop Sync Cooperative';
  const htmlContent = buildContactReplyHtml(recipientName, replyContent);
  const textContent = `Hello ${recipientName},\n\nThank you for reaching out. Here is our response:\n\n${replyContent}\n\nIf you have further questions, feel free to reply.\n\n— Coop Sync Support`;

  if (!config.apiKey) {
    console.log('═══════════════════════════════════════════');
    console.log(`  📧 DEV MODE — Contact Reply (not sent)`);
    console.log(`  To:   ${toEmail}`);
    console.log(`  Name: ${recipientName}`);
    console.log(`  Reply: ${replyContent.slice(0, 200)}`);
    console.log('═══════════════════════════════════════════');
    return { success: true, devMode: true };
  }

  // 1. Try Brevo REST API if configured
  if (config.isBrevo) {
    try {
      return await sendViaBrevoApi({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        toEmail,
        recipientName,
        subject,
        html: htmlContent,
        text: textContent,
      });
    } catch (brevoApiErr) {
      console.warn(`⚠️ Brevo API failed (${brevoApiErr.message}), falling back to SMTP...`);
    }
  }

  // 2. SMTP Transporter
  const transporter = createTransporter(config);
  if (!transporter) {
    throw new Error('Email credentials incomplete. Please check EMAIL_FROM and EMAIL_PASSWORD.');
  }

  const mailOptions = {
    from: `"Coop Sync Support" <${config.fromEmail || config.user}>`,
    to: toEmail,
    subject,
    html: htmlContent,
    text: textContent,
  };

  try {
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP email connection timed out after 12 seconds.')), 12000)
    );
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ [SMTP] Contact reply sent successfully to ${toEmail}`);
    return { success: true, devMode: false };
  } catch (error) {
    console.error(`❌ Failed to send contact reply to ${toEmail}:`, error.message);
    throw new Error(`Failed to send reply email (${error.message || 'connection timeout'}). Please try again later.`);
  }
}

