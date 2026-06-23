import { Router, Response, Request } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";
import { aiLimiter } from "../middleware/rate-limit";
import { callGemini, deriveTalkingPoints, buildFallbackReply, buildFallbackReview } from "../utils/gemini";

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
      const toneGuide = data.tone === "friendly"
        ? "Warm, conversational, and personal — like a grateful business owner writing to a valued customer."
        : data.tone === "formal"
          ? "Polished, respectful, and professional — suitable for a formal business correspondence."
          : "Balanced and professional with a personal touch — approachable but not overly casual.";

      const likedText = feedback.liked || "";
      const improvementText = feedback.improvement || "";
      const allCustomerText = [likedText, improvementText, data.content].filter(Boolean).join(" ");

      const systemInstruction = `You are an AI assistant helping a local business owner reply to customer reviews. The business can be any type — restaurant, clinic, salon, auto shop, home service, retail, D2C, agency, or professional service.

CRITICAL RULES:
1. Sound like a real human business owner — warm, specific, and genuine. Never robotic.
2. Reference specific details from the customer's feedback to show you actually read it.
3. Tone: ${toneGuide}
4. Keep replies 2-4 sentences — long enough to be personal, short enough to read at a glance.
5. Match the LANGUAGE of the customer's review. If they wrote in Hindi, reply in Hindi. If Hinglish, reply in Hinglish. If English, reply in English. Detect the language automatically from their text.
6. NEVER use generic phrases like "Thank you for your feedback", "We appreciate your business", "We value your input", "We take your feedback seriously", or "We look forward to seeing you again". Every reply must be unique and specific.
7. If the review is positive, express genuine gratitude and mention something specific they liked.
8. If the review is negative, apologize sincerely for the specific issue they mentioned and briefly state how you'll address it.
9. Do NOT mention the star rating number. Do NOT use emojis.
10. Do NOT ask the customer to mention or repeat any staff member names.
11. Output ONLY the reply text — no labels, no prefixes, no quotation marks.`;

      const prompt = `Business Name: ${business.name}
Customer's star rating: ${feedback.rating}/5
What customer liked: "${likedText || "N/A"}"
What customer wanted improved: "${improvementText || "N/A"}"
Additional customer comments: "${data.content ?? "N/A"}"

DETECT the language of the customer's text above and write your ENTIRE reply in that same language. If the customer wrote in Hindi, reply in Hindi (Devanagari script). If they wrote in Hinglish or mixed Hindi/English, reply in Hinglish. If they wrote in Gujarati, reply in Gujarati. If English, reply in standard English.

Write a personal, specific reply from the business owner that references at least one specific detail from the customer's feedback. Sound like a real person, not a template.`;

      reply = await callGemini(prompt, systemInstruction);
      reply = reply.trim();
    } catch (err) {
      console.warn("Gemini reply generation failed, falling back to deterministic template:", err);
      reply = buildFallbackReply(feedback.rating, feedback.liked, feedback.improvement, data.tone);
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

    let languageInstruction = "Write the reminder bullet points in clear, conversational English.";
    if (language === "hinglish") {
      languageInstruction = "Write the reminder bullet points in natural Hinglish — a casual mix of Hindi and English using ONLY the English/Latin alphabet (no Devanagari). Use everyday Hinglish like 'Aapne bataya ki food tasty tha', 'Staff bahut friendly laga', 'Service fast thi'. Avoid formal/translated Hindi.";
    } else if (language === "gujlish") {
      languageInstruction = "Write the reminder bullet points in natural Gujlish — a casual mix of Gujarati and English using ONLY the English/Latin alphabet (no Gujarati script). Use everyday Gujlish like 'Aapne kiyu ki service sari hati', 'Staff badha helpful lagya', 'Food maja aavyo'. Avoid formal/translated Gujarati.";
    } else if (language === "hindi") {
      languageInstruction = "Write the reminder bullet points in everyday Hindi using the Devanagari script (हिंदी). Use natural spoken Hindi, like 'आपने बताया कि खाना बहुत स्वादिष्ट था'.";
    } else if (language === "gujarati") {
      languageInstruction = "Write the reminder bullet points in everyday Gujarati using the Gujarati script (ગુજરાતી). Use natural spoken Gujarati, like 'તમે જણાવ્યું કે સેવા ઘણી સારી હતી'.";
    }

    const SYSTEM_PROMPT = `You are a helpful assistant for a review tool that works for ALL business types — restaurants, clinics, salons, gyms, auto shops, home services, retail, D2C brands, agencies, professional services, and more.

CRITICAL RULES — follow them exactly:
1. You must NEVER write a review, sentence, or paragraph that the customer could copy and paste as their review.
2. You ONLY produce short reminder bullet points ("talking points") that help the customer remember what they wanted to say.
3. Every bullet must be grounded in a SPECIFIC detail the customer actually provided. Do not invent details, names, or experiences.
4. COMPLIANCE (Google 2026 policy): NEVER mention or suggest staff member names in any bullet point. This causes automatic review removal.
5. Phrase bullets as gentle reminders to the customer, e.g. "You mentioned the quality was great" — NOT as finished review prose.
6. Never use generic marketing phrases like "highly recommend", "amazing service", "10/10", "best ever".
7. Keep each bullet under 12 words.
8. If the customer gave very little detail, return fewer bullets rather than padding with generic ones.

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

// ── T5: AI Review Draft Generation Route ──────────────────────────────────────
const generateReviewSchema = z.object({
  highlights: z.string().max(500).optional().default(""),
  selectedTopics: z.array(z.string()).optional().default([]),
  businessName: z.string().max(100).optional().default("a local business"),
  rating: z.number().min(1).max(5).optional(),
  language: z.string().max(30).optional().default("english"),
  talkingPoints: z.array(z.string()).optional().default([]),
});

router.post("/generate-review", aiLimiter, async (req: Request, res: Response) => {
  try {
    const { highlights, selectedTopics, businessName, rating, language, talkingPoints } = generateReviewSchema.parse(req.body);

    const sentiment = !rating ? "neutral" : rating >= 4 ? "positive" : rating === 3 ? "neutral" : "negative";

    let languageInstruction = "Write the review draft in natural, conversational English. Use contractions (like 'I'd', 'wasn't', 'it's') and vary sentence lengths. Sound like a real customer typing on their phone.";
    if (language === "hinglish") {
      languageInstruction = "Write the review draft in natural Hinglish — a real, spontaneous mix of Hindi and English using ONLY the English/Latin alphabet (no Devanagari). DO NOT translate every word. Use common Hinglish patterns: Hindi verbs/nouns with English filler, e.g. 'Food bohot achha tha', 'Service bahut fast thi', 'Staff ne bahut accha treat kiya', 'Overall experience accha raha', 'Waiter ne bola ki wait karna padega'. Mix naturally — some sentences full English, some full Hindi in Latin script, some both. Avoid formal/translated Hindi. Sound like someone in Mumbai or Delhi typing a quick Google review.";
    } else if (language === "gujlish") {
      languageInstruction = "Write the review draft in natural Gujlish — a real, spontaneous mix of Gujarati and English using ONLY the English/Latin alphabet (no Gujarati script). DO NOT translate every word. Use common Gujlish patterns: Gujarati verbs/nouns with English filler, e.g. 'Service ghani saari hati', 'Food maja aavi gayo', 'Staff badha j helpful hati', 'Ane price pan reasonable che', 'Overall saro experience rahyo'. Mix naturally — some sentences full English, some full Gujarati in Latin script, some both. Avoid formal/translated Gujarati. Sound like someone in Ahmedabad or Vadodara typing a quick Google review.";
    } else if (language === "hindi") {
      languageInstruction = "Write the review draft in natural, conversational Hindi using Devanagari script (हिंदी). Use everyday spoken Hindi, not formal literary Hindi. Include common Hindi phrases real people use in reviews. Sound like someone casually sharing their experience on Google.";
    } else if (language === "gujarati") {
      languageInstruction = "Write the review draft in natural, conversational Gujarati using Gujarati script (ગુજરાતી). Use everyday spoken Gujarati, not formal literary Gujarati. Include common Gujarati phrases real people use in reviews. Sound like someone casually sharing their experience on Google.";
    }

    const SYSTEM_PROMPT = `You are a review draft assistant. You work for ALL types of businesses — restaurants, clinics, dental practices, salons, barbershops, gyms, auto repair shops, home services (plumbing, electrical, cleaning), retail stores, D2C/ecommerce brands, agencies, professional services (legal, consulting, accounting), real estate, and more. Adapt your output naturally to the business type.

CRITICAL RULES:
1. You generate a DRAFT only — the customer will review, edit, and own every word before posting.
2. Ground EVERY claim in the specific details the customer provided. Never fabricate names, items, services, or experiences.
3. COMPLIANCE (Google 2026 policy): NEVER write a review that mentions a staff member's name, even if the customer hinted at it. NEVER suggest the customer should mention a staff name. This is now explicitly banned by Google and causes automatic review removal.
4. Sound like a GENUINE real person from the customer's region — use natural, conversational language with varied sentence structure. Write like someone typing on their phone, not a copywriter or marketing person.
5. Keep it between 2-5 sentences (roughly 30-80 words). Real Google reviews are concise.
6. NEVER use these generic phrases: "highly recommend", "amazing service", "10/10", "best ever", "five stars", "great experience", "top notch", "would recommend", "exceeded expectations", "second to none", "hidden gem", "must visit". Zero tolerance.
7. VARY your output — every generation should sound different in structure, opening, and tone even with similar inputs. NEVER start with "I recently visited" or "I recently went to".
8. If the customer provided the business name, weave it in naturally ONLY if it flows (e.g. "I went to ABC Dental for a checkup" not "I recently visited ABC Dental"). If no business name, write the review without mentioning it.
9. If rating >= 4: positive but specific — mention what exactly made it good (not just "it was good"). If rating === 3: mixed/balanced — mention both what was okay and what could improve. If rating <= 2: constructive — focus on what specifically went wrong.
10. Weave selected topics and talking points into a smooth narrative — do NOT list them like bullet points.
11. Output ONLY the review text — no labels, no prefixes, no quotation marks, no emojis.`;

    const bizLine = businessName && businessName !== "a local business"
      ? `Business: ${businessName}`
      : "";
    let prompt = `${bizLine}
Customer's rating: ${rating ?? "unknown"}/5
Customer's own words: "${highlights || "(none provided)"}"`;

    if (selectedTopics.length > 0) {
      prompt += `\nTopics the customer selected that describe their experience: ${selectedTopics.join(", ")}`;
    }
    if (talkingPoints.length > 0) {
      prompt += `\nTalking points to reference:\n${talkingPoints.map((p) => `- ${p}`).join("\n")}`;
    }

    prompt += `\n\nMANDATORY OUTPUT LANGUAGE (every word must be in this language):
${languageInstruction}

Write a short, natural, authentic-sounding review draft (2-5 sentences) in the exact language specified above. Make it sound like a real customer sharing their genuine experience — casual, specific, and unique. Vary the opening — NEVER start with "I recently visited" or "I recently went to". Every generation should sound different.`;

    let review = "";
    try {
      review = await callGemini(prompt, SYSTEM_PROMPT);
      review = review.trim().replace(/^["']|["']$/g, "");
    } catch (err) {
      console.warn("Gemini review generation failed, falling back to deterministic builder:", err);
      review = buildFallbackReview({ highlights, businessName, rating, talkingPoints });
    }

    res.json({ review });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Generate review error:", err);
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
