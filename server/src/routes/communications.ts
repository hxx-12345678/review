import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { authRequired, AuthRequest } from "../middleware/auth";
import { sendReviewRequestEmail } from "../services/email";
import { sendSms } from "../services/sms";

const router = Router();

const sendEmailSchema = z.object({
  businessId: z.string().min(1),
  toEmail: z.string().email(),
  customMessage: z.string().max(500).optional(),
});

const sendSmsSchema = z.object({
  businessId: z.string().min(1),
  toPhone: z.string().min(5).max(20),
  customMessage: z.string().max(300).optional(),
});

router.post("/send-email", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendEmailSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const env = getEnv();
    const reviewUrl = `${env.FRONTEND_URL.split(",")[0].trim()}/r/${business.slug}`;
    const templateToUse = data.customMessage || business.emailTemplate || undefined;

    const result = await sendReviewRequestEmail({
      toEmail: data.toEmail,
      businessName: business.name,
      reviewUrl,
      customTemplate: templateToUse,
    });

    if (!result.success) {
      return res.status(502).json({ error: result.error || "Failed to send email" });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "review_request_email_sent",
        details: { toEmail: data.toEmail },
      },
    });

    res.json({ success: true, message: `Review request sent to ${data.toEmail}` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Send email error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/send-sms", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendSmsSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const env = getEnv();
    const reviewUrl = `${env.FRONTEND_URL.split(",")[0].trim()}/r/${business.slug}`;

    let message: string;
    if (data.customMessage) {
      message = data.customMessage
        .replace(/\{\{business_name\}\}/g, business.name)
        .replace(/\{\{review_url\}\}/g, reviewUrl);
    } else if (business.smsTemplate) {
      message = business.smsTemplate
        .replace(/\{\{business_name\}\}/g, business.name)
        .replace(/\{\{review_url\}\}/g, reviewUrl);
    } else {
      message = `Share your feedback about ${business.name}: ${reviewUrl}`;
    }

    if (message.length > 300) {
      message = message.substring(0, 297) + "...";
    }

    const result = await sendSms(data.toPhone, message);

    if (!result.success) {
      return res.status(502).json({ error: result.error || "Failed to send SMS" });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "review_request_sms_sent",
        details: { toPhone: data.toPhone, messageId: result.messageId },
      },
    });

    res.json({ success: true, message: `Review request SMS sent to ${data.toPhone}` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Send SMS error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
