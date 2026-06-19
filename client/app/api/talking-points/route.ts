import { generateObject } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { deriveTalkingPoints } from "@/lib/ai-fallback"
import { sanitizeTextInput, validateRating, checkRateLimit } from "@/lib/security"

export const maxDuration = 30

// ── In-memory dedup cache ────────────────────────────────────────────────────
// Prevents re-calling Gemini when the same customer input arrives twice within
// 60 seconds (e.g., accidental double-submit). Keyed by a hash of the inputs.
const resultCache = new Map<string, { value: string[]; expiresAt: number }>()
function cacheKey(highlights: string, business: string, rating: number, lang: string) {
  return `${lang}:${rating}:${business}:${highlights}`.slice(0, 256)
}

const schema = z.object({
  talkingPoints: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("Short reminder bullets, each referencing a specific detail the customer mentioned"),
})

// COMPLIANCE-CRITICAL SYSTEM PROMPT.
// The model is forbidden from writing a review. It only converts the customer's
// own answers into memory-jogging bullet points. This keeps us compliant with
// Google's ban on AI-generated reviews and the FTC fake-review rule.
const SYSTEM_PROMPT = `You are a helpful assistant for a local business review tool called ReviewOS.

CRITICAL RULES — follow them exactly:
1. You must NEVER write a review, sentence, or paragraph that the customer could copy and paste as their review.
2. You ONLY produce short reminder bullet points ("talking points") that help the customer remember what they wanted to say.
3. Every bullet must be grounded in a SPECIFIC detail the customer actually provided. Do not invent details, names, or experiences.
4. Phrase bullets as gentle reminders to the customer, e.g. "You mentioned Dr. Lee explained the procedure" — NOT as finished review prose.
5. Never use generic marketing phrases like "highly recommend", "amazing service", "10/10", "best ever".
6. Keep each bullet under 12 words.
7. If the customer gave very little detail, return fewer bullets rather than padding with generic ones.

Your goal is to jog the customer's memory so THEY write an authentic review in their own words on Google.`

export async function POST(req: Request) {
  // Rate limiting: max 50 API calls per minute per IP
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(`talking-points-${ip}`, 50, 60000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 })
  }

  let body: { highlights?: string; businessName?: string; rating?: number } = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ talkingPoints: [] })
  }

  // SECURITY: Validate & sanitize all inputs
  let { highlights, businessName, rating, language } = body

  if (typeof highlights !== "string") {
    return Response.json({ talkingPoints: [] })
  }

  highlights = sanitizeTextInput(highlights, 500) // Max 500 chars for highlights

  if (highlights.trim().length < 3) {
    return Response.json({ talkingPoints: [] })
  }

  // Validate rating is 1-5 if provided
  if (rating !== undefined && !validateRating(rating)) {
    return Response.json({ talkingPoints: [] })
  }

  // Sanitize business name & language
  businessName = businessName ? sanitizeTextInput(businessName, 100) : "a local business"
  language = typeof language === "string" ? sanitizeTextInput(language, 30) : "english"

  let languageInstruction = "Write the reminder bullet points in clear standard English."
  if (language === "hinglish") {
    languageInstruction = "Write the reminder bullet points in Hinglish (a mixture of Hindi and English, using Hindi words spelled with the English/Latin alphabet, e.g., 'Aapne bataya ki food bohot tasty tha', 'Doctor friendly hai'). Do not use Devanagari script."
  } else if (language === "gujlish") {
    languageInstruction = "Write the reminder bullet points in Gujlish (a mixture of Gujarati and English, using Gujarati words spelled with the English/Latin alphabet, e.g., 'Service ghani saari hati', 'Staff badha helpful che'). Do not use Gujarati script."
  } else if (language === "hindi") {
    languageInstruction = "Write the reminder bullet points in pure Hindi using the Devanagari script (e.g., 'आपने बताया कि भोजन बहुत स्वादिष्ट था')."
  } else if (language === "gujarati") {
    languageInstruction = "Write the reminder bullet points in pure Gujarati using the Gujarati script (e.g., 'તમે જણાવ્યું કે સેવા ઘણી સારી હતી')."
  }

  // ── Cache check: skip Gemini if we've seen this exact input recently ────────
  const key = cacheKey(highlights, businessName, rating ?? 0, language)
  const cached = resultCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ talkingPoints: cached.value, cached: true })
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema,
      system: SYSTEM_PROMPT,
      prompt: `Business: ${businessName}
Customer's star rating: ${rating ?? "unknown"}/5
Customer's notes about their visit: "${highlights}"

MANDATORY OUTPUT LANGUAGE (apply to every word of every bullet — this overrides everything):
${languageInstruction}

Produce 2-5 short reminder bullets grounded strictly in what the customer wrote above. Every single word must be in the language stated in the MANDATORY OUTPUT LANGUAGE section.`,
    })

    // Cache result for 60 seconds to prevent duplicate API spend
    resultCache.set(key, { value: object.talkingPoints, expiresAt: Date.now() + 60_000 })
    // Prune cache if it grows too large (simple LRU approximation)
    if (resultCache.size > 500) {
      const firstKey = resultCache.keys().next().value
      if (firstKey) resultCache.delete(firstKey)
    }

    return Response.json(object)
  } catch (err) {
    // On AI failure fall back to the deterministic helper that extracts
    // the customer's own words as reminders.
    console.error("Gemini talking-points error:", err)
    const talkingPoints = deriveTalkingPoints(highlights)
    return Response.json({ talkingPoints, fallback: true })
  }
}
