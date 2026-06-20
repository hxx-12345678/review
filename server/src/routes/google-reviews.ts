import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";
import { syncGoogleReviews, replyToGoogleReview } from "../services/google-business-api";
import { sendFeedbackNotification } from "../services/email";

const router = Router();

// ── Connect Google Account to a Business ─────────────────────────────────
const connectSchema = z.object({
  businessId: z.string(),
  googleAccountId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
});

router.post("/connect", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = connectSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const googleAccount = await prisma.googleAccount.upsert({
      where: { businessId: data.businessId },
      create: {
        businessId: data.businessId,
        googleAccountId: data.googleAccountId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null,
      },
      update: {
        googleAccountId: data.googleAccountId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? undefined,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: data.businessId,
        action: "google_connected",
        details: { googleAccountId: data.googleAccountId },
      },
    });

    res.json({ googleAccount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Google connect error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Sync Google Reviews ──────────────────────────────────────────────────
router.post("/sync/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const result = await syncGoogleReviews(businessId);

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: "google_reviews_synced",
        details: { synced: result.synced, total: result.total },
      },
    });

    res.json(result);
  } catch (err) {
    console.error("Google sync error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
  }
});

// ── List Synced Google Reviews ───────────────────────────────────────────
router.get("/reviews/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const reviews = await prisma.googleReview.findMany({
      where: { businessId },
      orderBy: { createTime: "desc" },
      take: 50,
    });

    res.json({ reviews });
  } catch (err) {
    console.error("List Google reviews error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reply to a Google Review (Post back to GBP + save locally) ────────────
const replySchema = z.object({
  replyText: z.string().min(1).max(5000),
});

router.post("/reviews/:reviewId/reply", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = req.params.reviewId as string;
    const { replyText } = replySchema.parse(req.body);

    const review = await prisma.googleReview.findUnique({
      where: { id: reviewId },
      include: { googleAccount: true, business: true },
    });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }
    if (review.business.userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Post reply to Google
    await replyToGoogleReview(
      "me",
      review.googleAccount.googleAccountId,
      review.googleReviewId,
      replyText,
      review.googleAccount.accessToken,
    );

    // Save locally
    const updated = await prisma.googleReview.update({
      where: { id: reviewId },
      data: {
        reviewReply: replyText,
        replyStatus: "REPLIED",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: review.businessId,
        action: "google_review_replied",
        details: { reviewId, replyLength: replyText.length },
      },
    });

    res.json({ review: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Google review reply error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to reply" });
  }
});

// ── Webhook: Receive Pub/Sub notification for new Google reviews ──────────
// Google sends notifications via Cloud Pub/Sub. Set up a push subscription
// that forwards messages to this endpoint.
router.post("/webhook/pubsub", async (req: Request | any, res: Response) => {
  try {
    const message = req.body?.message;
    if (!message?.data) {
      return res.status(400).json({ error: "Invalid Pub/Sub message" });
    }

    // Decode base64 data
    const decoded = Buffer.from(message.data, "base64").toString("utf-8");
    const notification = JSON.parse(decoded);

    const { locationName, accountName } = notification;

    if (!locationName) {
      return res.status(400).json({ error: "Missing locationName" });
    }

    // Extract locationId from locationName (format: accounts/{id}/locations/{id})
    const locationId = (locationName.split("/").pop() || "") as string;

    // Find all GoogleAccounts that match this location
    const googleAccounts = await prisma.googleAccount.findMany({
      where: { googleAccountId: locationId },
      include: { business: { select: { id: true, name: true, userId: true } } },
    });

    for (const ga of googleAccounts) {
      // Sync new reviews
      try {
        const result = await syncGoogleReviews(ga.businessId);
        if (result.synced > 0) {
          // Send email notification to business owner
          await sendFeedbackNotification(
            ga.business.userId,
            ga.business.name,
            0, // rating unknown at notification time; will be known after fetch
          );
        }
      } catch (err) {
        console.error(`Failed to sync reviews for business ${ga.businessId}:`, err);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PubSub webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ── Get Google Connection Status ─────────────────────────────────────────
router.get("/status/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const googleAccount = await prisma.googleAccount.findUnique({
      where: { businessId },
    });

    res.json({
      connected: !!googleAccount,
      googleAccountId: googleAccount?.googleAccountId || null,
      reviewCount: googleAccount
        ? await prisma.googleReview.count({ where: { businessId } })
        : 0,
    });
  } catch (err) {
    console.error("Google status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
