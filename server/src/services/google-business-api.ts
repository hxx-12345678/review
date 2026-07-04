import { prisma } from "../config/database";
import { decrypt, type EncryptedData } from "../utils/encryption";
import { getEnv } from "../config/env";

// ── API Bases ─────────────────────────────────────────────────────────────────
const GBP_API_BASE = "https://mybusiness.googleapis.com/v4";

// ── Star Rating Enum Map ──────────────────────────────────────────────────────
// Google Business Profile API returns starRating as an enum string: "ONE", "TWO", "THREE", "FOUR", "FIVE"
// or "STAR_RATING_UNSPECIFIED". We must map these to integers properly.
const STAR_RATING_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  // Legacy formats sometimes include these prefixed values
  STAR_RATING_ONE: 1,
  STAR_RATING_TWO: 2,
  STAR_RATING_THREE: 3,
  STAR_RATING_FOUR: 4,
  STAR_RATING_FIVE: 5,
};

function parseStarRating(raw: string | number | undefined | null): number {
  if (raw == null) return 0;
  // If already a number (e.g., from Places API), return directly
  if (typeof raw === "number") return Math.min(Math.max(Math.round(raw), 1), 5);
  // Look up enum string in the map
  const upper = String(raw).toUpperCase().trim();
  if (STAR_RATING_MAP[upper] !== undefined) return STAR_RATING_MAP[upper];
  // Fallback: try to parse as integer
  const parsed = parseInt(upper, 10);
  return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 1), 5);
}

// ── Token Helpers ─────────────────────────────────────────────────────────────

function getDecryptedToken(googleAccount: any): string {
  const enc = googleAccount.tokenEncrypted as Record<string, EncryptedData> | null;
  if (enc?.accessToken) {
    return decrypt(enc.accessToken);
  }
  // Fallback for legacy tokens stored in plaintext
  if (googleAccount.accessToken && googleAccount.accessToken.length > 0) {
    return googleAccount.accessToken;
  }
  throw new Error("No access token available");
}

// ── Interfaces ────────────────────────────────────────────────────────────────

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

// ── GBP API: Fetch Reviews ────────────────────────────────────────────────────

/**
 * Fetches all reviews for a Google Business Profile location using the v4 API.
 * Requires OAuth2 access token with https://www.googleapis.com/auth/business.manage scope.
 * The GBP API is gated — requires manual approval from Google for new projects.
 * 
 * API endpoint: GET /v4/accounts/{accountId}/locations/{locationId}/reviews
 * starRating returned as enum: "ONE", "TWO", "THREE", "FOUR", "FIVE"
 */
export async function fetchGoogleReviews(
  accountId: string,
  locationId: string,
  accessToken: string,
): Promise<GoogleReviewData[]> {
  const url = `${GBP_API_BASE}/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50&orderBy=createTime%20desc`;

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
    // reviewId may be at r.reviewId OR derived from r.name (e.g., "accounts/x/locations/y/reviews/abc")
    reviewId: r.reviewId || r.name?.split("/").pop() || "",
    reviewerName: r.reviewer?.displayName || null,
    reviewerPhotoUrl: r.reviewer?.profilePhotoUrl || null,
    // FIX: starRating is an enum string like "FIVE", not a number
    starRating: parseStarRating(r.starRating),
    comment: r.comment || r.comment?.text || null,
    commentLanguage: r.comment?.languageCode || null,
    createTime: r.createTime || new Date().toISOString(),
    reviewReply: r.reviewReply?.comment || r.reviewReply?.comment?.text || null,
  }));
}

// ── Google Places API: Fetch Public Reviews (Fallback, no GBP approval needed) ──

/**
 * Fetches up to 5 public reviews for a business using the Google Places API (New).
 * This does NOT require GBP API approval — only a standard Maps Platform API key.
 * Returns a maximum of 5 reviews (Google's limit for Places API).
 * 
 * Prerequisites:
 * - Enable "Places API (New)" in Google Cloud Console
 * - Set GOOGLE_PLACES_API_KEY in .env
 * - Business must have a Google Place ID (store in business.googlePlaceId)
 */
export async function fetchPlacesApiReviews(
  placeId: string,
): Promise<GoogleReviewData[]> {
  const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY not set — cannot fetch via Places API");
  }

  // Use Places API (New) endpoint
  const url = `https://places.googleapis.com/v1/places/${placeId}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews",
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Places API fetch failed: ${res.status} — ${errorBody}`);
  }

  const data: any = await res.json();
  const reviews: any[] = data.reviews || [];

  return reviews.map((r: any, idx: number) => ({
    reviewId: `places_${placeId}_${idx}_${r.publishTime || Date.now()}`,
    reviewerName: r.authorAttribution?.displayName || null,
    reviewerPhotoUrl: r.authorAttribution?.photoUri || null,
    // Places API (New) returns rating as a number 1-5
    starRating: parseStarRating(r.rating),
    comment: r.text?.text || r.originalText?.text || null,
    commentLanguage: r.text?.languageCode || null,
    createTime: r.publishTime || new Date().toISOString(),
    reviewReply: null, // Places API does not provide owner replies
  }));
}

// ── Legacy Places API (v1 with key parameter) ─────────────────────────────────

/**
 * Fetches reviews using the legacy Places API v1 (maps.googleapis.com).
 * This is the classic endpoint that has been around the longest.
 */
