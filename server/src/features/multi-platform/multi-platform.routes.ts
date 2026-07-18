import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { authRequired, AuthRequest } from "../../middleware/auth";
import { sendSms } from "../../services/sms";
import { sendReviewRequestEmail } from "../../services/email";
import { sendWhatsAppReviewFlow } from "../whatsapp-flows/whatsapp-flows.service";

const router = Router();

const sendMultiSchema = z.object({
  businessId: z.string().min(1),
  channels: z.array(z.enum(["sms", "whatsapp", "email"])).min(1),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
  customMessage: z.string().max(500).optional(),
});

const sendSequentialSchema = z.object({
  businessId: z.string().min(1),
  phoneNumber: z.string().min(5).max(20).optional(),
  email: z.string().email().optional(),
  customerName: z.string().max(100).optional(),
  delayMinutes: z.number().min(1).max(4320).default(1440), // default 24h
});

router.post("/send", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendMultiSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const env = getEnv();
    const reviewUrl = `${env.FRONTEND_URL.split(",")[0].trim()}/r/${business.slug}`;
    const results: Record<string, any> = {};

    // Send via selected channels in parallel
    const promises: Promise<void>[] = [];

    if (data.channels.includes("sms") && data.phoneNumber) {
      promises.push(
        (async () => {
          const message = data.customMessage
            ? data.customMessage.replace(/\{\{business_name\}\}/g, business.name).replace(/\{\{review_url\}\}/g, reviewUrl)
            : business.smsTemplate?.replace(/\{\{business_name\}\}/g, business.name).replace(/\{\{review_url\}\}/g, reviewUrl)
              || `Share your feedback about ${business.name}: ${reviewUrl}`;

          const result = await sendSms(data.phoneNumber!, message);
          results.sms = result;

          if (result.success) {
            await prisma.crossPlatformMessage.create({
              data: {
                businessId: business.id,
                platform: "sms",
                externalId: result.messageId,
                direction: "outbound",
                authorName: business.name,
                content: message,
                contentType: "text",
                status: "read",
              },
            });
            await prisma.activityLog.create({
              data: {
                userId: req.userId!,
                businessId: business.id,
                action: "multi_platform_sms_sent",
                details: { phoneNumber: data.phoneNumber },
              },
            });
          }
        })(),
      );
    }

    if (data.channels.includes("email") && data.email) {
      promises.push(
        (async () => {
          const result = await sendReviewRequestEmail({
            toEmail: data.email!,
            businessName: business.name,
            reviewUrl,
            customTemplate: data.customMessage || undefined,
          });
          results.email = result;

          if (result.success) {
            await prisma.crossPlatformMessage.create({
              data: {
                businessId: business.id,
                platform: "email",
                direction: "outbound",
                authorName: business.name,
                content: data.customMessage || `Review request sent to ${data.email}`,
                contentType: "text",
                status: "read",
              },
            });
            await prisma.activityLog.create({
              data: {
                userId: req.userId!,
                businessId: business.id,
                action: "multi_platform_email_sent",
                details: { email: data.email },
              },
            });
          }
        })(),
      );
    }

    if (data.channels.includes("whatsapp") && data.phoneNumber) {
      promises.push(
        (async () => {
          const result = await sendWhatsAppReviewFlow(
            data.phoneNumber!,
            business.name,
            data.customerName,
          );
          results.whatsapp = result;

          if (result.success) {
            await prisma.activityLog.create({
              data: {
                userId: req.userId!,
                businessId: business.id,
                action: "multi_platform_whatsapp_sent",
                details: { phoneNumber: data.phoneNumber },
              },
            });
          }
        })(),
      );
    }

    await Promise.all(promises);

    res.json({
      success: true,
      results,
      channelsSent: Object.keys(results).filter((k) => results[k]?.success).length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Multi-platform send error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/send-sequential", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendSequentialSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const env = getEnv();
    const reviewUrl = `${env.FRONTEND_URL.split(",")[0].trim()}/r/${business.slug}`;
    const now = new Date();

    // Create a schedule: SMS first, WhatsApp at delay, email at 2x delay
    const schedule = [];

    if (data.phoneNumber) {
      schedule.push({
        channel: "sms" as const,
        to: data.phoneNumber,
        scheduledAt: new Date(now.getTime() + 5 * 60 * 1000), // SMS in 5 min
      });
      schedule.push({
        channel: "whatsapp" as const,
        to: data.phoneNumber,
        scheduledAt: new Date(now.getTime() + data.delayMinutes * 60 * 1000),
      });
    }

    if (data.email) {
      schedule.push({
        channel: "email" as const,
        to: data.email,
        scheduledAt: new Date(now.getTime() + data.delayMinutes * 2 * 60 * 1000),
      });
    }

    // Store schedule entries
    for (const item of schedule) {
      await prisma.crossPlatformMessage.create({
        data: {
          businessId: business.id,
          platform: item.channel,
          direction: "outbound",
          authorName: business.name,
          content: `Scheduled ${item.channel} review request to ${item.to}`,
          status: "unread",
          conversationId: `scheduled-${business.id}-${now.getTime()}`,
        },
      });
    }

    // Execute immediately for SMS (first touch)
    if (schedule[0]?.channel === "sms" && data.phoneNumber) {
      const smsMessage = business.smsTemplate?.replace(/\{\{business_name\}\}/g, business.name).replace(/\{\{review_url\}\}/g, reviewUrl)
        || `Share your feedback about ${business.name}: ${reviewUrl}`;
      await sendSms(data.phoneNumber, smsMessage);
    }

    res.json({
      success: true,
      schedule: schedule.map((s) => ({ channel: s.channel, to: s.to, scheduledAt: s.scheduledAt })),
      message: `Sequential review request flow started. SMS sent now, WhatsApp in ${data.delayMinutes} min, email in ${data.delayMinutes * 2} min.`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Sequential send error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/logs/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const logs = await prisma.activityLog.findMany({
      where: {
        businessId,
        action: { in: ["multi_platform_sms_sent", "multi_platform_email_sent", "multi_platform_whatsapp_sent", "review_request_email_sent", "review_request_sms_sent"] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ logs });
  } catch (err) {
    console.error("List logs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

