import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, authOptional, AuthRequest } from "../middleware/auth";
import { sendFeedbackNotification } from "../services/email";

const router = Router();

const submitFeedbackSchema = z.object({
  businessSlug: z.string(),
  rating: z.number().int().min(1).max(5),
  purchaseInfo: z.string().max(500).optional().or(z.literal("")),
  liked: z.string().max(2000).optional().or(z.literal("")),
  improvement: z.string().max(2000).optional().or(z.literal("")),
  customerName: z.string().max(100).optional().or(z.literal("")),
  customerEmail: z.string().email().optional().or(z.literal("")),
  privateNote: z.string().max(5000).optional().or(z.literal("")),
});

router.post("/submit", authOptional, async (req: AuthRequest, res: Response) => {
  try {
    const data = submitFeedbackSchema.parse(req.body);

    const business = await prisma.business.findUnique({
      where: { slug: data.businessSlug },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const feedback = await prisma.feedback.create({
      data: {
        businessId: business.id,
        rating: data.rating,
        purchaseInfo: data.purchaseInfo || null,
        liked: data.liked || null,
        improvement: data.improvement || null,
        customerName: data.customerName || null,
        customerEmail: data.customerEmail || null,
        privateNote: data.privateNote || null,
        status: data.privateNote ? "PRIVATE_FEEDBACK" : "ABANDONED",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: business.userId,
        businessId: business.id,
        action: "feedback_submitted",
        details: { feedbackId: feedback.id, rating: data.rating },
      },
    });

    try {
      await sendFeedbackNotification(business.userId, business.name, data.rating);
    } catch {
      // Email notification is best-effort
    }

    res.status(201).json({ feedback });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Submit feedback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/business/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const minRating = req.query.minRating ? parseInt(req.query.minRating as string) : undefined;

    const where: any = { businessId: business.id };
    if (status) where.status = status;
    if (minRating) where.rating = { gte: minRating };
    if (search) {
      where.OR = [
        { liked: { contains: search, mode: "insensitive" } },
        { improvement: { contains: search, mode: "insensitive" } },
        { purchaseInfo: { contains: search, mode: "insensitive" } },
      ];
    }

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          reviewDraft: true,
          generatedReply: true,
          _count: { select: { reviewClicks: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      feedback,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Get feedback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public/:slug", async (req: AuthRequest, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        googleReviewUrl: true,
        industry: true,
        promptTopics: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json({ business });
  } catch (err) {
    console.error("Get public business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
