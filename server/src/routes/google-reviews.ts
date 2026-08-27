import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { authRequired, AuthRequest } from "../middleware/auth";
import { syncGoogleReviews, syncPlacesApiReviews, replyToGoogleReview } from "../services/google-business-api";
import { sendFeedbackNotification } from "../services/email";
import { encrypt, decrypt, type EncryptedData } from "../utils/encryption";

const router = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function getOAuthClient(): { clientId: string; clientSecret: string } | null {
  const clientId = getEnv().GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = getEnv().GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }
  return { clientId, clientSecret };
}

const SCOPES = ["https://www.googleapis.com/auth/business.manage"];

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
}

interface TokenEncryptedPayload {
  accessToken: EncryptedData;
  refreshToken?: EncryptedData;
}

async function refreshAccessToken(googleAccount: any): Promise<string> {
  const oauth = getOAuthClient();
  if (!oauth) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env");
  }
  const { clientId, clientSecret } = oauth;

  // Decrypt the refresh token
  const enc = googleAccount.tokenEncrypted as TokenEncryptedPayload | null;
  if (!enc?.refreshToken) {
    throw new Error("No refresh token available — business owner must re-authorize");
  }
  const refreshToken = decrypt(enc.refreshToken);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Token refresh failed: ${res.status} — ${errBody}`);
  }

  const data = await res.json() as TokenResponse;

  // Encrypt new access token and update expiry
  const encAccess = encrypt(data.access_token);
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  const updateEnc: TokenEncryptedPayload = {
    ...enc,
    accessToken: encAccess,
  };

  await prisma.googleAccount.update({
    where: { id: googleAccount.id },
    data: {
      tokenEncrypted: updateEnc as any,
      tokenExpiresAt: expiresAt,
    },
  });

  return data.access_token;
}

async function getValidAccessToken(googleAccount: any): Promise<string> {
  // Check if token is expired (refresh 5 min before expiry)
  if (
    googleAccount.tokenExpiresAt &&
    new Date(googleAccount.tokenExpiresAt).getTime() - 300000 < Date.now()
  ) {
    return refreshAccessToken(googleAccount);
  }

  const enc = googleAccount.tokenEncrypted as Record<string, EncryptedData> | null;
  if (!enc?.accessToken) {
    throw new Error("No access token stored");
  }
  return decrypt(enc.accessToken);
}

// ── GET /oauth/url — Returns the Google OAuth URL to redirect the business owner ──
router.get("/oauth/url", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.query.businessId as string;
    if (!businessId) {
      return res.status(400).json({ error: "businessId query param required" });
    }

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const oauth = getOAuthClient();
    if (!oauth) {
      return res.status(400).json({
        error: "Google OAuth is not configured — set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env",
      });
    }
    const redirectUri = getEnv().GOOGLE_OAUTH_REDIRECT_URI;

    const params = new URLSearchParams({
      client_id: oauth.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state: businessId, // pass businessId through OAuth flow
    });

    res.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  } catch (err: any) {
    console.error("OAuth URL error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ── GET /oauth/callback — Google redirects here after business owner authorizes ──
router.get("/oauth/callback", async (req, res: Response) => {
  try {
    const { code, state: businessId } = req.query as { code?: string; state?: string };

    if (!code || !businessId) {
      return res.status(400).json({ error: "Missing authorization code or business ID" });
    }

    const oauth = getOAuthClient();
    if (!oauth) {
      const frontendUrl = getEnv().FRONTEND_URL.split(",")[0];
      return res.redirect(`${frontendUrl}/dashboard/settings?google=error_missing_config`);
    }
    const { clientId, clientSecret } = oauth;
    const redirectUri = getEnv().GOOGLE_OAUTH_REDIRECT_URI;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Token exchange failed:", errBody);
      return res.redirect(`${getEnv().FRONTEND_URL.split(",")[0]}/dashboard/settings?google=error`);
    }

    const tokens = await tokenRes.json() as TokenResponse;

    // Get the business's Google Account info to find location IDs
    const acctRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );

    if (!acctRes.ok) {
      console.error("Failed to fetch Google accounts");
      return res.redirect(`${getEnv().FRONTEND_URL.split(",")[0]}/dashboard/settings?google=error`);
    }

    const accounts = await acctRes.json() as { accounts?: { name: string }[] };
    const accountList = accounts.accounts || [];
    if (accountList.length === 0) {
      console.error("No Google Business accounts found for this OAuth user");
      return res.redirect(`${getEnv().FRONTEND_URL.split(",")[0]}/dashboard/settings?google=error_no_accounts`);
    }

    // Fetch the target business to get its googlePlaceId for auto-matching
    const targetBusiness = await prisma.business.findUnique({
      where: { id: businessId },
      select: { googlePlaceId: true, name: true, location: true },
    });
    const targetPlaceId = targetBusiness?.googlePlaceId || null;

    // ── Auto-detect correct Location via PlaceID ────────────────────────
    // Google Business Profile API: Location.metadata.placeId contains the Place ID
    // We must iterate all accounts + locations and match by placeId, not just take first.
    // Docs: https://developers.google.com/my-business/content/location-data
    // Filter example: metadata.place_id="ChIJ..."
    // If no placeId on business, we collect all locations and use best match.

    let finalLocationId = "";
    let finalAccountName = "";
    let matchedByPlaceId = false;
    let allLocationsForDebug: any[] = [];

    // Helper to fetch locations for one account with proper readMask including metadata
    async function fetchLocationsForAccount(accountName: string): Promise<any[]> {
      // Try v1 Business Information API with full readMask
      try {
        const locRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata,labels`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        if (locRes.ok) {
          const locData = await locRes.json() as { locations?: any[] };
          return locData.locations || [];
        }
        // If v1 fails, try with placeId filter (if we have targetPlaceId)
        if (targetPlaceId) {
          const filterRes = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,metadata&filter=metadata.place_id="${targetPlaceId}"`,
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
          );
          if (filterRes.ok) {
            const filterData = await filterRes.json() as { locations?: any[] };
            if (filterData.locations && filterData.locations.length > 0) {
              return filterData.locations;
            }
          }
        }
      } catch (e) {
        console.error(`Failed to fetch v1 locations for ${accountName}:`, e);
      }

      // Fallback: legacy v4
      try {
        const locResV4 = await fetch(
          `https://mybusiness.googleapis.com/v4/${accountName}/locations`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        if (locResV4.ok) {
          const locDataV4 = await locResV4.json() as { locations?: any[] };
          return locDataV4.locations || [];
        }
      } catch (e) {
        console.error(`Failed to fetch v4 locations for ${accountName}:`, e);
      }
      return [];
    }

    // Iterate all accounts to find matching location by PlaceID
    for (const acct of accountList) {
      const accountName = acct.name; // "accounts/123456789"
      const locations = await fetchLocationsForAccount(accountName);
      allLocationsForDebug.push(...locations);

      if (targetPlaceId) {
        // Exact PlaceID match (priority 1)
        const matched = locations.find((loc: any) => {
          const locPlaceId = loc.metadata?.placeId || loc.placeId || loc.location?.placeId || "";
          return locPlaceId === targetPlaceId;
        });
        if (matched) {
          const locName = matched.name; // "locations/..." or "accounts/.../locations/..."
          finalLocationId = locName.split("/").pop() || "";
          finalAccountName = accountName;
          matchedByPlaceId = true;
          console.log(`[GBP auto-detect] Matched by PlaceID ${targetPlaceId} → location ${locName} in ${accountName}`);
          break;
        }
        // Also try title + address fuzzy if PlaceID not in metadata (some locations missing)
        const fuzzyMatch = locations.find((loc: any) => {
          const title = (loc.title || loc.locationName || "").toLowerCase();
          const targetName = (targetBusiness?.name || "").toLowerCase();
          return title && targetName && (title.includes(targetName) || targetName.includes(title));
        });
        if (fuzzyMatch && !finalLocationId) {
          const locName = fuzzyMatch.name;
          finalLocationId = locName.split("/").pop() || "";
          finalAccountName = accountName;
          console.log(`[GBP auto-detect] Fuzzy matched by title: "${fuzzyMatch.title}" for business "${targetBusiness?.name}"`);
        }
      } else {
        // No PlaceID on business: collect first location as fallback
        if (locations.length > 0 && !finalLocationId) {
          const locName = locations[0].name;
          finalLocationId = locName.split("/").pop() || "";
          finalAccountName = accountName;
        }
      }
    }

    // Fallback if no location matched at all — use first account's first location or accountId
    if (!finalLocationId) {
      const fallbackAccount = accountList[0].name;
      const fallbackLocations = await fetchLocationsForAccount(fallbackAccount);
      if (fallbackLocations.length > 0) {
        finalLocationId = fallbackLocations[0].name.split("/").pop() || "";
        finalAccountName = fallbackAccount;
      } else {
        finalLocationId = fallbackAccount.split("/").pop() || "";
        finalAccountName = fallbackAccount;
      }
      console.log(`[GBP auto-detect] No PlaceID match, fallback to ${finalLocationId} (matchedByPlaceId=${matchedByPlaceId})`);
    }

    const googleAccountId = finalAccountName.split("/").pop() || accountList[0].name.split("/").pop() || "";

    // Encrypt tokens at rest
    const encAccess = encrypt(tokens.access_token);
    const encRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    const tokenEncrypted: TokenEncryptedPayload = {
      accessToken: encAccess,
    };
    if (encRefresh) {
      tokenEncrypted.refreshToken = encRefresh;
    }

    // ── Duplicate PlaceID ownership check — justice for original owner ──
    // Google allows only ONE verified GBP per PlaceID. Reviews migrate to the
    // newly verified location; duplicates become unpublished.
    // Our SaaS must protect the original verified owner: second claimant must
    // go through Google's ownership-request flow, not silently sync same PlaceID.
    if (targetPlaceId && matchedByPlaceId) {
      const existingOwner = await prisma.business.findFirst({
        where: {
          googlePlaceId: targetPlaceId,
          id: { not: businessId },
        },
        select: { id: true, userId: true, name: true },
      });
      if (existingOwner) {
        const existingVerified = await prisma.googleAccount.findUnique({
          where: { businessId: existingOwner.id },
          select: { tokenEncrypted: true },
        });
        const isVerified = !!(existingVerified?.tokenEncrypted);
        // Log conflict for audit & notify (original owner justice)
        console.warn(`[GBP justice] PlaceID ${targetPlaceId} already ${isVerified ? "VERIFIED" : "claimed"} by business ${existingOwner.id} (user ${existingOwner.userId}). New claimant business ${businessId} attempted OAuth.`);
        await prisma.activityLog.create({
          data: {
            userId: existingOwner.userId,
            businessId: existingOwner.id,
            action: "google_place_conflict_attempt",
            details: {
              placeId: targetPlaceId,
              claimantBusinessId: businessId,
              claimMatchedByPlaceId: matchedByPlaceId,
              existingVerified: isVerified,
            },
          },
        }).catch(() => {});
        await prisma.activityLog.create({
          data: {
            userId: (await prisma.business.findUnique({ where: { id: businessId }, select: { userId: true } }))?.userId || "unknown",
            businessId,
            action: "google_place_conflict_blocked",
            details: {
              placeId: targetPlaceId,
              ownerBusinessId: existingOwner.id,
              ownerBusinessName: existingOwner.name,
              isVerified,
              reason: isVerified ? "Original owner already verified — claimant must use Google ownership request (7-day approval) / contact support" : "Place already claimed — first-come justice, claimant should request ownership via Google Business Profile",
            },
          },
        }).catch(() => {});

        // If original is verified, block new claimant's Google connect and instruct to use ownership request
        if (isVerified) {
          const frontendUrl = getEnv().FRONTEND_URL.split(",")[0];
          return res.redirect(`${frontendUrl}/dashboard/settings?google=place_conflict&placeId=${encodeURIComponent(targetPlaceId)}&ownerBusiness=${encodeURIComponent(existingOwner.name)}`);
        }
        // If not verified, allow but flag — first-come still wins until verification
      }
    }

    // Upsert the Google account with the final Location ID + Account ID stored separately
    await prisma.googleAccount.upsert({
      where: { businessId },
      create: {
        businessId,
        googleAccountId: finalLocationId,
        googleLocationId: finalAccountName ? `${finalAccountName}/locations/${finalLocationId}` : null,
        accessToken: "",
        refreshToken: "",
        tokenEncrypted: tokenEncrypted as any,
        tokenExpiresAt: expiresAt,
      },
      update: {
        googleAccountId: finalLocationId,
        googleLocationId: finalAccountName ? `${finalAccountName}/locations/${finalLocationId}` : null,
        accessToken: "",
        refreshToken: "",
        tokenEncrypted: tokenEncrypted as any,
        tokenExpiresAt: expiresAt,
      },
    });

    // If we matched via PlaceID, ensure business googlePlaceId is set (covers case where it was null)
    if (matchedByPlaceId && targetPlaceId) {
      await prisma.business.update({
        where: { id: businessId },
        data: { googlePlaceId: targetPlaceId },
      }).catch(() => {});
    }

    // Look up the business to get userId for activity log
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { userId: true },
    });

    if (business) {
      await prisma.activityLog.create({
        data: {
          userId: business.userId,
          businessId,
          action: "google_connected",
          details: { googleAccountId },
        },
      });
    }

    // Redirect business owner back to dashboard
    const frontendUrl = getEnv().FRONTEND_URL.split(",")[0];
    res.redirect(`${frontendUrl}/dashboard/settings?google=connected`);
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    const frontendUrl = getEnv().FRONTEND_URL.split(",")[0];
    res.redirect(`${frontendUrl}/dashboard/settings?google=error`);
  }
});

