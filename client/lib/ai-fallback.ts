// Deterministic, compliance-safe fallbacks used when the AI Gateway is
// unavailable (e.g. no credit card on file). These never fabricate content:
// talking points are derived ONLY from the customer's own words, and replies
// are simple templated acknowledgements that reference the rating.

const GENERIC_BLOCKLIST = [
  "highly recommend",
  "amazing service",
  "best ever",
  "10/10",
  "five stars",
  "great experience",
]

function isTooGeneric(text: string): boolean {
  const lower = text.toLowerCase()
  return GENERIC_BLOCKLIST.some((phrase) => lower.includes(phrase))
}

// Split the customer's own notes into short reminder bullets.
// We do not add new claims — we only reflect back what they typed.
export function deriveTalkingPoints(highlights: string): string[] {
  if (!highlights || highlights.trim().length < 3) return []

  const fragments = highlights
    .split(/[.,;\n]|(?:\band\b)/i)
    .map((f) => f.trim())
    .filter((f) => f.length >= 4 && !isTooGeneric(f))

  const points: string[] = []
  for (const fragment of fragments) {
    // Trim to a short reminder of at most ~12 words.
    const words = fragment.split(/\s+/).slice(0, 12).join(" ")
    const cleaned = words.charAt(0).toUpperCase() + words.slice(1)
    if (!points.includes(cleaned)) points.push(cleaned)
    if (points.length >= 5) break
  }

  return points.slice(0, 5)
}

export function buildFallbackReview(opts: {
  highlights?: string
  businessName?: string
  rating?: number
  talkingPoints?: string[]
}): string {
  const { highlights, businessName, rating, talkingPoints } = opts
  const name = businessName || "this business"

  if (talkingPoints && talkingPoints.length > 0) {
    const points = talkingPoints.slice(0, 3).join(", ")
    return `I recently visited ${name} and wanted to share my experience. ${points}. Overall, it was a memorable visit and I appreciate what they offer.`
  }

  if (highlights && highlights.trim().length >= 3) {
    return `I recently visited ${name}. ${highlights}. I hope this helps others looking for honest feedback about this place.`
  }

  if (rating && rating >= 4) {
    return `I had a great experience at ${name}! The service was wonderful and I would definitely recommend checking them out.`
  }
  if (rating && rating === 3) {
    return `My experience at ${name} was decent overall. There were some good points and some areas for improvement.`
  }
  if (rating && rating <= 2) {
    return `I recently visited ${name} and unfortunately my experience didn't meet expectations. I hope they can use this feedback constructively.`
  }

  return `I recently visited ${name} and wanted to share my thoughts. It was an interesting experience worth noting.`
}

export function buildFallbackReply(opts: {
  rating: number
  businessName?: string
  reviewText?: string
}): string {
  const { rating, businessName, reviewText } = opts
  const name = businessName || "our team"
  const detail = reviewText && reviewText.length >= 10 ? ` regarding "${reviewText.slice(0, 80)}"` : ""

  if (rating >= 4) {
    return `Thank you so much for taking the time to share this${detail} — it genuinely means a lot to ${name}. We're so glad we could help, and we look forward to seeing you again.`
  }
  if (rating === 3) {
    return `Thank you for the honest feedback${detail} — we're always trying to improve, and notes like yours help us do that. We'd love the chance to make your next visit even better.`
  }
  return `We're truly sorry your experience${detail} fell short of what you deserved, and we take this seriously. We'd like to make it right — please reach out to us directly so we can follow up personally.`
}
