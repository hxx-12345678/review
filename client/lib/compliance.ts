// Compliance engine for ReviewOS.
//
// This module encodes the rules that keep ReviewOS on the right side of
// Google's "Prohibited & Restricted Content" policy and the FTC's rule on
// fake/AI reviews (16 C.F.R. Part 465, effective Oct 2024).
//
// The three hard rules we enforce everywhere:
//
// 1. NO AI-WRITTEN REVIEWS. Google explicitly bans "content that is AI-generated
//    or pre-written by the business." We NEVER produce a finished review for the
//    customer to paste. We only produce *talking points* that jog the customer's
//    own memory. The customer must write the review themselves on Google.
//
// 2. NO REVIEW GATING. We never filter customers by sentiment before showing the
//    Google link. Every customer — 1 star or 5 star — is offered the exact same,
//    equally visible public review button. Private feedback is offered ALONGSIDE
//    it, never as a substitute.
//
// 3. NO GENERIC / TEMPLATED CONTENT. Talking points must be derived from the
//    specific things the customer actually said, so two customers never get the
//    same output. We validate against a banned generic-phrase list.

export const COMPLIANCE_RULES = [
  {
    id: "ai-assisted-drafts",
    title: "AI-assisted, user-approved",
    body: "ReviewOS generates a helpful draft from the customer's own answers. The customer always has full control — they can edit, rewrite, or regenerate until it sounds like them. Nothing gets posted without the customer's final approval.",
  },
  {
    id: "no-gating",
    title: "No review gating",
    body: "Every customer is shown the same Google review link, regardless of their rating. Filtering out unhappy customers violates Google policy and the FTC rule.",
  },
  {
    id: "authentic-only",
    title: "Authentic, specific content",
    body: "Talking points are generated only from details the customer provides, so no two reviews look alike and nothing reads as a template.",
  },
  {
    id: "transparent-private",
    title: "Transparent private feedback",
    body: "Private feedback is always offered as an additional option, never a replacement for the public review.",
  },
] as const

// Generic phrases that make a review look templated / AI-generated.
// Used to score and warn against low-quality talking points.
const GENERIC_PHRASES = [
  "highly recommend",
  "best ever",
  "amazing service",
  "great experience",
  "10/10",
  "would recommend to anyone",
  "top notch",
  "second to none",
  "exceeded my expectations",
  "five stars",
]

export interface AuthenticityResult {
  score: number // 0-100, higher = more authentic/specific
  level: "strong" | "fair" | "weak"
  warnings: string[]
}

// Scores how specific/authentic a piece of customer text is.
// We use this to nudge the customer toward concrete details, which both
// produces better reviews AND keeps them clear of Google's spam filters.
export function scoreAuthenticity(text: string): AuthenticityResult {
  const warnings: string[] = []
  const trimmed = text.trim()
  const words = trimmed.split(/\s+/).filter(Boolean)
  let score = 50

  // Length signals effort and specificity.
  if (words.length >= 25) score += 25
  else if (words.length >= 12) score += 12
  else warnings.push("Add a few more details — short notes can look generic to Google.")

  // Concrete nouns: names, specifics. Reward capitalized mid-sentence words & numbers.
  const hasSpecifics = /\b(dr\.?|mr\.?|ms\.?|[A-Z][a-z]{2,})\b/.test(trimmed) || /\d/.test(trimmed)
  if (hasSpecifics) score += 15
  else warnings.push("Mention a specific person, dish, or detail to make it authentic.")

  // Penalize generic marketing phrases.
  const lower = trimmed.toLowerCase()
  const genericHits = GENERIC_PHRASES.filter((p) => lower.includes(p))
  if (genericHits.length > 0) {
    score -= genericHits.length * 12
    warnings.push("Try your own words instead of phrases like \u201c" + genericHits[0] + ".\u201d")
  }

  score = Math.max(0, Math.min(100, score))
  const level: AuthenticityResult["level"] = score >= 75 ? "strong" : score >= 50 ? "fair" : "weak"

  return { score, level, warnings }
}

// Determines sentiment bucket from a star rating.
export function ratingToSentiment(rating: number): "positive" | "neutral" | "negative" {
  if (rating >= 4) return "positive"
  if (rating === 3) return "neutral"
  return "negative"
}

// The compliant copy shown at the review step. CRUCIALLY, the Google link is
// returned for EVERY rating — we only change the surrounding encouragement.
export function getReviewStepConfig(rating: number) {
  const sentiment = ratingToSentiment(rating)
  return {
    // Always true — no gating. The button is always offered.
    showGoogleButton: true,
    // Private feedback is always available, but emphasized more for low ratings
    // so the business can make things right. It NEVER hides the Google button.
    emphasizePrivateFeedback: sentiment === "negative",
    headline:
      sentiment === "positive"
        ? "Glad you had a great visit!"
        : sentiment === "neutral"
          ? "Thanks for your honest feedback"
          : "We're sorry it wasn't perfect",
    subhead:
      sentiment === "positive"
        ? "Would you share what stood out? It helps others find us."
        : sentiment === "neutral"
          ? "You can post a public review and/or send us private notes."
          : "You can tell us privately so we can fix it, and you're also welcome to post a public review.",
    // DescribeStep copy — sentiment-aware prompts that nudge toward specifics.
    describePrompt:
      sentiment === "positive"
        ? "What made it great?"
        : sentiment === "neutral"
          ? "What could have been better?"
          : "What went wrong?",
    describeHint:
      sentiment === "positive"
        ? "Mention a specific person, dish, or moment. Details make your review more helpful."
        : sentiment === "neutral"
          ? "Even a small detail helps the business improve. You can also keep this private."
          : "Tell us what happened. You can send this directly to the owner or post it on Google.",
  }
}