// ── POST /connect — Store Google account (legacy/direct, also encrypts) ───────
const connectSchema = z.object({
  businessId: z.string(),
  googleAccountId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
});

router.post("/connect", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = connectSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Encrypt tokens
    const encAccess = encrypt(data.accessToken);
    const encRefresh = data.refreshToken ? encrypt(data.refreshToken) : null;
    const tokenEncrypted: TokenEncryptedPayload = { accessToken: encAccess };
    if (encRefresh) tokenEncrypted.refreshToken = encRefresh;

    const googleAccount = await prisma.googleAccount.upsert({
      where: { businessId: data.businessId },
      create: {
        businessId: data.businessId,
        googleAccountId: data.googleAccountId,
        accessToken: "",
        refreshToken: "",
        tokenEncrypted: tokenEncrypted as any,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null,
      },
      update: {
        googleAccountId: data.googleAccountId,
        accessToken: "",
        refreshToken: "",
        tokenEncrypted: tokenEncrypted as any,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: data.businessId,
        action: "google_connected",
        details: { googleAccountId: data.googleAccountId },
      },
    });

    res.json({ googleAccount });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Google connect error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /disconnect — Remove Google account access ─────────────────────────
router.post("/disconnect/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Delete the Google account and all associated reviews
    await prisma.googleReview.deleteMany({ where: { businessId } });
    await prisma.googleAccount.delete({ where: { businessId } });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: "google_disconnected",
        details: {},
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Google disconnect error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /sync/:businessId — Sync Google Reviews ────────────────────────────
router.post("/sync/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const result = await syncGoogleReviews(businessId);

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: "google_reviews_synced",
        details: { synced: result.synced, total: result.total },
      },
    });

    res.json(result);
  } catch (err) {
    console.error("Google sync error:", err);
    const isValidationError = err instanceof Error && (
      err.message.includes("No Google account connected") ||
      err.message.includes("Google Account ID not set")
    );
    res.status(isValidationError ? 400 : 500).json({
      error: err instanceof Error ? err.message : "Sync failed",
    });
  }
});

