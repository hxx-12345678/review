import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";

// ── General API limiter (catch-all for non-AI routes) ──
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Auth limiter (strict — prevent brute force) ──
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many auth attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── AI endpoint rate limiters ──
// Each endpoint gets its OWN instance so limits are independent.
// An attacker flooding generate-review can't block talking-points.

// Burst protection: max 3 AI requests per 10 seconds per IP
// Prevents rapid-fire clicking from a single client
export const aiBurstLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 3,
  message: { error: "Too many AI requests in quick succession. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Talking points: 10 requests per minute per IP
// Cheaper endpoint, so slightly more generous
export const talkingPointsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Talking points request limit reached. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate review: 5 requests per minute per IP
// Most expensive AI endpoint — strictest limit
export const generateReviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Review generation limit reached. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate reply: 10 requests per minute per IP (business owner replying)
// Authenticated + subscription-gated, so moderate limit
export const generateReplyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "Reply generation limit reached. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Insights: 5 requests per minute per IP (expensive — aggregates many reviews)
export const insightsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Insights request limit reached. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Hard daily ceiling per IP for all AI endpoints combined ──
// Safety net: no single IP can exceed 200 AI calls per day
export const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 200,
  message: { error: "Daily AI request limit reached. Please try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Per-(IP + Business) Cooldown ──
// Prevents the same IP from repeatedly hitting an expensive endpoint for the same
// business within a short time window. Uses the database for persistence so it
// survives server restarts and works across multiple server instances.
// Particularly useful for public endpoints (generate-review) where auth is not
// required and the in-memory burst limiter alone is insufficient.
//
// Usage: router.post("/generate-review", checkBusinessCooldown("generate-review", 60_000), handler)
export function checkBusinessCooldown(endpoint: string, cooldownMs = 60_000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const businessSlug = req.body?.businessSlug as string | undefined;

      // Without a business slug we can't do per-business tracking — skip
      if (!businessSlug) {
        return next();
      }

      const business = await prisma.business.findUnique({ where: { slug: businessSlug } });
      if (!business) {
        return next();
      }

      const recent = await prisma.aiRequestLog.findFirst({
        where: {
          ip,
          businessId: business.id,
          endpoint,
          createdAt: { gte: new Date(Date.now() - cooldownMs) },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recent) {
        const elapsed = Date.now() - recent.createdAt.getTime();
        const retryAfter = Math.ceil((cooldownMs - elapsed) / 1000);
        return res.status(429).json({
          error: `Please wait ${retryAfter} second(s) before generating again for this business.`,
          retryAfter,
        });
      }

      await prisma.aiRequestLog.create({
        data: { ip, businessId: business.id, endpoint },
      });

      next();
    } catch (err) {
      // If DB is unreachable, degrade gracefully — allow the request through
      console.error("Business cooldown check error:", err);
      next();
    }
  };
}

// ── Periodic cleanup of old AiRequestLog entries ──
// Every 10 minutes, delete rows older than 24 hours to prevent unbounded growth.
// This is safe because cooldown windows are at most a few minutes.
let cleanupInitialized = false;
if (!cleanupInitialized) {
  cleanupInitialized = true;
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const { count } = await prisma.aiRequestLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        console.log(`Cleaned up ${count} old AiRequestLog entries`);
      }
    } catch (err) {
      console.error("AiRequestLog cleanup error:", err);
    }
  }, 10 * 60 * 1000);
}
