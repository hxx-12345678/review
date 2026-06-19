import nodemailer from "nodemailer";
import { getEnv } from "../config/env";
import { prisma } from "../config/database";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_USER) {
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
      }
    });
  }
  return transporter;
}

export async function sendFeedbackNotification(userId: string, businessName: string, rating: number) {
  const env = getEnv();
  const t = getTransporter();
  if (!t) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const subject = `New ${rating}-star review for ${businessName}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px;">
      <h2>New Feedback Received</h2>
      <p><strong>Business:</strong> ${businessName}</p>
      <p><strong>Rating:</strong> ${"★".repeat(rating)}${"☆".repeat(5 - rating)}</p>
      <p style="color: #666;">Log in to ReviewOS to view the full feedback and respond.</p>
      <a href="${env.FRONTEND_URL}/dashboard/inbox" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 6px;">View Feedback</a>
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
      <h2>Welcome to ReviewOS!</h2>
      <p>Hi ${name || "there"},</p>
      <p>Your account is ready. Start collecting authentic reviews from your customers today.</p>
      <ul>
        <li>Create your business profile</li>
        <li>Generate QR codes for review collection</li>
        <li>Manage and respond to reviews</li>
      </ul>
      <a href="${env.FRONTEND_URL}/onboarding" style="display: inline-block; padding: 12px 24px; background: #0d9488; color: white; text-decoration: none; border-radius: 6px;">Get Started</a>
    </div>
  `;

  await t.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: "Welcome to ReviewOS",
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
          Powered by ReviewOS
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
