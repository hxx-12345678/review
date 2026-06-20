import { sanitizeTextInput, validateRating, checkRateLimit } from "@/lib/security"
import { buildFallbackReview } from "@/lib/ai-fallback"

export const maxDuration = 30

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(`generate-review-${ip}`, 30, 60000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ review: "" })
  }

  let { highlights, selectedTopics, businessName, rating, language, talkingPoints } = body

  if (typeof highlights !== "string") highlights = ""
  highlights = sanitizeTextInput(highlights, 500)

  if (!Array.isArray(selectedTopics)) selectedTopics = []
  selectedTopics = selectedTopics.map((t: string) => sanitizeTextInput(t, 100)).filter(Boolean)

  if (rating !== undefined && !validateRating(rating)) {
    rating = undefined
  }

  businessName = businessName ? sanitizeTextInput(businessName, 100) : "a local business"
  language = typeof language === "string" ? sanitizeTextInput(language, 30) : "english"
  talkingPoints = Array.isArray(talkingPoints) ? talkingPoints.map((p: string) => sanitizeTextInput(p, 200)).filter(Boolean) : []

  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/ai/generate-review`

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlights, selectedTopics, businessName, rating, language, talkingPoints }),
    })

    if (!response.ok) {
      throw new Error(`Backend server responded with status ${response.status}`)
    }

    const data = await response.json()
    return Response.json(data)
  } catch (err) {
    console.error("Client API generate-review forwarding error:", err)
    const review = buildFallbackReview({ highlights, businessName, rating, talkingPoints })
    return Response.json({ review, fallback: true })
  }
}
