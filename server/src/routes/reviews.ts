import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

const generateDraftSchema = z.object({
  feedbackId: z.string(),
  businessId: z.string(),
});

const saveDraftSchema = z.object({
  feedbackId: z.string(),
  businessId: z.string(),
  content: z.string().min(1).max(5000),
});

router.post("/generate-draft", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = generateDraftSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const feedback = await prisma.feedback.findFirst({
      where: { id: data.feedbackId, businessId: data.businessId },
    });
    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    const draft = buildDraftFromFeedback(feedback);

    const reviewDraft = await prisma.reviewDraft.upsert({
      where: { feedbackId: data.feedbackId },
      create: {
        feedbackId: data.feedbackId,
        businessId: data.businessId,
        content: draft,
      },
      update: { content: draft },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: data.businessId,
        action: "draft_generated",
        details: { feedbackId: data.feedbackId },
      },
    });

    res.json({ draft: reviewDraft });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Generate draft error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/save-draft", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = saveDraftSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const reviewDraft = await prisma.reviewDraft.upsert({
      where: { feedbackId: data.feedbackId },
      create: {
        feedbackId: data.feedbackId,
        businessId: data.businessId,
        content: data.content,
      },
      update: { content: data.content },
    });

    res.json({ draft: reviewDraft });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Save draft error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUBLIC endpoint — called by the customer (not the business owner) when they
 * tap "Write your review on Google". No auth token is available in the customer
 * flow. Security notes:
 *
 * - feedbackId is a CUID (25-char, cryptographically random) — not guessable.
 * - We look up the businessId FROM the feedback record in the DB, so the caller
 *   cannot spoof a different business.
 * - The only effect is incrementing a click counter and updating feedback status.
 *   No sensitive data is returned or modified in any harmful way.
 * - Rate limiting at the API gateway level (apiLimiter) still applies.
 */
router.post("/track-click", async (req: Request, res: Response) => {
  try {
    // Strict schema: only accept a CUID-shaped feedbackId — no other params.
    const { feedbackId } = z
      .object({
        feedbackId: z
          .string()
          .min(20)
          .max(30)
          .regex(/^c[a-z0-9]+$/, "Invalid feedback ID format"),
      })
      .parse(req.body);

    // Look up the feedback to resolve the businessId server-side.
    // This prevents any caller from associating a click with an arbitrary business.
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: {
        id: true,
        businessId: true,
        status: true,
        business: { select: { id: true, userId: true } },
      },
    });

    if (!feedback) {
      // Return 200 to avoid leaking whether an ID exists (prevents enumeration).
      return res.json({ success: true });
    }

    // Idempotent: if already redirected, don't double-count.
    if (feedback.status === "REDIRECTED_TO_GOOGLE") {
      return res.json({ success: true });
    }

    // Create the click record and update status atomically in a transaction.
    await prisma.$transaction([
      prisma.reviewClick.create({
        data: {
          feedbackId: feedback.id,
          businessId: feedback.businessId,
          type: "google_redirect",
        },
      }),
      prisma.feedback.update({
        where: { id: feedback.id },
        data: { status: "REDIRECTED_TO_GOOGLE" },
      }),
      prisma.activityLog.create({
        data: {
          userId: feedback.business.userId,
          businessId: feedback.businessId,
          action: "google_click",
          details: { feedbackId: feedback.id },
        },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Return generic error — don't expose internal field names.
      return res.status(400).json({ error: "Invalid request" });
    }
    console.error("Track click error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const [
      totalFeedback,
      totalDrafts,
      totalClicks,
      recentFeedback,
      ratingDistribution,
    ] = await Promise.all([
      prisma.feedback.count({ where: { businessId: business.id } }),
      prisma.reviewDraft.count({ where: { businessId: business.id } }),
      prisma.reviewClick.count({ where: { businessId: business.id } }),
      prisma.feedback.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { reviewDraft: true },
      }),
      prisma.feedback.groupBy({
        by: ["rating"],
        where: { businessId: business.id },
        _count: true,
      }),
    ]);

    const conversionRate = totalFeedback > 0
      ? Math.round((totalClicks / totalFeedback) * 100)
      : 0;

    res.json({
      stats: {
        totalFeedback,
        totalDrafts,
        totalClicks,
        conversionRate,
        ratingDistribution: ratingDistribution.map((r) => ({
          rating: r.rating,
          count: r._count,
        })),
      },
      recentFeedback,
    });
  } catch (err) {
    console.error("Get stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function buildDraftFromFeedback(feedback: any): string {
  const parts: string[] = [];

  if (feedback.purchaseInfo) {
    parts.push(`I recently visited and ${feedback.purchaseInfo.toLowerCase()}.`);
  }

  if (feedback.liked) {
    parts.push(`What stood out to me was ${feedback.liked.toLowerCase()}.`);
  }

  if (feedback.rating >= 4) {
    parts.push("I had a great experience and would recommend them.");
  } else if (feedback.rating === 3) {
    parts.push("It was a decent experience overall.");
  } else {
    parts.push("There is room for improvement in their service.");
  }

  return parts.join(" ");
}

export default router;
