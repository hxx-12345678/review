import { Router, Request, Response } from "express";
import { getEnv } from "../config/env";
import { authRequired } from "../middleware/auth";

const router = Router();

const PLACES_BASE = "https://places.googleapis.com/v1";

interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  totalRatings: number | null;
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

    const apiKey = getEnv().GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Google Places API key not configured" });
    }

    const url = `${PLACES_BASE}/places:searchText`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "en",
        maxResultCount: 6,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Places API search error:", response.status, errorBody);
      return res.status(502).json({ error: "Places API search failed", details: errorBody });
    }

    const data: any = await response.json();
    const places: any[] = data.places || [];

    const results: PlaceResult[] = places
      .filter((p: any) => p.businessStatus === "OPERATIONAL")
      .map((p: any) => ({
        placeId: p.id || "",
        name: p.displayName?.text || p.displayName || "",
        address: p.formattedAddress || "",
        rating: p.rating ?? null,
        totalRatings: p.userRatingCount ?? null,
      }));

    res.json({ results });
  } catch (err: any) {
    console.error("Google Places search error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
