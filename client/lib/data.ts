import type { Business, FeedbackSession, ManagedReview } from "./types"

// In-memory seed data. This is the single place to swap for Supabase later:
// each function below maps cleanly onto a table query.

export const DEMO_BUSINESS: Business = {
  id: "biz_demo",
  name: "Brightsmile Dental Studio",
  industry: "dental",
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=demo",
  googleRating: 4.7,
  googleReviewCount: 312,
  logoColor: "oklch(0.62 0.13 175)",
  slug: "brightsmile",
  promptTopics: [
    "Your dentist or hygienist",
    "How the appointment was booked",
    "The cleanliness of the office",
    "Wait time and scheduling",
    "How your treatment felt",
  ],
  createdAt: "2025-09-01T10:00:00.000Z",
  ownerEmail: "owner@brightsmile.com",
}

export const DEMO_REVIEWS: ManagedReview[] = [
  {
    id: "rev_1",
    businessId: "biz_demo",
    authorName: "Marcus Reilly",
    authorInitial: "M",
    rating: 5,
    text: "Dr. Lee walked me through the whole crown procedure before starting, so I knew exactly what was happening. The hygienist, Priya, was gentle and I was out in under 40 minutes. Booking online was painless too.",
    createdAt: "2026-06-08T14:30:00.000Z",
    replyStatus: "needs_reply",
    viaBeyondVyu: true,
  },
  {
    id: "rev_2",
    businessId: "biz_demo",
    authorName: "Sofia Alvarez",
    authorInitial: "S",
    rating: 5,
    text: "I've always been nervous about dentists but the team here made it so easy. They explained the cost upfront and there were no surprises on the bill.",
    createdAt: "2026-06-07T09:15:00.000Z",
    replyStatus: "replied",
    replyText:
      "Thank you so much, Sofia! We know dental visits can feel stressful, so we're really glad the team helped you feel at ease. See you at your next cleaning!",
    viaBeyondVyu: true,
  },
  {
    id: "rev_3",
    businessId: "biz_demo",
    authorName: "Dane Whitfield",
    authorInitial: "D",
    rating: 3,
    text: "Cleaning was good but I waited almost 30 minutes past my appointment time. The front desk was apologetic about it.",
    createdAt: "2026-06-05T16:45:00.000Z",
    replyStatus: "needs_reply",
    viaBeyondVyu: false,
  },
  {
    id: "rev_4",
    businessId: "biz_demo",
    authorName: "Hannah Cole",
    authorInitial: "H",
    rating: 5,
    text: "Brought my two kids in and the staff was incredibly patient with them. They even had little toothbrush goodie bags. Highly recommend for families.",
    createdAt: "2026-06-03T11:20:00.000Z",
    replyStatus: "draft",
    replyText: "Thanks Hannah! We love seeing the whole family.",
    viaBeyondVyu: true,
  },
  {
    id: "rev_5",
    businessId: "biz_demo",
    authorName: "Trevor Nash",
    authorInitial: "T",
    rating: 2,
    text: "The dental work was fine but I felt the upsell on whitening was pushy. Not what I came in for.",
    createdAt: "2026-05-29T13:00:00.000Z",
    replyStatus: "needs_reply",
    viaBeyondVyu: false,
  },
  {
    id: "rev_6",
    businessId: "biz_demo",
    authorName: "Aisha Bello",
    authorInitial: "A",
    rating: 5,
    text: "Switched here after a bad experience elsewhere. Dr. Patel found an issue my old dentist missed and fixed it same day. So grateful.",
    createdAt: "2026-05-25T10:10:00.000Z",
    replyStatus: "replied",
    replyText:
      "We're so glad we could help, Aisha, and that you're feeling better. Thank you for trusting us with your care!",
    viaBeyondVyu: true,
  },
]

// Recent feedback sessions for analytics on the dashboard.
export const DEMO_SESSIONS: FeedbackSession[] = [
  {
    id: "s1",
    businessId: "biz_demo",
    rating: 5,
    sentiment: "positive",
    highlights: "Dr. Lee explained the crown, Priya was gentle, fast visit",
    talkingPoints: [],
    status: "redirected_to_google",
    source: "qr",
    createdAt: "2026-06-08T14:25:00.000Z",
  },
  {
    id: "s2",
    businessId: "biz_demo",
    rating: 5,
    sentiment: "positive",
    highlights: "No surprise costs, friendly team",
    talkingPoints: [],
    status: "redirected_to_google",
    source: "sms",
    createdAt: "2026-06-07T09:10:00.000Z",
  },
  {
    id: "s3",
    businessId: "biz_demo",
    rating: 2,
    sentiment: "negative",
    highlights: "Felt pushed toward whitening",
    talkingPoints: [],
    status: "private_feedback",
    contactName: "Trevor Nash",
    contactEmail: "trevor@example.com",
    privateMessage: "I just wanted a cleaning and felt pressured to add services.",
    source: "qr",
    createdAt: "2026-05-29T12:55:00.000Z",
  },
  {
    id: "s4",
    businessId: "biz_demo",
    rating: 4,
    sentiment: "positive",
    highlights: "Good cleaning, easy parking",
    talkingPoints: [],
    status: "abandoned",
    source: "email",
    createdAt: "2026-05-28T15:30:00.000Z",
  },
]

// 14-day trend of review volume for the dashboard chart.
export const DEMO_TREND = [
  { day: "May 27", reviews: 2, requests: 9 },
  { day: "May 28", reviews: 1, requests: 7 },
  { day: "May 29", reviews: 3, requests: 12 },
  { day: "May 30", reviews: 4, requests: 14 },
  { day: "May 31", reviews: 2, requests: 6 },
  { day: "Jun 1", reviews: 5, requests: 16 },
  { day: "Jun 2", reviews: 3, requests: 11 },
  { day: "Jun 3", reviews: 6, requests: 18 },
  { day: "Jun 4", reviews: 4, requests: 13 },
  { day: "Jun 5", reviews: 7, requests: 21 },
  { day: "Jun 6", reviews: 5, requests: 15 },
  { day: "Jun 7", reviews: 8, requests: 24 },
  { day: "Jun 8", reviews: 9, requests: 26 },
  { day: "Jun 9", reviews: 6, requests: 19 },
]

// --- Async-style accessors (mimic a real data layer / future Supabase calls) ---

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  if (slug === DEMO_BUSINESS.slug) return DEMO_BUSINESS
  return null
}

export function getDemoBusiness(): Business {
  return DEMO_BUSINESS
}

export function getReviews(): ManagedReview[] {
  return DEMO_REVIEWS
}

export function getSessions(): FeedbackSession[] {
  return DEMO_SESSIONS
}
