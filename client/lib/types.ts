// Core domain types for ReviewOS.
// Designed to map 1:1 onto a future Supabase schema (snake_case columns -> camelCase here).

export type Industry =
  | "dental"
  | "salon"
  | "restaurant"
  | "clinic"
  | "auto"
  | "fitness"
  | "home_services"
  | "other"

export type Sentiment = "positive" | "neutral" | "negative"

export type ReviewStatus = "redirected_to_google" | "private_feedback" | "abandoned"

export type ReplyStatus = "needs_reply" | "draft" | "replied"

export interface Business {
  id: string
  name: string
  industry: Industry
  // The public Google "write a review" link (place review url).
  googleReviewUrl: string
  // Average rating + count as shown on the public profile (display only).
  googleRating: number
  googleReviewCount: number
  logoColor: string
  // The slug used for the public feedback page: /r/[slug]
  slug: string
  // Custom prompt topics the AI uses to jog the customer's memory.
  promptTopics: string[]
  // Branding
  logoUrl?: string
  primaryColor?: string
  backgroundColor?: string
  splashTagline?: string
  showPoweredBy?: boolean
  createdAt: string
  ownerEmail: string
}

// A single customer interaction with the feedback flow.
export interface FeedbackSession {
  id: string
  businessId: string
  // 1-5 star rating the customer selected.
  rating: number
  sentiment: Sentiment
  // The free-text highlights the customer typed in (their own words).
  highlights: string
  // The talking points the AI generated to JOG MEMORY (not a finished review).
  talkingPoints: string[]
  status: ReviewStatus
  // Optional contact info if they left private feedback.
  contactName?: string
  contactEmail?: string
  privateMessage?: string
  // The source channel.
  source: "qr" | "sms" | "email" | "link"
  createdAt: string
}

// A review pulled in from Google (read-only mirror) for the inbox.
export interface ManagedReview {
  id: string
  businessId: string
  authorName: string
  authorInitial: string
  rating: number
  text: string
  createdAt: string
  replyStatus: ReplyStatus
  replyText?: string
  // Whether this review likely came through a ReviewOS session.
  viaBeyondVyu: boolean
}
