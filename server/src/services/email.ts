import nodemailer from "nodemailer";
import { getEnv } from "../config/env";
import { prisma } from "../config/database";
import { escapeHtml } from "../utils/billing";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || env.SMTP_PASS.startsWith("NEED_")) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465, // true for 465, false for other ports (like 587)
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000
    });
  }
  return transporter;
}

export async function sendFeedbackNotification(
  userId: string,
  businessName: string,
  rating: number,
  details?: { comment?: string; customerName?: string; purchaseInfo?: string }
) {
  const env = getEnv();
  const t = getTransporter();
  if (!t) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const isUrgent = rating <= 2;
  const locSuffix = details?.purchaseInfo ? ` [${details.purchaseInfo}]` : "";
  const subject = isUrgent
    ? `🚨 URGENT: Low Rating Alert (${rating}/5)${locSuffix} for ${businessName}`
    : `New ${rating}-star review${locSuffix} for ${businessName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; max-width: 600px; border: 1px solid ${isUrgent ? '#ef4444' : '#e2e8f0'}; border-radius: 12px; overflow: hidden;">
      <div style="background: ${isUrgent ? '#ef4444' : '#0d9488'}; padding: 18px 24px; color: white;">
        <h2 style="margin: 0; font-size: 20px;">${isUrgent ? '🚨 Customer Experience Alert' : 'New Feedback Received'}</h2>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${businessName}</p>
      </div>
      <div style="padding: 24px; background: white;">
        <p style="font-size: 16px; margin: 0 0 12px;">
          <strong>Rating:</strong> <span style="color: ${isUrgent ? '#ef4444' : '#f59e0b'}; font-size: 20px;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</span>
        </p>
        ${details?.purchaseInfo ? `<p style="margin: 4px 0; color: #475569;"><strong>Location / Attribution:</strong> <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 600; color: #0f172a;">${escapeHtml(details.purchaseInfo)}</span></p>` : ''}
        ${details?.customerName ? `<p style="margin: 4px 0; color: #475569;"><strong>Customer:</strong> ${escapeHtml(details.customerName)}</p>` : ''}
        ${details?.comment ? `
          <div style="background: #f8fafc; border-left: 4px solid ${isUrgent ? '#ef4444' : '#0d9488'}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #1e293b; font-style: italic;">"${escapeHtml(details.comment)}"</p>
          </div>
        ` : ''}
        ${isUrgent ? `
          <p style="color: #b91c1c; font-size: 13px; font-weight: 600; margin: 16px 0;">
            ⚠️ Fast resolution prevents public negative reviews. Check with your on-duty manager immediately.
          </p>
        ` : ''}
        <div style="margin-top: 24px;">
          <a href="${env.FRONTEND_URL.split(",")[0].trim()}/dashboard/inbox" style="display: inline-block; padding: 12px 24px; background: ${isUrgent ? '#ef4444' : '#0d9488'}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">View In Inbox & Respond</a>
        </div>
      </div>
    </div>
  `;

  await t.sendMail({
    from: env.SMTP_FROM,
    to: user.email,
    subject,
    html,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  const env = getEnv();
  const t = getTransporter();
  if (!t) return;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2>Welcome to BEYONDVYU!</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your account is ready. Start collecting authentic reviews from your customers today.</p>
      <ul>
        <li>Create your business profile</li>
        <li>Generate QR codes for review collection</li>
        <li>Manage and respond to reviews</li>
      </ul>
      <a href="${env.FRONTEND_URL.split(",")[0].trim()}/onboarding" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 6px;">Get Started</a>
    </div>
  `;

  await t.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Welcome to BEYONDVYU",
    html,
  });
}

export async function sendPasswordResetEmail(email: string, name: string, resetLink: string) {
  const env = getEnv();
  const t = getTransporter();
  if (!t) return;

  const html = `
    <div style="font-family: sans-serif; max-width: 560px;">
      <h2>Reset your BEYONDVYU password</h2>
      <p>Hi ${escapeHtml(name || "there")},</p>
      <p>We received a request to reset the password for your BEYONDVYU account. Click the button below to set a new password. This link expires in 15 minutes.</p>
      <a href="${escapeHtml(resetLink)}" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
      <p style="margin-top: 24px; color: #666; font-size: 13px;">If you did not request a password reset, please ignore this email. No changes have been made to your account.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">This link expires in 15 minutes. If it has expired, request a new reset from the BEYONDVYU login page.</p>
    </div>
  `;

  await t.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Reset your BEYONDVYU password",
    html,
  });
}

interface SendReviewRequestOptions {
  toEmail: string;
  businessName: string;
  reviewUrl: string;
  customTemplate?: string;
  businessId?: string;
}

export async function sendReviewRequestEmail(options: SendReviewRequestOptions): Promise<{ success: boolean; error?: string }> {
  const env = getEnv();
  const t = getTransporter();
  if (!t) {
    return { success: false, error: "SMTP not configured" };
  }

  let messageBody: string;

  if (options.customTemplate) {
    messageBody = options.customTemplate
      .replace(/\{\{business_name\}\}/g, options.businessName)
      .replace(/\{\{review_url\}\}/g, options.reviewUrl);
  } else {
    messageBody = `Hi there,

We'd love to hear your feedback on your recent visit to ${options.businessName}.

Please take 1 minute to share your experience here:
${options.reviewUrl}

Thank you!
- The ${options.businessName} Team`;
  }

  const htmlBody = messageBody.split("\n").map(line => line.trim() ? `<p>${line}</p>` : "<br>").join("\n");

  const styledHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: #f9fafb; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
        ${htmlBody}
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
          Powered by BEYONDVYU
        </div>
      </div>
    </div>
  `;

  try {
    await t.sendMail({
      from: env.SMTP_FROM,
      to: options.toEmail,
      subject: `How was your visit to ${options.businessName}?`,
      text: messageBody,
      html: styledHtml,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Send review request email error:", err);
    return { success: false, error: err.message || "Failed to send email" };
  }
}

/**
 * Email the owner a secure top-up link when auto top-up triggers. Without
 * notifying anyone the generated link is useless — the previous implementation
 * created the link silently and no one ever saw it.
 */
export async function sendTopUpLinkEmail(
  userId: string,
  credits: number,
  amountPaise: number,
  linkUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const env = getEnv();
  const t = getTransporter();
  if (!t) {
    console.warn("Auto top-up link created but SMTP is not configured; user was not notified.");
    return { success: false, error: "SMTP not configured" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user?.email) return { success: false, error: "No email on file" };

  const amount = (amountPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  try {
    await t.sendMail({
      from: env.SMTP_FROM,
      to: user.email,
      subject: `Your BEYONDVYU AI credits are running low`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="background: #f9fafb; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
            <h2 style="margin: 0 0 12px; color: #0f172a;">Running low on AI credits</h2>
            <p style="color: #334155; line-height: 1.6;">Hi ${escapeHtml(user.name || "there")},</p>
            <p style="color: #334155; line-height: 1.6;">
              You asked us to remind you when your balance drops below your threshold.
              Add <strong>${credits.toLocaleString("en-IN")} credits</strong> for
              <strong>₹${escapeHtml(amount)}</strong> using the secure link below.
            </p>
            <p style="margin: 24px 0;">
              <a href="${escapeHtml(linkUrl)}" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Top up now</a>
            </p>
            <p style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
              This is a reminder only — no payment is taken automatically. If you didn't request it, ignore this email.
            </p>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Send top-up link email error:", err);
    return { success: false, error: err?.message || "Failed to send email" };
  }
}
