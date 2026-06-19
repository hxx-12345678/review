import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";
import { aiLimiter } from "../middleware/rate-limit";

const router = Router();

const generateReplySchema = z.object({
  feedbackId: z.string(),
  businessId: z.string(),
  tone: z.enum(["professional", "friendly", "formal"]).default("professional"),
  content: z.string().optional(),
});

router.post("/generate-reply", authRequired, aiLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = generateReplySchema.parse(req.body);

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

    const reply = data.content ?? buildReply(feedback.rating, feedback.liked, feedback.improvement, data.tone);

    const generatedReply = await prisma.generatedReply.upsert({
      where: { feedbackId: data.feedbackId },
      create: {
        feedbackId: data.feedbackId,
        businessId: data.businessId,
        content: reply,
        tone: data.tone,
        status: "DRAFT",
      },
      update: { content: reply, tone: data.tone },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: data.businessId,
        action: "reply_generated",
        details: { feedbackId: data.feedbackId, tone: data.tone },
      },
    });

    res.json({ reply: generatedReply });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Generate reply error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:replyId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const replyId = req.params.replyId as string;
    const { content } = z.object({
      content: z.string().min(1).max(5000),
    }).parse(req.body);

    const reply = await prisma.generatedReply.findUnique({
      where: { id: replyId },
      select: { id: true, businessId: true, content: true, tone: true, status: true },
    });

    if (!reply) {
      return res.status(404).json({ error: "Reply not found" });
    }

    const business = await prisma.business.findUnique({
      where: { id: reply.businessId },
      select: { userId: true },
    });

    if (!business || business.userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.generatedReply.update({
      where: { id: replyId },
      data: { content, status: "REPLIED" },
    });

    res.json({ reply: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Update reply error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function buildReply(rating: number, liked: string | null, improvement: string | null, tone: string): string {
  const thanks = tone === "formal" ? "Thank you" : tone === "friendly" ? "Thanks so much" : "Thank you";
  const greeting = "";

  let body = "";
  if (rating >= 4) {
    body = liked
      ? `We're delighted you enjoyed ${liked.toLowerCase()}. Your kind words mean a lot to our team.`
      : `We're thrilled you had a great experience with us.`;
  } else if (rating === 3) {
    body = `We appreciate your honest feedback and are always looking to improve.`;
  } else {
    body = improvement
      ? `We take your feedback about ${improvement.toLowerCase()} seriously and will work on improving.`
      : `We apologize for not meeting expectations and will use your feedback to improve.`;
  }

  const closing = tone === "formal"
    ? "We look forward to serving you again."
    : tone === "friendly"
      ? "Hope to see you again soon!"
      : "We look forward to your next visit.";

  return `${thanks} for your review. ${body} ${closing}`;
}

export default router;
