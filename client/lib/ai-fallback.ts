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

export function buildFallbackReply(opts: {
  rating: number
  businessName?: string
  reviewText?: string
}): string {
  const { rating } = opts

  if (rating >= 4) {
    return "Thank you so much for taking the time to share this — it genuinely means a lot to our team. We're so glad we could help, and we look forward to seeing you again."
  }
  if (rating === 3) {
    return "Thank you for the honest feedback — we're always trying to improve, and notes like yours help us do that. We'd love the chance to make your next visit even better."
  }
  return "We're truly sorry your experience fell short of what you deserved, and we take this seriously. We'd like to make it right — please reach out to us directly so we can follow up personally."
}
