import { Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AuthRequest } from "./auth";

export interface SubscriptionInfo {
  id: string;
  planId: string;
  status: string;
  aiCallsUsed: number;
  aiCallsLimit: number;
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
      where: { userId, status: { in: ["active", "created"] } },
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
            aiCallsLimit: freePlan.aiCallsLimit,
            businessLimit: freePlan.businessLimit,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
          },
        });
      } else {
        return res.status(403).json({ error: "No active subscription. Please subscribe to continue.", code: "NO_SUBSCRIPTION" });
      }
    }

    if (sub.aiCallsUsed >= sub.aiCallsLimit) {
      return res.status(403).json({ error: "AI call limit reached. Please upgrade your plan.", code: "LIMIT_REACHED" });
    }

    req.subscription = sub;
    next();
  } catch (err) {
    console.error("Subscription check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function incrementAiCalls(req: AuthRequest) {
  try {
    const sub = req.subscription;
    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { aiCallsUsed: { increment: 1 } },
      });
    }
  } catch (err) {
    console.error("Increment AI calls error:", err);
  }
}