// ── POST /sync-places/:businessId — Sync via Google Places API (no GBP approval needed) ──
router.post("/sync-places/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const result = await syncPlacesApiReviews(businessId);

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId,
        action: "google_places_reviews_synced",
        details: { synced: result.synced, total: result.total },
      },
    });

    res.json(result);
  } catch (err) {
    console.error("Places API sync error:", err);
    const isValidationError = err instanceof Error && (
      err.message.includes("No Google Place ID") ||
      err.message.includes("GOOGLE_PLACES_API_KEY not set")
    );
    res.status(isValidationError ? 400 : 500).json({
      error: err instanceof Error ? err.message : "Places API sync failed",
    });
  }
});

// ── GET /reviews/:businessId — List Synced Google Reviews ────────────────────
router.get("/reviews/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const reviews = await prisma.googleReview.findMany({
      where: { businessId },
      orderBy: { createTime: "desc" },
      take: 50,
    });

    res.json({ reviews });
  } catch (err) {
    console.error("List Google reviews error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /reviews/:reviewId/reply — Reply to a Google Review ────────────────
const replySchema = z.object({
  replyText: z.string().min(1).max(5000),
});

router.post("/reviews/:reviewId/reply", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = req.params.reviewId as string;
    const { replyText } = replySchema.parse(req.body);

    const review = await prisma.googleReview.findUnique({
      where: { id: reviewId },
      include: { googleAccount: true, business: true },
    });
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }
    if (review.business.userId !== req.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Get a valid (possibly refreshed) access token
    const accessToken = await getValidAccessToken(review.googleAccount);

    // Post reply to Google
    await replyToGoogleReview(
      "me",
      review.googleAccount.googleAccountId,
      review.googleReviewId,
      replyText,
      accessToken,
    );

    // Save locally
    const updated = await prisma.googleReview.update({
      where: { id: reviewId },
      data: {
        reviewReply: replyText,
        replyStatus: "REPLIED",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: review.businessId,
        action: "google_review_replied",
        details: { reviewId, replyLength: replyText.length },
      },
    });

    res.json({ review: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Google review reply error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to reply" });
  }
});

// ── POST /webhook/pubsub — Receive Pub/Sub notification for new Google reviews ──
router.post("/webhook/pubsub", async (req: any, res: Response) => {
  try {
    const message = req.body?.message;
    if (!message?.data) {
      return res.status(400).json({ error: "Invalid Pub/Sub message" });
    }

    const decoded = Buffer.from(message.data, "base64").toString("utf-8");
    const notification = JSON.parse(decoded);

    const { locationName } = notification;

    if (!locationName) {
      return res.status(400).json({ error: "Missing locationName" });
    }

    const locationId = (locationName.split("/").pop() || "") as string;

    const googleAccounts = await prisma.googleAccount.findMany({
      where: { googleAccountId: locationId },
      include: { business: { select: { id: true, name: true, userId: true } } },
    });

    for (const ga of googleAccounts) {
      try {
        const result = await syncGoogleReviews(ga.businessId);
        if (result.synced > 0) {
          await sendFeedbackNotification(
            ga.business.userId,
            ga.business.name,
            0,
          );
        }
      } catch (err) {
        console.error(`Failed to sync reviews for business ${ga.businessId}:`, err);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("PubSub webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ── GET /status/:businessId — Get Google Connection Status ──────────────────
router.get("/status/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const googleAccount = await prisma.googleAccount.findUnique({
      where: { businessId },
    });

    res.json({
      connected: !!googleAccount,
      googleAccountId: googleAccount?.googleAccountId || null,
      reviewCount: googleAccount
        ? await prisma.googleReview.count({ where: { businessId } })
        : 0,
    });
  } catch (err) {
    console.error("Google status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
