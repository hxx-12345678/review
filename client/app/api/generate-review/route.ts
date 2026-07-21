import { sanitizeTextInput, validateRating, checkRateLimit } from "@/lib/security"
import { buildFallbackReview } from "@/lib/ai-fallback"

export const maxDuration = 30

// Content-based dedup cache: same input → skip API call for 30s
const requestCache = new Map<string, { result: any; expiresAt: number }>()

function cacheKey(highlights: string, selectedTopics: string[], lang: string, rating: number | undefined, businessSlug?: string) {
  return `${lang}:${rating ?? 0}:${highlights}:${selectedTopics.sort().join(",")}:${businessSlug ?? ""}`.slice(0, 256)
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(`generate-review-${ip}`, 5, 60000)) {
    return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 })
  }

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return Response.json({ review: "" })
  }

  let { highlights, selectedTopics, businessName, promptTopics, rating, language, talkingPoints, businessSlug } = body

  if (typeof highlights !== "string") highlights = ""
  highlights = sanitizeTextInput(highlights, 500)

  if (!Array.isArray(selectedTopics)) selectedTopics = []
  selectedTopics = selectedTopics.map((t: string) => sanitizeTextInput(t, 100)).filter(Boolean)

  if (!Array.isArray(promptTopics)) promptTopics = []
  promptTopics = promptTopics.map((t: string) => sanitizeTextInput(t, 100)).filter(Boolean)

  if (rating !== undefined && !validateRating(rating)) {
    rating = undefined
  }

  businessName = businessName ? sanitizeTextInput(businessName, 100) : "a local business"
  language = typeof language === "string" ? sanitizeTextInput(language, 30) : "english"
  talkingPoints = Array.isArray(talkingPoints) ? talkingPoints.map((p: string) => sanitizeTextInput(p, 200)).filter(Boolean) : []
  businessSlug = typeof businessSlug === "string" ? sanitizeTextInput(businessSlug, 64) : undefined

  // Content-based dedup: if exact same request was made <30s ago, return cached result
  const cKey = cacheKey(highlights, selectedTopics, language, rating, businessSlug)
  const cached = requestCache.get(cKey)
  if (cached && cached.expiresAt > Date.now()) {
    return Response.json({ ...cached.result, cached: true })
  }

  const backendUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/ai/generate-review`

  try {
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlights, selectedTopics, businessName, promptTopics, rating, language, talkingPoints, businessSlug }),
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
    console.error("Client API generate-review forwarding error:", err)
    const review = buildFallbackReview({ highlights, businessName, rating, talkingPoints, selectedTopics })
    return Response.json({ review, fallback: true })
  }
}