export async function fetchLegacyPlacesApiReviews(
  placeId: string,
): Promise<GoogleReviewData[]> {
  const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY not set");
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews&key=${apiKey}&language=en`;

  const res = await fetch(url);

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Legacy Places API fetch failed: ${res.status} — ${errorBody}`);
  }

  const data: any = await res.json();
  if (data.status !== "OK") {
    throw new Error(`Places API error: ${data.status} — ${data.error_message || ""}`);
  }

  const reviews: any[] = data.result?.reviews || [];

  return reviews.map((r: any) => ({
    reviewId: `places_legacy_${placeId}_${r.time || Date.now()}`,
    reviewerName: r.author_name || null,
    reviewerPhotoUrl: r.profile_photo_url || null,
    // Legacy Places API returns rating as integer 1-5
    starRating: parseStarRating(r.rating),
    comment: r.text || null,
    commentLanguage: r.language || null,
    createTime: r.time ? new Date(r.time * 1000).toISOString() : new Date().toISOString(),
    reviewReply: null,
  }));
}

// ── GBP API: Post Reply ───────────────────────────────────────────────────────

/**
 * Posts a reply to a Google review using the GBP v4 API.
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

// ── Sync: GBP OAuth Reviews ───────────────────────────────────────────────────

/**
 * Syncs Google reviews from the GBP OAuth API into the local database.
 * Returns count of new reviews synced.
 * 
 * NOTE: GBP API is gated. If you get 403/404 errors, your Google Cloud project
 * has not been approved for GBP API access. You must submit the access request at:
 * https://developers.google.com/my-business/content/prerequisites#request-access
 * 
 * As an alternative, use syncPlacesApiReviews() with a Places API key.
 */
export async function syncGoogleReviews(businessId: string): Promise<{ synced: number; total: number }> {
  const googleAccount = await prisma.googleAccount.findUnique({
    where: { businessId },
  });

  if (!googleAccount) {
    throw new Error("No Google account connected for this business");
  }

  if (!googleAccount.googleAccountId) {
    throw new Error("Google Account ID not set — run initial setup first");
  }

  const accessToken = getDecryptedToken(googleAccount);
  const locationId = googleAccount.googleAccountId;
  const reviews = await fetchGoogleReviews(
    "me",
    locationId,
    accessToken,
  );

  return upsertReviews(businessId, googleAccount.id, reviews);
}

// ── Sync: Google Places API Reviews (Public, No OAuth Required) ───────────────

/**
 * Syncs public Google reviews using the Places API.
 * This is a fallback for businesses that haven't completed the GBP API access request.
 * Limited to 5 most relevant reviews.
 * 
 * Requires: GOOGLE_PLACES_API_KEY in .env + google Place ID stored in business record.
 */
export async function syncPlacesApiReviews(businessId: string): Promise<{ synced: number; total: number }> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, googlePlaceId: true },
  });

  if (!business?.googlePlaceId) {
    throw new Error("No Google Place ID configured for this business. Set it in Settings > Google Review URL.");
  }

  let reviews: GoogleReviewData[] = [];
  let source = "places-new";

  try {
    // Try new Places API first
    reviews = await fetchPlacesApiReviews(business.googlePlaceId);
  } catch (e) {
    try {
      // Fallback to legacy Places API
      reviews = await fetchLegacyPlacesApiReviews(business.googlePlaceId);
      source = "places-legacy";
    } catch (e2) {
      throw new Error(`Both Places API endpoints failed. New API: ${(e as Error).message}. Legacy: ${(e2 as Error).message}`);
    }
  }

  console.log(`[${source}] Fetched ${reviews.length} reviews for business ${businessId}`);

  // For Places API reviews, we need a GoogleAccount record (FK constraint)
  // Upsert a stub "places-api" account if none exists
  let googleAccount = await prisma.googleAccount.findUnique({
    where: { businessId },
  });

  if (!googleAccount) {
    googleAccount = await prisma.googleAccount.upsert({
      where: { businessId },
      create: {
        businessId,
        googleAccountId: `places-${businessId}`,
        accessToken: "",
        refreshToken: null,
        // tokenEncrypted omitted (null not valid for Prisma Json) — will be undefined/not set
      },
      update: {},
    });
  }

  return upsertReviews(businessId, googleAccount.id, reviews);
}

// ── Shared Upsert Logic ───────────────────────────────────────────────────────

async function upsertReviews(
  businessId: string,
  googleAccountId: string,
  reviews: GoogleReviewData[],
): Promise<{ synced: number; total: number }> {
  let synced = 0;

  for (const review of reviews) {
    if (!review.reviewId) continue;

    const existing = await prisma.googleReview.findUnique({
      where: { googleReviewId: review.reviewId },
    });

    if (!existing) {
      await prisma.googleReview.create({
        data: {
          googleReviewId: review.reviewId,
          googleAccountId,
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
    } else {
      // Update the comment/rating in case it changed, or if a reply was posted
      const needsUpdate =
        (review.reviewReply && existing.replyStatus !== "REPLIED") ||
        (review.starRating > 0 && existing.starRating !== review.starRating) ||
        (review.comment && existing.comment !== review.comment);

      if (needsUpdate) {
        await prisma.googleReview.update({
          where: { id: existing.id },
          data: {
            ...(review.reviewReply ? { reviewReply: review.reviewReply, replyStatus: "REPLIED" } : {}),
            ...(review.starRating > 0 ? { starRating: review.starRating } : {}),
            ...(review.comment ? { comment: review.comment } : {}),
          },
        });
      }
    }
  }

  return { synced, total: reviews.length };
}

// ── Language Detection ────────────────────────────────────────────────────────

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
