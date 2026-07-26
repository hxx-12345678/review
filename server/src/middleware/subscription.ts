import { Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AuthRequest } from "./auth";

export interface SubscriptionInfo {
  id: string;
  planId: string;
  status: string;
  creditsUsed: number;
  creditsLimit: number;
  creditsTopUpBalance: number;
  businessLimit: number;
}

declare module "express" {
  interface Request {
    subscription?: SubscriptionInfo;
  }
}

export async function requireSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    let sub = await prisma.subscription.findFirst({
      where: { userId, status: { in: ["authenticated", "active", "created"] } },
      orderBy: { createdAt: "desc" },
    });

    if (!sub) {
      const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
      if (freePlan) {
        sub = await prisma.subscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: "active",
            creditsLimit: freePlan.creditsLimit,
            businessLimit: freePlan.businessLimit,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
          },
        });
      } else {
        return res.status(403).json({ error: "No active subscription. Please subscribe to continue.", code: "NO_SUBSCRIPTION" });
      }
    }

    // Monthly credits reset: if more than ~30 days since last reset, reset counter
    const daysSinceReset = sub.creditsLastResetAt
      ? (Date.now() - new Date(sub.creditsLastResetAt).getTime()) / 86400000
      : 31;
    if (daysSinceReset >= 30) {
      sub = await prisma.subscription.update({
        where: { id: sub.id },
        data: { creditsUsed: 0, creditsLastResetAt: new Date() },
      });
    }

    req.subscription = sub;
    next();
  } catch (err) {
    console.error("Subscription check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function consumeCredits(req: AuthRequest, cost: number = 1) {
  try {
    const sub = req.subscription;
    if (!sub) return;

    // FEFO: use monthly credits first (they expire), then top-up balance
    const monthlyRemaining = sub.creditsLimit - sub.creditsUsed;
    let monthly = Math.min(cost, monthlyRemaining);
    let topUp = cost - monthly;

    const updateData: any = {};
    if (monthly > 0) {
      updateData.creditsUsed = { increment: monthly };
    }
    if (topUp > 0) {
      updateData.creditsTopUpBalance = { decrement: topUp };
    }

    if (Object.keys(updateData).length > 0) {
      const updated = await prisma.subscription.update({
        where: { id: sub.id },
        data: updateData,
      });
      // Update req.subscription with latest values
      req.subscription = {
        ...sub,
        creditsUsed: updated.creditsUsed,
        creditsTopUpBalance: updated.creditsTopUpBalance,
      };

      // Auto-recharge check: if remaining credits (monthly + top-up) <= threshold, trigger top-up
      const remaining = (updated.creditsLimit - updated.creditsUsed) + updated.creditsTopUpBalance;
      if (updated.autoRechargeEnabled && remaining <= updated.autoRechargeThreshold && updated.autoRechargeAmount > 0) {
        // Fire-and-forget auto-recharge via Razorpay Payment Link
        try {
          const { getEnv } = require("../config/env");
          const Razorpay = require("razorpay");
          const env = getEnv();
          if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
            const razorpay = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
            const amount = updated.autoRechargeAmount * 99; // ₹99 per 100 credits
            const link = await razorpay.paymentLink.create({
              amount,
              currency: "INR",
              description: `${updated.autoRechargeAmount} Credits Auto-Recharge`,
              notes: { subscriptionId: updated.id, type: "auto_recharge", credits: updated.autoRechargeAmount },
              callback_url: `${env.FRONTEND_URL.split(",")[0].trim()}/dashboard/billing?auto_recharge=true`,
              callback_method: "get",
            } as any);
            if (link?.short_url) {
              console.log(`Auto-recharge link created for sub ${updated.id}: ${link.short_url}`);
            }
          }
        } catch (arErr) {
          console.warn("Auto-recharge trigger failed:", arErr);
        }
      }
    }
  } catch (err) {
    console.error("Consume credits error:", err);
  }
}

export function checkCreditLimit(sub: { creditsUsed: number; creditsLimit: number; creditsTopUpBalance: number }, cost: number = 1): { allowed: boolean; remaining: number } {
  const monthlyRemaining = Math.max(0, sub.creditsLimit - sub.creditsUsed);
  const totalRemaining = monthlyRemaining + sub.creditsTopUpBalance;
  return { allowed: totalRemaining >= cost, remaining: totalRemaining };
}
