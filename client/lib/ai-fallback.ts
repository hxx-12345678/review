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
  "hidden gem",
  "must visit",
  "would recommend",
  "top notch",
  "second to none",
  "exceeded my expectations",
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
  const name = businessName || "this place"

  const openings = [
    `Just wanted to share my experience at ${name}.`,
    `Had a visit to ${name} recently here's my take.`,
    `Dropping a quick review for ${name}.`,
    `Came by ${name} and figured I'd leave my thoughts.`,
    `Visited ${name} and wanted to share what I thought.`,
  ]
  const opening = openings[Math.floor(Math.random() * openings.length)]

  if (talkingPoints && talkingPoints.length > 0) {
    const points = talkingPoints.slice(0, 2).join(", and ")
    const closings = [
      "That about sums it up.",
      "That's my honest take.",
      "Pretty much how it went.",
      "Worth noting down.",
    ]
    const closing = closings[Math.floor(Math.random() * closings.length)]
    return `${opening} ${points}. ${closing}`
  }

  if (highlights && highlights.trim().length >= 3) {
    return `${opening} ${highlights}. Hope this helps someone decide.`
  }

  const positiveClosings = [
    "Really happy with how it went.",
    "Would definitely go back.",
    "Left a good impression on me.",
    "Will be coming again for sure.",
  ]
  const neutralClosings = [
    "Decent overall, nothing special.",
    "It was okay some hits some misses.",
    "Fair enough for what it is.",
  ]
  const negativeClosings = [
    "Not what I was hoping for honestly.",
    "Hope they take the feedback seriously.",
    "Really disappointed won't lie.",
  ]

  if (rating && rating >= 4) {
    const closing = positiveClosings[Math.floor(Math.random() * positiveClosings.length)]
    return `${opening} ${closing}`
  }
  if (rating && rating === 3) {
    const closing = neutralClosings[Math.floor(Math.random() * neutralClosings.length)]
    return `${opening} ${closing}`
  }
  if (rating && rating <= 2) {
    const closing = negativeClosings[Math.floor(Math.random() * negativeClosings.length)]
    return `${opening} ${closing}`
  }

  return `${opening} That's about it.`
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
