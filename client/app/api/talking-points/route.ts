import { sanitizeTextInput, validateRating, checkRateLimit } from "@/lib/security"
import { deriveTalkingPoints } from "@/lib/ai-fallback"

export const maxDuration = 30

export async function POST(req: Request) {
  // Rate limiting: max 50 API calls per minute per IP
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(`talking-points-${ip}`, 50, 60000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 })
  }

  let body: any = {}
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

  highlights = sanitizeTextInput(highlights, 500) // Max 500 chars

  if (highlights.trim().length < 3) {
    return Response.json({ talkingPoints: [] })
  }

  if (rating !== undefined && !validateRating(rating)) {
    return Response.json({ talkingPoints: [] })
  }

  businessName = businessName ? sanitizeTextInput(businessName, 100) : "a local business"
  language = typeof language === "string" ? sanitizeTextInput(language, 30) : "english"

  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/ai/talking-points`

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        highlights,
        businessName,
        rating,
        language,
      }),
    })

    if (!response.ok) {
      throw new Error(`Backend server responded with status ${response.status}`)
    }

    const data = await response.json()
    return Response.json(data)
  } catch (err) {
    console.error("Client API talking points forwarding error:", err)
    // Safe deterministic fallback if the backend server or Gemini is unreachable
    const talkingPoints = deriveTalkingPoints(highlights)
    return Response.json({ talkingPoints, fallback: true })
  }
}
