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
export function deriveTalkingPoints(highlights: string, selectedTopics?: string[]): string[] {
  const points: string[] = []

  if (highlights && highlights.trim().length >= 3) {
    const fragments = highlights
      .split(/[.,;\n]|(?:\band\b)/i)
      .map((f) => f.trim())
      .filter((f) => f.length >= 4 && !isTooGeneric(f))

    for (const fragment of fragments) {
      const words = fragment.split(/\s+/).slice(0, 12).join(" ")
      const cleaned = words.charAt(0).toUpperCase() + words.slice(1)
      if (!points.includes(cleaned)) points.push(cleaned)
      if (points.length >= 5) break
    }
  }

  // Add selected topics as talking points if we still have room
  if (points.length < 5 && selectedTopics && selectedTopics.length > 0) {
    for (const topic of selectedTopics) {
      const cleaned = topic.charAt(0).toUpperCase() + topic.slice(1)
      if (!points.includes(cleaned) && !isTooGeneric(topic)) {
        points.push(cleaned)
        if (points.length >= 5) break
      }
    }
  }

  return points.slice(0, 5)
}

function detectSentimentConflict(highlights?: string, selectedTopics?: string[]): "aligned" | "mixed" {
  if (!highlights || highlights.trim().length < 3) return "aligned"
  const lower = highlights.toLowerCase()
  const positiveWords = ["good", "great", "excellent", "amazing", "wonderful", "fantastic", "love", "best", "happy", "satisfied", "friendly", "kind", "helpful", "caring", "comfortable", "clean", "professional", "quick", "fast", "nice"]
  const negativeWords = ["bad", "terrible", "awful", "horrible", "worst", "hate", "poor", "rude", "slow", "unhelpful", "unclean", "dirty", "uncomfortable", "expensive", "overpriced", "disappointed", "frustrating", "waste", "shoddy"]

  // Check for mixed sentiment WITHIN the highlights text itself
  const textHasPositive = positiveWords.some(w => lower.includes(w))
  const textHasNegative = negativeWords.some(w => lower.includes(w))
  if (textHasPositive && textHasNegative) return "mixed"

  // Check for contradiction between selectedTopics and highlights
  // If topics are positive-leaning but highlights are entirely negative, or vice versa
  if (selectedTopics && selectedTopics.length > 0) {
    const topicSentiments = selectedTopics.map(t => {
      const tl = t.toLowerCase()
      const isPos = positiveWords.some(w => tl.includes(w))
      const isNeg = negativeWords.some(w => tl.includes(w))
      return isPos ? 1 : isNeg ? -1 : 0
    })
    const topicScore = topicSentiments.reduce((a: number, b) => a + b, 0)
    // Topics are positive on balance
    if (topicScore > 0 && textHasNegative && !textHasPositive) return "mixed"
    // Topics are negative on balance
    if (topicScore < 0 && textHasPositive && !textHasNegative) return "mixed"
  }

  return "aligned"
}

export function buildFallbackReview(opts: {
  highlights?: string
  businessName?: string
  rating?: number
  talkingPoints?: string[]
  selectedTopics?: string[]
}): string {
  const { highlights, businessName, rating, talkingPoints, selectedTopics } = opts
  const name = businessName || "this place"
  const conflict = detectSentimentConflict(highlights, selectedTopics)

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
    if (conflict === "mixed") {
      const mixedClosings = [
        "Mixed feelings overall but just sharing honestly.",
        "Had some good moments and some not so good ones.",
        "Some things worked some didn't — being honest here.",
        "Both good and bad parts worth mentioning.",
      ]
      const closing = mixedClosings[Math.floor(Math.random() * mixedClosings.length)]
      return `${opening} ${highlights}. ${closing}`
    }
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
