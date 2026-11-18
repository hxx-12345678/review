import crypto from "crypto";
import { Request, Response, Router } from "express";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";

/**
 * Meta Platform Terms callbacks.
 *
 * Meta posts `signed_request` as application/x-www-form-urlencoded to both the
 * Deauthorize Callback URL and the Data Deletion Request URL. The payload is
 * signed with the Meta app secret and must be verified before we act on it.
 *
 * These routes are intentionally public: Meta cannot send our bearer token.
 * They are protected by the signed_request HMAC instead.
 */

export interface MetaSignedRequestPayload {
  algorithm?: string;
  expires?: number;
  issued_at?: number;
  user_id?: string;
  [key: string]: unknown;
}

/** Decode a base64url string without Node's legacy base64 quirks. */
function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

/**
 * Verify and decode Meta's `signed_request`.
 *
 * Returns null for a missing/malformed signature, a wrong app secret, or a
 * payload that is not JSON. Never throws on untrusted input.
 */
export function parseSignedRequest(
  signedRequest: unknown,
  appSecret: string | undefined,
): MetaSignedRequestPayload | null {
  if (typeof signedRequest !== "string" || !signedRequest.includes(".") || !appSecret) {
    return null;
  }

  const separator = signedRequest.indexOf(".");
  const encodedSignature = signedRequest.slice(0, separator);
  const encodedPayload = signedRequest.slice(separator + 1);
  if (!encodedSignature || !encodedPayload) return null;

  try {
    const provided = base64UrlDecode(encodedSignature);
    const expected = crypto
      .createHmac("sha256", appSecret)
      .update(encodedPayload)
      .digest();

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return null;
    }

    const parsed = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as MetaSignedRequestPayload;
  } catch {
    return null;
  }
}

function firstFrontendOrigin(): string {
  const raw = getEnv().FRONTEND_URL || "https://beyondvyu.com";
  const first = raw.split(",")[0].trim();
  return (first || "https://beyondvyu.com").replace(/\/$/, "");
}

function readSignedRequest(req: Request): unknown {
  const body = req.body as Record<string, unknown> | undefined;
  return body?.signed_request ?? req.query.signed_request;
}

const router = Router();

/**
 * Data Deletion Request URL.
 *
 * Meta requires a JSON response of exactly:
 *   { "url": "<status page>", "confirmation_code": "<code>" }
 */
router.post("/data-deletion", async (req: Request, res: Response) => {
  const env = getEnv();
  if (!env.WHATSAPP_APP_SECRET) {
    return res.status(503).json({ error: "Meta app secret is not configured" });
  }

  const payload = parseSignedRequest(readSignedRequest(req), env.WHATSAPP_APP_SECRET);
  if (!payload) {
    return res.status(400).json({ error: "Invalid signed_request" });
  }

  const confirmationCode = crypto.randomBytes(12).toString("hex");
  const facebookUserId =
    typeof payload.user_id === "string" && payload.user_id.trim()
      ? payload.user_id.trim().slice(0, 128)
      : null;

  // This product uses Facebook Login only for WhatsApp Embedded Signup. The
  // signed_request identifies a Facebook user, not a BEYONDVYU account, and we
  // do not persist a Facebook profile for that user. Record the request so the
  // status page can prove it was handled; do not claim a deletion that has no
  // matching row.
  try {
    await prisma.metaDataDeletionRequest.create({
      data: {
        confirmationCode,
        facebookUserId,
        status: "no_data",
        note: "No Facebook-derived user profile is stored for this app-scoped ID. WhatsApp onboarding stores business assets and consent, not the deauthorizing user's Facebook profile.",
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to record Meta data deletion request:", error);
    return res.status(500).json({ error: "Could not record deletion request" });
  }

  const statusUrl = `${firstFrontendOrigin()}/data-deletion/${confirmationCode}`;
  return res.status(200).json({ url: statusUrl, confirmation_code: confirmationCode });
});

/** Human-readable status lookup used by the public /data-deletion page. */
router.get("/data-deletion/:code", async (req: Request, res: Response) => {
  const code = String(req.params.code || "").trim();
  if (!/^[a-f0-9]{16,64}$/i.test(code)) {
    return res.status(400).json({ error: "Invalid confirmation code" });
  }

  const record = await prisma.metaDataDeletionRequest.findUnique({
    where: { confirmationCode: code },
    select: {
      confirmationCode: true,
      status: true,
      note: true,
      requestedAt: true,
      completedAt: true,
    },
  });
  if (!record) return res.status(404).json({ error: "Request not found" });

  return res.json({
    confirmation_code: record.confirmationCode,
    status: record.status,
    note: record.note,
    requested_at: record.requestedAt,
    completed_at: record.completedAt,
  });
});

/** Plain instructions for a browser visiting the callback URL directly. */
router.get("/data-deletion", (_req: Request, res: Response) => {
  res.json({
    service: "BEYONDVYU",
    message:
      "To request deletion of data associated with your Facebook or Meta account, remove BEYONDVYU in Facebook Settings > Apps and Websites and choose Send Request. Meta will call this endpoint and return a confirmation code and status URL.",
    contact: "support@beyondvyu.com",
  });
});

/**
 * Deauthorize Callback URL.
 *
 * Meta pings this when someone removes the app. It is separate from the data
 * deletion request. We acknowledge it; there is no Facebook profile row to
 * revoke because the app does not use Facebook Login for end users.
 */
router.post("/deauthorize", (req: Request, res: Response) => {
  const env = getEnv();
  if (!env.WHATSAPP_APP_SECRET) {
    return res.status(503).json({ error: "Meta app secret is not configured" });
  }

  const payload = parseSignedRequest(readSignedRequest(req), env.WHATSAPP_APP_SECRET);
  if (!payload) {
    return res.status(400).json({ error: "Invalid signed_request" });
  }

  // Do not log the app-scoped user ID. Acknowledging is sufficient.
  console.log("Meta deauthorize callback received and verified");
  return res.status(200).json({ status: "ok" });
});

router.get("/deauthorize", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "Meta deauthorize callback endpoint" });
});

export default router;
