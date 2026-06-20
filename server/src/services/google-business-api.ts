import { prisma } from "../config/database";

const GBP_API_BASE = "https://mybusiness.googleapis.com/v4";

interface GoogleReviewData {
  reviewId: string;
  reviewerName: string | null;
  reviewerPhotoUrl: string | null;
  starRating: number;
  comment: string | null;
  commentLanguage: string | null;
  createTime: string;
  reviewReply: string | null;
}

/**
 * Fetches all reviews for a Google Business Profile location.
 * Requires a valid OAuth2 access token with the https://www.googleapis.com/auth/business.manage scope.
 */
export async function fetchGoogleReviews(
  accountId: string,
  locationId: string,
  accessToken: string,
): Promise<GoogleReviewData[]> {
  const url = `${GBP_API_BASE}/accounts/${accountId}/locations/${locationId}/reviews?pageSize=100&orderBy=createTime%20desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Business API fetch failed: ${res.status} — ${errorBody}`);
  }

  const data: any = await res.json();
  const reviews: any[] = data.reviews || [];

  return reviews.map((r: any) => ({
    reviewId: r.reviewId || r.name?.split("/").pop() || "",
    reviewerName: r.reviewer?.displayName || null,
    reviewerPhotoUrl: r.reviewer?.profilePhotoUrl || null,
    starRating: parseInt(r.starRating?.replace("STAR_RATING_", "") || "0", 10) || 0,
    comment: r.comment?.text || null,
    commentLanguage: r.comment?.languageCode || null,
    createTime: r.createTime || new Date().toISOString(),
    reviewReply: r.reviewReply?.comment?.text || null,
  }));
}

/**
 * Posts a reply to a Google review.
 */
export async function replyToGoogleReview(
  accountId: string,
  locationId: string,
  reviewId: string,
  replyText: string,
  accessToken: string,
): Promise<void> {
  const url = `${GBP_API_BASE}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: { text: replyText },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Business API reply failed: ${res.status} — ${errorBody}`);
  }
}

/**
 * Syncs Google reviews from the GBP API into the local database.
 * Returns count of new reviews synced.
 */
export async function syncGoogleReviews(businessId: string): Promise<{ synced: number; total: number }> {
  const googleAccount = await prisma.googleAccount.findUnique({
    where: { businessId },
  });

  if (!googleAccount?.accessToken) {
    throw new Error("No Google account connected for this business");
  }

  if (!googleAccount.googleAccountId) {
    throw new Error("Google Account ID not set — run initial setup first");
  }

  const locationId = googleAccount.googleAccountId;
  const reviews = await fetchGoogleReviews(
    "me",
    locationId,
    googleAccount.accessToken,
  );

  let synced = 0;
  for (const review of reviews) {
    const existing = await prisma.googleReview.findUnique({
      where: { googleReviewId: review.reviewId },
    });

    if (!existing) {
      await prisma.googleReview.create({
        data: {
          googleReviewId: review.reviewId,
          googleAccountId: googleAccount.id,
          businessId,
          reviewerName: review.reviewerName,
          reviewerPhotoUrl: review.reviewerPhotoUrl,
          starRating: review.starRating,
          comment: review.comment,
          commentLanguage: review.commentLanguage,
          createTime: new Date(review.createTime),
          reviewReply: review.reviewReply,
          replyStatus: review.reviewReply ? "REPLIED" : "NEEDS_REPLY",
        },
      });
      synced++;
    } else if (review.reviewReply && existing.replyStatus !== "REPLIED") {
      // Update if a reply was posted on Google outside our system
      await prisma.googleReview.update({
        where: { id: existing.id },
        data: {
          reviewReply: review.reviewReply,
          replyStatus: "REPLIED",
        },
      });
    }
  }

  return { synced, total: reviews.length };
}

/**
 * Detects the language of a text string using basic heuristics.
 * Falls back to "en" if uncertain. Used to determine reply language.
 */
export function detectLanguage(text: string): string {
  if (!text) return "en";

  // Devanagari script range
  if (/[\u0900-\u097F]/.test(text)) {
    // Check for Gujarati-specific characters
    if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
    return "hi";
  }

  // Gujarati script
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu";

  // Hinglish detection: common Hindi words in Latin script
  const hinglishWords = ["hai", "tha", "bahut", "aap", "achha", "bohot", "acchi", "kya", "nahi", "mera", "meri", "hum", "tum", "yeh", "woh", "jiska", "jaisa", "jaise", "aapne", "maine", "humein", "unka", "unke", "unki", "iska", "iske", "isi", "usi", "kuch", "thoda", "aata", "jaata", "raha", "rahi", "gaya", "gayi", "diya", "diye", "liya", "liye", "kiya", "kiye", "hua", "hue", "ho", "hu", "the", "thi", "thein"];
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const hinglishScore = words.filter((w) => hinglishWords.includes(w)).length;

  // If significant Hinglish word presence, return "hi" (the AI prompt will handle mixed output)
  if (hinglishScore >= 2 && hinglishScore / words.length > 0.1) return "hi";

  return "en";
}
