import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { buildFallbackReply } from "@/lib/ai-fallback"
import { sanitizeTextInput, validateRating, checkRateLimit } from "@/lib/security"

export const maxDuration = 30

const SYSTEM_PROMPT = `You write replies that a local business owner posts publicly under a customer's Google review.

Rules:
- Write in the first person as the business ("we", "our team").
- Be warm, specific, and human. Reference the concrete detail(s) the customer mentioned.
- Keep it to 2-3 sentences, under 60 words.
- For negative reviews: acknowledge the issue sincerely, apologize, and invite them to continue the conversation. Do NOT be defensive.
- Never fabricate facts. Never offer specific compensation.
- Do not use hashtags or emojis.`

export async function POST(req: Request) {
  // Rate limiting: max 30 reply generations per minute per IP
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(`generate-reply-${ip}`, 30, 60000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 })
  }

  let body: { reviewText?: string; rating?: number; businessName?: string; tone?: string } = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ reply: "" })
  }

  // SECURITY: Validate & sanitize all inputs
  let { reviewText, rating, businessName, tone } = body

  if (typeof reviewText !== "string") {
    return Response.json({ reply: "" })
  }

  reviewText = sanitizeTextInput(reviewText, 1000) // Max 1000 chars for reviews

  if (reviewText.trim().length < 3) {
    return Response.json({ reply: "" })
  }

  // Validate rating is 1-5
  if (rating !== undefined && !validateRating(rating)) {
    return Response.json({ reply: "" })
  }

  // Sanitize business name and tone
  businessName = businessName ? sanitizeTextInput(businessName, 100) : "our business"
  tone = tone ? sanitizeTextInput(tone, 50) : "warm and professional"

  try {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: SYSTEM_PROMPT,
      prompt: `Business: ${businessName}
Star rating: ${rating}/5
Desired tone: ${tone}
Customer review: "${reviewText}"

Write a single reply the owner can post.`,
    })

    return Response.json({ reply: text.trim() })
  } catch (err) {
    // On AI failure fall back to a tone-aware templated reply so the
    // inbox reply button is never broken.
    console.error("Gemini generate-reply error:", err)
    const reply = buildFallbackReply({ rating: rating ?? 3, businessName, reviewText })
    return Response.json({ reply, fallback: true })
  }
}
