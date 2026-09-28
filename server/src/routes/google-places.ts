import { Router, Request, Response } from "express";
import { getEnv } from "../config/env";
import { authRequired, AuthRequest } from "../middleware/auth";
import { publicPlacesLimiter } from "../middleware/rate-limit";
import { prisma } from "../config/database";

const router = Router();

const PLACES_BASE = "https://places.googleapis.com/v1";

// ── Simple 5-min in-memory cache to respect 300 QPM + avoid quota burn ──
const cache = new Map<string, { value: any; expiresAt: number }>();
function getCache(key: string) {
  const c = cache.get(key);
  if (c && c.expiresAt > Date.now()) return c.value;
  if (c) cache.delete(key);
  return null;
}
function setCache(key: string, value: any, ttlMs = 5 * 60 * 1000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  if (cache.size > 200) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  totalRatings: number | null;
}

// Shared Text Search helper (used by authed /search and public /search-public).
// Throws on API failure so callers decide the status code.
async function textSearch(query: string, maxResultCount: number): Promise<PlaceResult[]> {
  const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Google Places API key not configured");
  const response = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus",
    },
    body: JSON.stringify({ textQuery: query, languageCode: "en", maxResultCount }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Places API search error:", response.status, errorBody);
    throw new Error("Places API search failed");
  }
  const data: any = await response.json();
  return ((data.places || []) as any[])
    .filter((p: any) => p.businessStatus === "OPERATIONAL")
    .map((p: any) => ({
      placeId: p.id || "",
      name: p.displayName?.text || p.displayName || "",
      address: p.formattedAddress || "",
      rating: p.rating ?? null,
      totalRatings: p.userRatingCount ?? null,
    }));
}

/**
 * GET /api/google-places/search?query=...
 *
 * Searches Google Places API (New) Text Search for businesses matching the query.
 * Returns a list of matching places with their Place ID, name, address, rating.
 */
router.get("/search", authRequired, async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string || "").trim();
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }
    const results = await textSearch(query, 6);
    res.json({ results });
  } catch (err: any) {
    console.error("Google Places search error:", err);
    const msg = err.message === "Google Places API key not configured" ? err.message : "Places API search failed";
    res.status(err.message === "Google Places API key not configured" ? 500 : 502).json({ error: msg });
  }
});

