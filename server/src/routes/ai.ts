import { Router, Response, Request } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";
import { aiLimiter } from "../middleware/rate-limit";
import { callGemini, deriveTalkingPoints, buildFallbackReply } from "../utils/gemini";

const router = Router();

const generateReplySchema = z.object({
  feedbackId: z.string(),
  businessId: z.string(),
  tone: z.enum(["professional", "friendly", "formal"]).default("professional"),
  content: z.string().optional(),
});

// Cache for talking points to prevent duplicate Gemini billing
const resultCache = new Map<string, { value: string[]; expiresAt: number }>();
function cacheKey(highlights: string, business: string, rating: number, lang: string) {
  return `${lang}:${rating}:${business}:${highlights}`.slice(0, 256);
}

// ── T10: AI Reply Generation Route ──────────────────────────────────────────
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

    let reply = "";
    try {
      const systemInstruction = `You are an AI assistant helping a local business owner reply to customer reviews.
Keep replies polite, professional, and relatively brief (1-3 sentences).
Tone requested: ${data.tone}
If the review was positive, thank them.
If the review was negative, apologize sincerely and offer to make it right.
Ground your response strictly in the customer's comments. Do not make up facts.`;

      const prompt = `Business Name: ${business.name}
Customer Rating: ${feedback.rating}/5
What customer liked: ${feedback.liked ?? "N/A"}
What customer wanted improved: ${feedback.improvement ?? "N/A"}
Additional customer comments: ${data.content ?? "N/A"}`;

      reply = await callGemini(prompt, systemInstruction);
      reply = reply.trim();
    } catch (err) {
      console.warn("Gemini reply generation failed, falling back to deterministic template:", err);
      reply = data.content ?? buildFallbackReply(feedback.rating, feedback.liked, feedback.improvement, data.tone);
    }

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

// ── T4: AI Talking Points Route (Moved from frontend to server for security) ──
const talkingPointsSchema = z.object({
  highlights: z.string().min(3).max(500),
  businessName: z.string().max(100).optional().default("a local business"),
  rating: z.number().min(1).max(5).optional(),
  language: z.string().max(30).optional().default("english"),
});

router.post("/talking-points", aiLimiter, async (req: Request, res: Response) => {
  try {
    const { highlights, businessName, rating, language } = talkingPointsSchema.parse(req.body);

    // Cache check: skip Gemini if we've seen this exact input recently
    const key = cacheKey(highlights, businessName, rating ?? 0, language);
    const cached = resultCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ talkingPoints: cached.value, cached: true });
    }

    let languageInstruction = "Write the reminder bullet points in clear standard English.";
    if (language === "hinglish") {
      languageInstruction = "Write the reminder bullet points in Hinglish (a mixture of Hindi and English, using Hindi words spelled with the English/Latin alphabet, e.g., 'Aapne bataya ki food bohot tasty tha', 'Doctor friendly hai'). Do not use Devanagari script.";
    } else if (language === "gujlish") {
      languageInstruction = "Write the reminder bullet points in Gujlish (a mixture of Gujarati and English, using Gujarati words spelled with the English/Latin alphabet, e.g., 'Service ghani saari hati', 'Staff badha helpful che'). Do not use Gujarati script.";
    } else if (language === "hindi") {
      languageInstruction = "Write the reminder bullet points in pure Hindi using the Devanagari script (e.g., 'आपने बताया कि भोजन बहुत स्वादिष्ट था').";
    } else if (language === "gujarati") {
      languageInstruction = "Write the reminder bullet points in pure Gujarati using the Gujarati script (e.g., 'તમે જણાવ્યું કે સેવા ઘણી સારી હતી').";
    }

    const SYSTEM_PROMPT = `You are a helpful assistant for a local business review tool called ReviewOS.

CRITICAL RULES — follow them exactly:
1. You must NEVER write a review, sentence, or paragraph that the customer could copy and paste as their review.
2. You ONLY produce short reminder bullet points ("talking points") that help the customer remember what they wanted to say.
3. Every bullet must be grounded in a SPECIFIC detail the customer actually provided. Do not invent details, names, or experiences.
4. Phrase bullets as gentle reminders to the customer, e.g. "You mentioned Dr. Lee explained the procedure" — NOT as finished review prose.
5. Never use generic marketing phrases like "highly recommend", "amazing service", "10/10", "best ever".
6. Keep each bullet under 12 words.
7. If the customer gave very little detail, return fewer bullets rather than padding with generic ones.

Your goal is to jog the customer's memory so THEY write an authentic review in their own words on Google.`;

    const prompt = `Business: ${businessName}
Customer's star rating: ${rating ?? "unknown"}/5
Customer's notes about their visit: "${highlights}"

MANDATORY OUTPUT LANGUAGE (apply to every word of every bullet — this overrides everything):
${languageInstruction}

Produce 2-5 short reminder bullets grounded strictly in what the customer wrote above. Every single word must be in the language stated in the MANDATORY OUTPUT LANGUAGE section.`;

    let talkingPoints: string[] = [];
    try {
      const responseText = await callGemini(prompt, SYSTEM_PROMPT, {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            talkingPoints: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["talkingPoints"],
        },
      });

      const parsed = JSON.parse(responseText);
      talkingPoints = parsed.talkingPoints || [];
    } catch (err) {
      console.warn("Gemini talking points generation failed, falling back to deterministic parser:", err);
      talkingPoints = deriveTalkingPoints(highlights);
    }

    // Cache result for 60 seconds
    resultCache.set(key, { value: talkingPoints, expiresAt: Date.now() + 60_000 });
    if (resultCache.size > 500) {
      const firstKey = resultCache.keys().next().value;
      if (firstKey) resultCache.delete(firstKey);
    }

    res.json({ talkingPoints });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Talking points API error:", err);
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

export default router;
