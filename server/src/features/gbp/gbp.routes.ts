import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { authRequired, AuthRequest } from "../../middleware/auth";
import { parseStoredLocation, getDecryptedToken } from "../../services/google-business-api";

const router = Router();

const replySchema = z.object({
  reviewId: z.string().min(1),
  replyText: z.string().min(1).max(2000),
});

const bulkReplySchema = z.object({
  reviewIds: z.array(z.string().min(1)).min(1).max(50),
  replyText: z.string().min(1).max(2000),
});

function qs(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0];
  return undefined;
}

function qsn(val: unknown): number | undefined {
  const s = qs(val);
  if (s === undefined) return undefined;
  const n = Number(s);
  return isNaN(n) ? undefined : n;
}

router.get("/reviews/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const status = qs(req.query.status);
    const minRating = qsn(req.query.minRating);
    const sort = qs(req.query.sort) || "newest";

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const where: Record<string, unknown> = { businessId };
    if (status) where.replyStatus = status;
    if (minRating) where.starRating = { gte: minRating };

    const reviews = await prisma.googleReview.findMany({
      where,
      include: { googleAccount: true },
      orderBy: sort === "oldest" ? { createTime: "asc" as const } : { createTime: "desc" as const },
      take: 200,
    });

    res.json({ reviews, total: reviews.length });
  } catch (err) {
    console.error("List GBP reviews error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reviews/reply", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = replySchema.parse(req.body);

    const review = await prisma.googleReview.findUnique({
      where: { id: data.reviewId },
      include: { googleAccount: true },
    });
    if (!review) return res.status(404).json({ error: "Review not found" });

    const business = await prisma.business.findFirst({
      where: { id: review.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const env = getEnv();

    // GBP Direct: use encrypted token + correct accountId/locationId
    let gbpSuccess = false;
    try {
      const account = review.googleAccount;
      if (account) {
        const token = (() => { try { return getDecryptedToken(account); } catch { return (account as any).accessToken || ""; } })();
        if (token) {
          const { accountId, locationId } = parseStoredLocation(account);
          const gbpRes = await fetch(
            `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${review.googleReviewId}/reply`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ comment: data.replyText }),
            },
          );
          gbpSuccess = gbpRes.ok;
          if (!gbpRes.ok) {
            const body = await gbpRes.text().catch(() => "");
            console.warn(`GBP API reply failed ${gbpRes.status}:`, body);
          }
        }
      }
    } catch (apiErr) {
      console.warn("GBP API reply failed, saving locally:", apiErr);
    }

    const updated = await prisma.googleReview.update({
      where: { id: data.reviewId },
      data: {
        reviewReply: data.replyText,
        replyStatus: "REPLIED",
      },
    });

    const existingInbox = await prisma.crossPlatformMessage.findFirst({
      where: { platform: "google", externalId: data.reviewId, businessId: review.businessId },
    });
    if (existingInbox) {
      await prisma.crossPlatformMessage.update({
        where: { id: existingInbox.id },
        data: { replyText: data.replyText, repliedAt: new Date(), status: "replied" },
      });
    } else {
      await prisma.crossPlatformMessage.create({
        data: {
          businessId: review.businessId,
          platform: "google",
          externalId: data.reviewId,
          direction: "outbound",
          authorName: business.name,
          content: data.replyText,
          status: "replied",
          repliedAt: new Date(),
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: review.businessId,
        action: "gbp_reply_posted",
        details: { reviewId: data.reviewId, postedToGoogle: gbpSuccess, rating: review.starRating },
      },
    });

    res.json({ success: true, review: updated, postedToGoogle: gbpSuccess });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("GBP reply error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reviews/bulk-reply", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = bulkReplySchema.parse(req.body);

    const reviews = await prisma.googleReview.findMany({
      where: { id: { in: data.reviewIds } },
      include: { googleAccount: true },
    });

    if (reviews.length === 0) {
      return res.status(404).json({ error: "No reviews found" });
    }

    const business = await prisma.business.findFirst({
      where: { id: reviews[0].businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    let updatedCount = 0;
    for (const review of reviews) {
      await prisma.googleReview.update({
        where: { id: review.id },
        data: { reviewReply: data.replyText, replyStatus: "REPLIED" },
      });
      updatedCount++;
    }

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "gbp_bulk_reply",
        details: { count: updatedCount, reviewIds: data.reviewIds },
      },
    });

    res.json({ success: true, updatedCount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Bulk reply error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reviews/:reviewId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = req.params.reviewId as string;

    const review = await prisma.googleReview.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: "Review not found" });

    const business = await prisma.business.findFirst({
      where: { id: review.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const account = await prisma.googleAccount.findUnique({ where: { id: review.googleAccountId } });
    if (account?.googleAccountId) {
      try {
        const token = (() => { try { return getDecryptedToken(account); } catch { return (account as any).accessToken || ""; } })();
        if (token) {
          const { accountId, locationId } = parseStoredLocation(account);
          await fetch(
            `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${review.googleReviewId}/reply`,
            { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
          );
        }
      } catch {
        // Continue even if API delete fails
      }
    }

    await prisma.googleReview.delete({ where: { id: reviewId } });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "gbp_review_deleted",
        details: { reviewId, rating: review.starRating, reviewerName: review.reviewerName },
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete review error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sync/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    // Direct GBP sync via canonical service (handles encrypted token + correct accountId/locationId)
    try {
      const { syncGoogleReviews } = await import("../../services/google-business-api");
      const result = await syncGoogleReviews(businessId);
      await prisma.activityLog.create({
        data: { userId: req.userId!, businessId, action: "gbp_reviews_synced", details: { synced: result.synced, total: result.total } },
      }).catch(() => {});
      return res.json({ success: true, synced: result.synced, total: result.total });
    } catch (svcErr: any) {
      console.warn("GBP direct sync failed, attempting Places fallback hint:", svcErr?.message);
      return res.status(400).json({ error: svcErr?.message || "GBP sync failed — check Google Business Profile verification and API approval. Places API fallback: set googlePlaceId + GOOGLE_PLACES_API_KEY." });
    }
  } catch (err) {
    console.error("GBP sync error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const total = await prisma.googleReview.count({ where: { businessId } });
    const needsReply = await prisma.googleReview.count({
      where: { businessId, replyStatus: "NEEDS_REPLY" },
    });
    const replied = await prisma.googleReview.count({
      where: { businessId, replyStatus: "REPLIED" },
    });
    const avgRating = await prisma.googleReview.aggregate({
      where: { businessId },
      _avg: { starRating: true },
    });
    const ratingDistribution = await prisma.googleReview.groupBy({
      by: ["starRating"],
      where: { businessId },
      _count: true,
    });

    res.json({
      total,
      needsReply,
      replied,
      averageRating: avgRating._avg?.starRating
        ? Number(avgRating._avg.starRating.toFixed(1))
        : null,
      ratingDistribution: ratingDistribution.map((r) => ({
        rating: r.starRating,
        count: r._count,
      })),
    });
  } catch (err) {
    console.error("GBP stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
