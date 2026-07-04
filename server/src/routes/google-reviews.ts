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

function getOAuthClient() {
  const clientId = getEnv().GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = getEnv().GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set in .env");
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
  const { clientId, clientSecret } = getOAuthClient();

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

    const { clientId } = getOAuthClient();
    const redirectUri = getEnv().GOOGLE_OAUTH_REDIRECT_URI;

    const params = new URLSearchParams({
      client_id: clientId,
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

    const { clientId, clientSecret } = getOAuthClient();
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
    const googleAccountName = accounts.accounts?.[0]?.name || ""; // "accounts/123456789"
    const googleAccountId = googleAccountName.split("/").pop() || "";

    // Fetch the locations for this account to get the actual locationId
    let finalLocationId = googleAccountId;
    try {
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${googleAccountName}/locations?readMask=name,title`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (locRes.ok) {
        const locData = await locRes.json() as { locations?: { name: string }[] };
        if (locData.locations && locData.locations.length > 0) {
          const locationName = locData.locations[0].name; // "locations/987654321"
          finalLocationId = locationName.split("/").pop() || googleAccountId;
        }
      } else {
        // Try legacy v4 locations list if v1 fails
        const locResV4 = await fetch(
          `https://mybusiness.googleapis.com/v4/${googleAccountName}/locations`,
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        if (locResV4.ok) {
          const locDataV4 = await locResV4.json() as { locations?: { name: string }[] };
          if (locDataV4.locations && locDataV4.locations.length > 0) {
            const locationName = locDataV4.locations[0].name; // "accounts/123/locations/456"
            finalLocationId = locationName.split("/").pop() || googleAccountId;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch location ID, using account ID fallback:", e);
    }

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

    // Upsert the Google account with the final Location ID
    await prisma.googleAccount.upsert({
      where: { businessId },
      create: {
        businessId,
        googleAccountId: finalLocationId,
        accessToken: "",
        refreshToken: "",
        tokenEncrypted: tokenEncrypted as any,
        tokenExpiresAt: expiresAt,
      },
      update: {
        googleAccountId: finalLocationId,
        accessToken: "",
        refreshToken: "",
        tokenEncrypted: tokenEncrypted as any,
        tokenExpiresAt: expiresAt,
      },
    });

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
    res.status(500).json({ error: err instanceof Error ? err.message : "Sync failed" });
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
    res.status(500).json({ error: err instanceof Error ? err.message : "Places API sync failed" });
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