// ── GET /search-public?query= — Free Health Check listing lookup (NO AUTH) ──
// Same data as /search, guarded by publicPlacesLimiter (15/min/IP) + the
// global apiLimiter. No AI, no DB writes — quota cost is 1 Places call.
router.get("/search-public", publicPlacesLimiter, async (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string || "").trim().slice(0, 200);
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Query must be at least 2 characters" });
    }
    const cacheKey = `search-public:${query.toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
    const results = await textSearch(query, 6);
    const out = { results };
    setCache(cacheKey, out);
    res.json(out);
  } catch (err: any) {
    console.error("Public places search error:", err);
    res.status(502).json({ error: "Search failed. Please try again." });
  }
});

// ── GET /health-check?placeId= — Free Google Review Health Check (NO AUTH) ──
// Lead magnet: live count + rating + recent activity + competitors + gap tier.
// Unanswered count, velocity history, response coverage and workflow gaps need
// synced account data — returned as locked teasers that convert to free signup.
// No AI calls, no DB writes. Cached 1h per placeId to bound quota burn.
router.get("/health-check", publicPlacesLimiter, async (req: Request, res: Response) => {
  try {
    const placeId = ((req.query.placeId as string) || "").trim().slice(0, 200);
    if (!placeId) return res.status(400).json({ error: "placeId required" });
    const cacheKey = `health-check:${placeId}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Health check unavailable right now" });

    const selfRes = await fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews,primaryType",
      },
    });
    if (!selfRes.ok) return res.status(502).json({ error: "Could not find that Google listing" });
    const selfData: any = await selfRes.json();
    const sample: any[] = selfData.reviews || [];
    let lastReviewAt: string | null = null;
    if (sample.length > 0) {
      const times = sample.map((r: any) => r.publishTime).filter(Boolean).map((t: string) => new Date(t).getTime());
      if (times.length > 0) lastReviewAt = new Date(Math.max(...times)).toISOString();
    }
    const rating: number | null = selfData.rating ?? null;
    const total: number | null = selfData.userRatingCount ?? null;
    const daysSince = lastReviewAt ? Math.floor((Date.now() - new Date(lastReviewAt).getTime()) / 86400000) : null;

    // Competitors from the listing's own type + address (no user context needed).
    // primaryType is often generic ("store") which returns nothing useful, so
    // fall back to city-scoped and name-derived queries. Max 3 Places calls
    // per uncached check; result cached 1h below.
    const selfId = selfData.id || placeId;
    const selfName: string = selfData.displayName?.text || "";
    const selfAddr: string = selfData.formattedAddress || "";
    const typeLabel = (selfData.primaryType || "business").toString().replace(/_/g, " ");
    const GENERIC_TYPES = new Set(["store", "point of interest", "establishment", "premise", "food", "health", "business"]);
    function cityFromAddress(addr: string): string {
      const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 3) return parts[parts.length - 3].replace(/\d{6}.*$/, "").trim();
      return "";
    }
    const city = cityFromAddress(selfAddr);
    const nameTail = selfName.split(/\s+/).filter(Boolean).slice(-2).join(" ");
    // Generic primaryTypes ("store") match the wrong vertical — the business
    // name tail ("Auto Garage") is far more relevant, so it goes first.
    const isGeneric = GENERIC_TYPES.has(typeLabel.toLowerCase());
    const queries =
      isGeneric && nameTail && city
        ? [`${nameTail} in ${city}`, `${typeLabel} in ${city}`, `${typeLabel} near ${selfAddr}`.trim()]
        : [`${typeLabel} near ${selfAddr}`.trim(), ...(city ? [`${typeLabel} in ${city}`] : [])];
    let competitors: PlaceResult[] = [];
    let compQueryUsed = queries[0];
    for (const q of queries.slice(0, 3)) {
      try {
        compQueryUsed = q;
        competitors = (await textSearch(q, 10))
          .filter((c) => c.placeId !== selfId && c.rating != null)
          .sort((a, b) => (b.totalRatings || 0) - (a.totalRatings || 0))
          .slice(0, 3);
        if (competitors.length >= 2) break;
      } catch (e) {
        console.error("Health-check competitors failed:", e);
      }
    }
    const compAvg = competitors.length
      ? Math.round((competitors.reduce((s, c) => s + (c.totalRatings || 0), 0) / competitors.length))
      : null;
    const compAvgRating = competitors.length
      ? Math.round((competitors.reduce((s, c) => s + (c.rating || 0), 0) / competitors.length) * 10) / 10
      : null;
    let gap: "High" | "Medium" | "Low" | "Unknown" = "Unknown";
    let gapDeficit: number | null = null;
    if (total != null && compAvg != null) {
      gapDeficit = Math.max(0, compAvg - total);
      const behind = compAvgRating != null && rating != null ? compAvgRating - rating : 0;
      if (gapDeficit > 200 || behind >= 0.4) gap = "High";
      else if (gapDeficit > 50 || behind >= 0.2) gap = "Medium";
      else gap = "Low";
    }

    const out = {
      place: {
        placeId: selfData.id || placeId,
        name: selfData.displayName?.text || "",
        address: selfData.formattedAddress || "",
        rating,
        totalRatings: total,
        lastReviewAt,
        daysSinceLastReview: daysSince,
        reviewSampleCount: sample.length,
      },
      competitors,
      competitorAverages: { avgRating: compAvgRating, avgTotal: compAvg },
      competitorQuery: compQueryUsed,
      gap,
      gapDeficit,
      // Honest locked teasers — unknowable without a connected account, and
      // saying otherwise would be hallucination. They are the signup hook.
      locked: [
        { id: "unanswered", label: "Unanswered-review count", why: "Needs your connected Google account" },
        { id: "velocity", label: "Review velocity (per week / month)", why: "Needs your review history" },
        { id: "response", label: "Response coverage", why: "Needs your reply data" },
        { id: "workflow", label: "Workflow gaps (touchpoints, funnel)", why: "Needs your QR deployment" },
      ],
      message: "Your business has reviews, but no continuous review collection system behind them. See exactly where customers drop off.",
      cta: "See how the BeyondVyu funnel would work for you.",
      fetchedAt: new Date().toISOString(),
      source: "google_places",
    };
    // 1h cache — listing data moves slowly, quota is precious on a free tool
    setCache(cacheKey, out, 60 * 60 * 1000);
    res.json(out);
  } catch (err: any) {
    console.error("Health check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /details?placeId= — Live rating, total, last review, location ──
// Source: Places API (New) Place Details. No hallucination — all numbers from Google.
router.get("/details", authRequired, async (req: Request, res: Response) => {
  try {
    const placeId = ((req.query.placeId as string) || "").trim();
    if (!placeId) return res.status(400).json({ error: "placeId required" });
    const cacheKey = `details:${placeId}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Google Places API key not configured" });

    const url = `${PLACES_BASE}/places/${encodeURIComponent(placeId)}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews,location,primaryType",
      },
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Places details error:", response.status, body);
      return res.status(502).json({ error: "Places details failed", details: body.slice(0, 300) });
    }
    const data: any = await response.json();
    const reviews: any[] = data.reviews || [];
    let lastReviewAt: string | null = null;
    if (reviews.length > 0) {
      const times = reviews.map((r: any) => r.publishTime).filter(Boolean).map((t: string) => new Date(t).getTime());
      if (times.length > 0) lastReviewAt = new Date(Math.max(...times)).toISOString();
    }
    const out = {
      placeId: data.id || placeId,
      name: data.displayName?.text || "",
      address: data.formattedAddress || "",
      rating: data.rating ?? null,
      totalRatings: data.userRatingCount ?? null,
      lastReviewAt,
      reviewSampleCount: reviews.length,
      location: data.location || null,
      primaryType: data.primaryType || null,
      fetchedAt: new Date().toISOString(),
      source: "google_places_details",
    };
    setCache(cacheKey, out);
    res.json(out);
  } catch (err: any) {
    console.error("Places details error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /competitors?placeId=&query= — Nearby competitors via Text Search ──
// Uses same searchText as onboarding, filters self, sorts by totalRatings desc, top 3.
// GBP API forbids prospecting; Places Text Search is the compliant public path.
router.get("/competitors", authRequired, async (req: Request, res: Response) => {
  try {
    const placeId = ((req.query.placeId as string) || "").trim();
    const query = ((req.query.query as string) || "").trim();
    if (!query || query.length < 2) return res.status(400).json({ error: "query required (e.g. 'dentist in Mumbai')" });
    const cacheKey = `competitors:${query.toLowerCase()}:${placeId}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Google Places API key not configured" });

    const response = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus",
      },
      body: JSON.stringify({ textQuery: query, languageCode: "en", maxResultCount: 10 }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Competitors search error:", response.status, body);
      return res.status(502).json({ error: "Competitors search failed", details: body.slice(0, 300) });
    }
    const data: any = await response.json();
    const places: any[] = (data.places || []).filter((p: any) => p.businessStatus === "OPERATIONAL" && p.id !== placeId);
    const mapped = places.map((p: any) => ({
      placeId: p.id || "",
      name: p.displayName?.text || "",
      address: p.formattedAddress || "",
      rating: p.rating ?? null,
      totalRatings: p.userRatingCount ?? null,
    })).filter((c: any) => c.rating != null && c.totalRatings != null)
      .sort((a: any, b: any) => (b.totalRatings || 0) - (a.totalRatings || 0))
      .slice(0, 3);
    const out = { competitors: mapped, query, fetchedAt: new Date().toISOString(), source: "google_places_searchText" };
    setCache(cacheKey, out);
    res.json(out);
  } catch (err: any) {
    console.error("Competitors error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /review-gap?businessId= — Pain visualization: you vs nearby ──
// Returns: your rating/reviews/lastReview + competitors + gap High/Med/Low + velocity plan.
// Velocity guidance follows Feb 2026 policy + Localo study: 2-5/week safe, no bulk.
router.get("/review-gap", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = (req.query.businessId as string) || "";
    if (!businessId) return res.status(400).json({ error: "businessId required" });
    const business = await prisma.business.findFirst({ where: { id: businessId, userId: req.userId } });
    if (!business) return res.status(404).json({ error: "Business not found" });
    if (!business.googlePlaceId) return res.status(400).json({ error: "No Google Place ID — select your Google listing in onboarding or settings first", code: "NO_PLACE_ID" });

    const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Google Places API key not configured" });

    // 1. Self details (live)
    const selfUrl = `${PLACES_BASE}/places/${encodeURIComponent(business.googlePlaceId)}`;
    const selfRes = await fetch(selfUrl, {
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews,location" },
    });
    if (!selfRes.ok) {
      const body = await selfRes.text();
      return res.status(502).json({ error: "Failed to fetch your Google listing", details: body.slice(0, 300) });
    }
    const selfData: any = await selfRes.json();
    const selfReviews: any[] = selfData.reviews || [];
    let lastReviewAt: string | null = null;
    if (selfReviews.length > 0) {
      const times = selfReviews.map((r: any) => r.publishTime).filter(Boolean).map((t: string) => new Date(t).getTime());
      if (times.length > 0) lastReviewAt = new Date(Math.max(...times)).toISOString();
    }
    // Fallback last review from DB (GoogleReview first, then Feedback) if Places returns no publishTime
    let lastReviewSource: "google_places" | "google_db" | "feedback_db" | null = selfReviews.length > 0 && lastReviewAt ? "google_places" : null;
    if (!lastReviewAt) {
      const lastDb = await prisma.googleReview.findFirst({ where: { businessId }, orderBy: { createTime: "desc" }, select: { createTime: true } });
      if (lastDb) { lastReviewAt = lastDb.createTime.toISOString(); lastReviewSource = "google_db"; }
    }
    if (!lastReviewAt) {
      const lastFb = await prisma.feedback.findFirst({ where: { businessId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
      if (lastFb) { lastReviewAt = lastFb.createdAt.toISOString(); lastReviewSource = "feedback_db"; }
    }
    const yourRating: number | null = selfData.rating ?? null;
    const yourTotal: number | null = selfData.userRatingCount ?? null;
    const googleName: string = selfData.displayName?.text || "";
    const googleAddress: string = selfData.formattedAddress || "";
    const nameMismatch = googleName && business.name ? googleName.toLowerCase().trim() !== business.name.toLowerCase().trim() : false;
    const daysSinceLast = lastReviewAt ? Math.floor((Date.now() - new Date(lastReviewAt).getTime()) / 86400000) : null;

    // 2. Competitors via Text Search: "{industry label} in {location}"
    const industryLabel = (business.industry || "business").toLowerCase().replace(/_/g, " ");
    const compQuery = `${industryLabel} in ${business.location || selfData.formattedAddress || ""}`.trim();
    let competitors: any[] = [];
    try {
      const compRes = await fetch(`${PLACES_BASE}/places:searchText`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus" },
        body: JSON.stringify({ textQuery: compQuery, languageCode: "en", maxResultCount: 10 }),
      });
      if (compRes.ok) {
        const compData: any = await compRes.json();
        competitors = ((compData.places || []) as any[])
          .filter((p: any) => p.businessStatus === "OPERATIONAL" && p.id !== business.googlePlaceId)
          .map((p: any) => ({ placeId: p.id, name: p.displayName?.text || "", address: p.formattedAddress || "", rating: p.rating ?? null, totalRatings: p.userRatingCount ?? null }))
          .filter((c: any) => c.rating != null)
          .sort((a: any, b: any) => (b.totalRatings || 0) - (a.totalRatings || 0))
          .slice(0, 3);
      }
    } catch (e) {
      console.error("Review-gap competitors failed:", e);
    }

    // 3. Gap calculation — no hallucination, pure arithmetic on live numbers
    const compAvgRating = competitors.length ? competitors.reduce((s: number, c: any) => s + (c.rating || 0), 0) / competitors.length : null;
    const compAvgTotal = competitors.length ? Math.round(competitors.reduce((s: number, c: any) => s + (c.totalRatings || 0), 0) / competitors.length) : null;
    const compMaxTotal = competitors.length ? Math.max(...competitors.map((c: any) => c.totalRatings || 0)) : null;
    let gap: "High" | "Medium" | "Low" | "Unknown" = "Unknown";
    let gapDeficit: number | null = null;
    if (yourTotal != null && compAvgTotal != null) {
      gapDeficit = Math.max(0, compAvgTotal - yourTotal);
      const ratingBehind = compAvgRating != null && yourRating != null ? compAvgRating - yourRating : 0;
      if (gapDeficit > 200 || ratingBehind >= 0.4) gap = "High";
      else if (gapDeficit > 50 || ratingBehind >= 0.2) gap = "Medium";
      else gap = "Low";
    }

    // 4. Six-dimension breakdown from YOUR synced data (no hallucination — all from DB + live Places)
    const [dbReviews, feedbacks] = await Promise.all([
      prisma.googleReview.findMany({ where: { businessId }, orderBy: { createTime: "desc" }, take: 200, select: { starRating: true, createTime: true, replyStatus: true, comment: true } }),
      prisma.feedback.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 200, select: { rating: true, createdAt: true } }),
    ]);
    const now = Date.now();
    const inDays = (d: Date, n: number) => now - new Date(d).getTime() <= n * 86400000;
    const dbLast30 = dbReviews.filter((r) => inDays(r.createTime, 30)).length + feedbacks.filter((f) => inDays(f.createdAt, 30)).length;
    const dbLast90 = dbReviews.filter((r) => inDays(r.createTime, 90)).length + feedbacks.filter((f) => inDays(f.createdAt, 90)).length;
    const dbTotal = dbReviews.length + feedbacks.length;
    // Velocity history: reviews/week over last 12 weeks (DB truth)
    const perWeekHistory: number[] = [];
    for (let w = 11; w >= 0; w--) {
      const start = now - (w + 1) * 7 * 86400000;
      const end = now - w * 7 * 86400000;
      const c = dbReviews.filter((r) => { const t = new Date(r.createTime).getTime(); return t >= start && t < end; }).length
        + feedbacks.filter((f) => { const t = new Date(f.createdAt).getTime(); return t >= start && t < end; }).length;
      perWeekHistory.push(c);
    }
    const avgPerWeek = Math.round((perWeekHistory.reduce((a, b) => a + b, 0) / 12) * 10) / 10;
    // Response behavior: reply rate from synced Google reviews (replyStatus REPLIED)
    const googleTotal = dbReviews.length;
    const replied = dbReviews.filter((r) => r.replyStatus === "REPLIED").length;
    const needsReply = googleTotal - replied;
    const replyRate = googleTotal ? Math.round((replied / googleTotal) * 100) : null;
    // Sentiment: positive >=4, neutral 3, negative <=2 across Google + Feedback
    const allRatings = [...dbReviews.map((r) => r.starRating), ...feedbacks.map((f) => f.rating)];
    const pos = allRatings.filter((r) => r >= 4).length;
    const neu = allRatings.filter((r) => r === 3).length;
    const neg = allRatings.filter((r) => r <= 2).length;
    const sentiment = allRatings.length
      ? { positive: Math.round((pos / allRatings.length) * 100), neutral: Math.round((neu / allRatings.length) * 100), negative: Math.round((neg / allRatings.length) * 100), sample: allRatings.length, source: "googleReview+feedback" }
      : null;

    // 5. Velocity plan — honest math per Feb 2026 policy + Localo (1-2/wk 594d, 100+/wk 6d)
    // Never recommend bulk: cap 2-5/week (8-20/mo safe ceiling). Honest timeline = ceil(deficit/perMonth).
    let velocity: any = null;
    if (gapDeficit != null && gapDeficit > 0) {
      const perMonth = 20; // safe ceiling (5/wk)
      const perWeek = 5;
      const honestMonths = Math.ceil(gapDeficit / perMonth);
      const sevenMonthProgress = Math.min(gapDeficit, perMonth * 7);
      velocity = {
        deficit: gapDeficit,
        monthsToClose: honestMonths,
        perMonth,
        perWeek,
        currentAvgPerWeek: avgPerWeek,
        sevenMonthProgress,
        message: `At your current customer volume, target ${perWeek} reviews/week (~${perMonth}/month) steadily — not ${gapDeficit} overnight. Full parity takes ~${honestMonths} months at safe pace; 7-month milestone closes ~${sevenMonthProgress}. Bulk spikes trigger Google's Feb 2026 unusual-volume filter and batch deletions.`,
      };
    } else if (gapDeficit === 0) {
      velocity = { deficit: 0, perWeek: 2, perMonth: 8, monthsToClose: 0, sevenMonthProgress: 0, currentAvgPerWeek: avgPerWeek, message: "You're at parity — hold 2 reviews/week to stay ahead. Recency (last 90 days) matters more than lifetime count." };
    }

    res.json({
      business: { id: business.id, name: business.name, industry: business.industry, location: business.location, placeId: business.googlePlaceId },
      you: { rating: yourRating, totalRatings: yourTotal, lastReviewAt, daysSinceLastReview: daysSinceLast, lastReviewSource, source: "google_places_details" },
      googleListing: { name: googleName, address: googleAddress, nameMismatch, note: nameMismatch ? `Your Google listing is "${googleName}" but your BeyondVyu business is "${business.name}" — update the name or re-select the correct listing.` : null },
      competitors,
      competitorAverages: { avgRating: compAvgRating != null ? Math.round(compAvgRating * 10) / 10 : null, avgTotal: compAvgTotal, maxTotal: compMaxTotal },
      gap,
      gapDeficit,
      // Six dimensions
      count: { googleTotal: yourTotal, syncedGoogle: googleTotal, feedback: feedbacks.length, combinedDb: dbTotal },
      rating: { google: yourRating, dbAvg: allRatings.length ? Math.round((allRatings.reduce((a, b) => a + b, 0) / allRatings.length) * 10) / 10 : null },
      recency: { lastReviewAt, daysSinceLastReview: daysSinceLast, last30: dbLast30, last90: dbLast90 },
      velocityHistory: { perWeekLast12: perWeekHistory, avgPerWeek },
      responseBehavior: { googleTotal, replied, needsReply, replyRate, source: "googleReview.replyStatus" },
      sentiment,
      velocity,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Review gap error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
