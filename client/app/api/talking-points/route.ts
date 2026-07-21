import { sanitizeTextInput, validateRating, checkRateLimit } from "@/lib/security"
import { deriveTalkingPoints } from "@/lib/ai-fallback"

export const maxDuration = 30

// Content-based dedup cache: same input → skip API call for 30s
const requestCache = new Map<string, { result: any; expiresAt: number }>()

function cacheKey(highlights: string, topics: string[], lang: string, rating: number | undefined) {
  return `${lang}:${rating ?? 0}:${highlights}:${topics.sort().join(",")}`.slice(0, 256)
}

export async function POST(req: Request) {
  // Rate limiting: max 10 API calls per minute per IP (tight — server enforces harder)
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(`talking-points-${ip}`, 10, 60000)) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ talkingPoints: [] })
  }

  // SECURITY: Validate & sanitize all inputs
  let { highlights, selectedTopics, businessName, promptTopics, rating, language } = body

  if (typeof highlights !== "string") highlights = ""
  highlights = sanitizeTextInput(highlights, 500)

  if (!Array.isArray(selectedTopics)) selectedTopics = []
  selectedTopics = selectedTopics.map((t: string) => sanitizeTextInput(t, 100)).filter(Boolean)

  if (!Array.isArray(promptTopics)) promptTopics = []
  promptTopics = promptTopics.map((t: string) => sanitizeTextInput(t, 100)).filter(Boolean)

  if (highlights.trim().length < 3 && selectedTopics.length === 0) {
    return Response.json({ talkingPoints: [] })
  }

  if (rating !== undefined && !validateRating(rating)) {
    return Response.json({ talkingPoints: [] })
  }

  businessName = businessName ? sanitizeTextInput(businessName, 100) : "a local business"
  language = typeof language === "string" ? sanitizeTextInput(language, 30) : "english"

  // Content-based dedup: if exact same request was made <30s ago, return cached result
  const cKey = cacheKey(highlights, selectedTopics, language, rating)
  const cached = requestCache.get(cKey)
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ ...cached.result, cached: true })
  }

  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/ai/talking-points`

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        highlights,
        selectedTopics,
        businessName,
        promptTopics,
        rating,
        language,
      }),
    })

    if (!response.ok) {
      throw new Error(`Backend server responded with status ${response.status}`)
    }

    const data = await response.json()

    // Cache for 30 seconds
    requestCache.set(cKey, { result: data, expiresAt: Date.now() + 30_000 })
    if (requestCache.size > 200) {
      const firstKey = requestCache.keys().next().value
      if (firstKey) requestCache.delete(firstKey)
    }

    return Response.json(data)
  } catch (err) {
    console.error("Client API talking points forwarding error:", err)
    // Safe deterministic fallback if the backend server or Gemini is unreachable
    const talkingPoints = deriveTalkingPoints(highlights, selectedTopics)
    return Response.json({ talkingPoints, fallback: true })
  }
}
