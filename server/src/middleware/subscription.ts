import { Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AuthRequest } from "./auth";
import { getEnv } from "../config/env";
import { priceForCredits } from "../utils/billing";
import { ensureFreeSubscription, loadEntitledSubscription, resetMonthlyCreditsIfDue } from "../services/subscriptions";
import { sendTopUpLinkEmail } from "../services/email";

export interface SubscriptionInfo {
  id: string;
  planId: string;
  userId: string;
  status: string;
  creditsUsed: number;
  creditsLimit: number;
  creditsTopUpBalance: number;
  businessLimit: number;
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number;
  autoRechargeAmount: number;
  autoRechargeLastAttemptAt: Date | null;
}

declare module "express" {
  interface Request {
    subscription?: SubscriptionInfo;
  }
}

/**
 * Load the subscription that currently grants entitlements. Only statuses in
 * ENTITLED_STATUSES count — a `created` row (checkout started, not paid) must
 * NEVER grant access, otherwise any user can mint a Pro plan for free.
 */
export async function requireSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    let sub = await loadEntitledSubscription(userId);

    if (!sub) {
      // Idempotent Free fallback (never duplicates rows).
      sub = await ensureFreeSubscription(userId);
      if (!sub) {
        return res.status(403).json({ error: "No active subscription. Please subscribe to continue.", code: "NO_SUBSCRIPTION" });
      }
    }

    sub = await resetMonthlyCreditsIfDue(sub);

    req.subscription = sub;
    next();
  } catch (err) {
    console.error("Subscription check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Atomically consume `cost` credits from a subscription: monthly credits first,
 * then the prepaid top-up balance, both clamped inside Postgres.
 *
 * Two concurrent requests can therefore never drive the paid balance negative
 * or push `creditsUsed` past `creditsLimit` (a Prisma `decrement` could).
 * Returns the new counters, or null when the row no longer exists.
 */
export async function consumeSubscriptionCredits(subscriptionId: string, cost: number) {
  if (cost <= 0) return null;
  const rows = await prisma.$queryRaw<
    Array<{ creditsUsed: number; creditsLimit: number; creditsTopUpBalance: number }>
  >`
    UPDATE "Subscription"
    SET "creditsUsed" = LEAST("creditsLimit", "creditsUsed" + ${cost}),
        "creditsTopUpBalance" = GREATEST(0, "creditsTopUpBalance" - GREATEST(0, ${cost} - GREATEST(0, "creditsLimit" - "creditsUsed"))),
        "updatedAt" = NOW()
    WHERE "id" = ${subscriptionId}
    RETURNING "creditsUsed", "creditsLimit", "creditsTopUpBalance"
  `;
  return rows[0] ?? null;
}

export async function consumeCredits(req: AuthRequest, cost: number = 1) {
  try {
    const sub = req.subscription;
    if (!sub || cost <= 0) return;

    const updated = await consumeSubscriptionCredits(sub.id, cost);
    if (!updated) return;

    req.subscription = {
      ...sub,
      creditsUsed: updated.creditsUsed,
      creditsLimit: updated.creditsLimit,
      creditsTopUpBalance: updated.creditsTopUpBalance,
    };

    // Auto-recharge: fire at most once per cooldown window, and only when no
    // recent auto-recharge top-up is already pending. Previously this fired a
    // fresh payment link on *every* request below threshold.
    const remaining = updated.creditsLimit - updated.creditsUsed + updated.creditsTopUpBalance;
    if (sub.autoRechargeEnabled && remaining <= sub.autoRechargeThreshold && sub.autoRechargeAmount > 0) {
      // Fire and forget: creating a Razorpay payment link (and sending mail)
      // must never sit in the latency path of the customer's AI request.
      void maybeTriggerAutoRecharge(sub).catch((e) =>
        console.warn("Auto-recharge trigger failed:", e instanceof Error ? e.message : String(e)),
      );
    }
  } catch (err) {
    console.error("Consume credits error:", err);
  }
}

const AUTO_RECHARGE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour between attempts

async function maybeTriggerAutoRecharge(sub: {
  id: string;
  userId: string;
  autoRechargeAmount: number;
  autoRechargeLastAttemptAt: Date | null;
}) {
  try {
    if (sub.autoRechargeLastAttemptAt && Date.now() - new Date(sub.autoRechargeLastAttemptAt).getTime() < AUTO_RECHARGE_COOLDOWN_MS) {
      return;
    }
    // Don't stack links: skip if an auto-recharge top-up is still pending and
    // recent. After 24h the old link is treated as stale (it may still be
    // payable, but a fresh reminder is more useful than silence forever).
    const pending = await prisma.creditTopUp.findFirst({
      where: {
        subscriptionId: sub.id,
        type: "auto_recharge",
        status: "pending",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (pending) return;

    const env = getEnv();
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return;

    const amount = priceForCredits(sub.autoRechargeAmount);
    const Razorpay = require("razorpay");
    const razorpay = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
    const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";

    const referenceId = `auto_${sub.id}_${Date.now()}`;
    const link = await razorpay.paymentLink.create({
      amount,
      currency: "INR",
      description: `${sub.autoRechargeAmount} Credits Auto-Recharge`,
      reference_id: referenceId,
      notes: { subscriptionId: sub.id, type: "auto_recharge", credits: String(sub.autoRechargeAmount) },
      callback_url: `${frontendUrl}/api/payments/top-up-callback`,
      callback_method: "get",
    } as any);

    await prisma.$transaction([
      prisma.creditTopUp.create({
        data: {
          subscriptionId: sub.id,
          credits: sub.autoRechargeAmount,
          amount,
          status: "pending",
          type: "auto_recharge",
          razorpayPaymentLinkId: link?.id || null,
          referenceId: link?.reference_id || referenceId,
        },
      }),
      prisma.subscription.update({
        where: { id: sub.id },
        data: { autoRechargeLastAttemptAt: new Date() },
      }),
    ]);

    // The link is only useful if the owner actually receives it.
    if (link?.short_url) {
      await sendTopUpLinkEmail(sub.userId, sub.autoRechargeAmount, amount, link.short_url).catch((e) =>
        console.warn("Auto-recharge email failed:", e instanceof Error ? e.message : String(e)),
      );
    }
  } catch (err) {
    console.warn("Auto-recharge trigger failed:", err instanceof Error ? err.message : String(err));
  }
}

export function checkCreditLimit(sub: { creditsUsed: number; creditsLimit: number; creditsTopUpBalance: number }, cost: number = 1): { allowed: boolean; remaining: number } {
  const monthlyRemaining = Math.max(0, sub.creditsLimit - sub.creditsUsed);
  const totalRemaining = monthlyRemaining + sub.creditsTopUpBalance;
  return { allowed: totalRemaining >= cost, remaining: totalRemaining };
}
