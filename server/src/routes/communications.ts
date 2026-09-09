import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { authRequired, AuthRequest } from "../middleware/auth";
import { sendReviewRequestEmail } from "../services/email";
import { sendSms } from "../services/sms";

const whatsappReportSchema = z.object({
  businessId: z.string().min(1),
  frequency: z.enum(["weekly", "monthly", "none"]),
  test: z.boolean().optional(),
  ownerPhone: z.string().min(10).max(20).optional(),
});

function cleanIndianPhone(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) return `91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91") && /^[6-9]/.test(cleaned.slice(2))) return cleaned;
  if (cleaned.length === 11 && cleaned.startsWith("0") && /^[6-9]/.test(cleaned.slice(1))) return `91${cleaned.slice(1)}`;
  return null;
}

function topKeywords(texts: string[], limit = 5): { phrase: string; count: number }[] {
  const stop = new Set(["the","and","was","were","very","with","for","our","you","your","had","have","has","are","but","not","all","this","that","from","they","them","his","her","its","our","will","would","could","should","there","their","what","when","where","who","how","why","about","into","over","after","before","between","during","than","then","also","just","like","good","nice","great","ok","okay"]);
  const counts = new Map<string, number>();
  for (const t of texts) {
    const words = t.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !stop.has(w));
    // bigrams carry more signal ("waiting time", "staff behaviour")
    for (let i = 0; i < words.length; i++) {
      counts.set(words[i], (counts.get(words[i]) ?? 0) + 1);
      if (i + 1 < words.length) {
        const bi = `${words[i]} ${words[i + 1]}`;
        counts.set(bi, (counts.get(bi) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

async function sendWhatsAppText(to: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const env = getEnv();
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp API not configured" };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text.slice(0, 4000) } }),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await res.json();
    if (data.messages?.[0]?.id) return { success: true, messageId: data.messages[0].id };
    return { success: false, error: data.error?.message || "WhatsApp send failed" };
  } catch (err: any) {
    return { success: false, error: err.message || "WhatsApp send failed" };
  }
}

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

router.get("/whatsapp-report/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({ where: { id: businessId, userId: req.userId } });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const last = await prisma.activityLog.findFirst({
      where: { businessId, action: { in: ["whatsapp_report_saved", "whatsapp_report_sent", "whatsapp_report_test", "whatsapp_report_preview"] } },
      orderBy: { createdAt: "desc" },
    });
    const env = getEnv();
    res.json({
      preference: (last?.details as any)?.frequency ?? "none",
      ownerPhone: (last?.details as any)?.ownerPhone ?? null,
      deliveredVia: (last?.details as any)?.deliveredVia ?? null,
      updatedAt: last?.createdAt ?? null,
      whatsappConfigured: Boolean(env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID),
    });
  } catch (err) {
    console.error("WhatsApp report status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/whatsapp-report", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = whatsappReportSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    let ownerPhoneE164: string | null = null;
    if (data.ownerPhone) {
      ownerPhoneE164 = cleanIndianPhone(data.ownerPhone);
      if (!ownerPhoneE164) {
        return res.status(400).json({ error: "Invalid owner WhatsApp number. Use a 10-digit Indian mobile number." });
      }
    }

    const days = data.frequency === "weekly" ? 7 : data.frequency === "monthly" ? 30 : 7;
    const since = new Date(Date.now() - days * 86400000);

    const [recentFeedback, reviewClicks, prevFeedback] = await Promise.all([
      prisma.feedback.findMany({ where: { businessId: business.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" } }),
      prisma.reviewClick.count({ where: { businessId: business.id, createdAt: { gte: since } } }),
      prisma.feedback.findMany({ where: { businessId: business.id, createdAt: { gte: new Date(since.getTime() - days * 86400000), lt: since } } }),
    ]);

    const totalFeedback = recentFeedback.length;
    const avgRating = totalFeedback > 0
      ? Number((recentFeedback.reduce((s, f) => s + f.rating, 0) / totalFeedback).toFixed(1))
      : null;
    const prevAvg = prevFeedback.length > 0 ? prevFeedback.reduce((s, f) => s + f.rating, 0) / prevFeedback.length : null;
    const ratingDelta = avgRating != null && prevAvg != null ? Number((avgRating - prevAvg).toFixed(1)) : null;
    const velocityPerMonth = Number(((totalFeedback / days) * 30).toFixed(1));
    const conversion = totalFeedback > 0 ? Number(((reviewClicks / totalFeedback) * 100).toFixed(1)) : 0;
    const dist = [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: recentFeedback.filter((f) => f.rating === r).length }));
    const unresolved = recentFeedback.filter((f) => f.rating <= 2).length;
    const praises = topKeywords(recentFeedback.filter((f) => f.rating >= 4).map((f) => `${f.liked ?? ""} ${f.improvement ?? ""}`.trim()).filter(Boolean), 3);
    const complaints = topKeywords(recentFeedback.filter((f) => f.rating <= 3).map((f) => `${f.improvement ?? ""} ${f.liked ?? ""}`.trim()).filter(Boolean), 3);

    const lines = [
      `*${business.name} — ${data.frequency === "weekly" ? "Weekly" : data.frequency === "monthly" ? "Monthly" : "Reputation"} Pulse (last ${days}d)*`,
      `Feedback: ${totalFeedback} · Velocity: ~${velocityPerMonth}/mo`,
      `Avg rating: ${avgRating ?? "—"}${ratingDelta != null ? ` (${ratingDelta >= 0 ? "+" : ""}${ratingDelta} vs prior)` : ""}`,
      `Google-post taps: ${reviewClicks} (${conversion}% of feedback)`,
      `Rating split: ${dist.map((d) => `${d.rating}★:${d.count}`).join(" ")}`,
      praises.length ? `Top praise: ${praises.map((p) => `${p.phrase} (×${p.count})`).join(", ")}` : `Top praise: —`,
      complaints.length ? `Top issue: ${complaints.map((p) => `${p.phrase} (×${p.count})`).join(", ")}` : `Top issue: —`,
      unresolved > 0 ? `Action: ${unresolved} low-rating (1–2★) feedback needs follow-up` : `Action: no unresolved low ratings. Keep the QR visible at billing/checkout.`,
    ];
    if (data.test) lines.push(`(Preview — not an auto-delivery)`);
    const report = lines.join("\n");

    const env = getEnv();
    const whatsappConfigured = Boolean(env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID);

    let deliveredVia: "whatsapp" | "preview" = "preview";
    let delivery: { success: boolean; messageId?: string; error?: string } = { success: false, error: "WhatsApp API not configured" };
    // Only attempt a live WhatsApp send when: API configured + owner opted in with a number + explicit test.
    // Scheduled auto-delivery is intentionally NOT claimed until a scheduler + template approval exist.
    if (data.test && ownerPhoneE164 && whatsappConfigured) {
      delivery = await sendWhatsAppText(ownerPhoneE164, report);
      if (delivery.success) deliveredVia = "whatsapp";
    }

    if (!data.test) {
      console.log("--- WhatsApp Report Preference ---");
      console.log({ business: business.name, frequency: data.frequency, ownerPhone: ownerPhoneE164 ? "***" : null });
    } else {
      console.log("--- WhatsApp Report Preview ---");
      console.log(report);
      console.log("-------------------------------");
    }

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: data.test ? (deliveredVia === "whatsapp" ? "whatsapp_report_test" : "whatsapp_report_preview") : "whatsapp_report_saved",
        details: { frequency: data.frequency, days, totalFeedback, avgRating, velocityPerMonth, conversion, unresolved, ownerPhone: ownerPhoneE164 ? "***" : null, deliveredVia, messageId: delivery.messageId ?? null },
      },
    });

    res.json({
      success: true,
      report,
      metrics: { totalFeedback, avgRating, ratingDelta, velocityPerMonth, reviewClicks, conversion, dist, unresolved, praises, complaints },
      whatsappConfigured,
      deliveredVia,
      message:
        deliveredVia === "whatsapp"
          ? "Test report delivered to WhatsApp."
          : data.test
            ? whatsappConfigured
              ? "Preview generated. Add your WhatsApp number and retry test to deliver."
              : "Preview generated. WhatsApp Business API is not connected yet, so this was not sent to WhatsApp — connect it in server env (WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID) with an approved utility template to enable auto-delivery."
            : `Report preference saved (${data.frequency}). Auto-delivery activates once WhatsApp Business API is connected; until then use Send preview.`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("WhatsApp report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
