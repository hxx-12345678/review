import { Router, Response } from "express";
import { z } from "zod";
import Razorpay from "razorpay";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

function getRazorpay(): Razorpay | null {
  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

async function getOrCreateRazorpayPlan(razorpay: Razorpay, plan: { id: string; name: string; price: number; interval: string }): Promise<string> {
  if (plan.price === 0) return plan.id;
  const periodMap: Record<string, string> = { month: "monthly", year: "yearly", day: "daily", week: "weekly", quarter: "quarterly" };
  const period = periodMap[plan.interval] || plan.interval;
  try {
    const rp = await razorpay.plans.create({
      period: period as any,
      interval: 1,
      item: { name: plan.name, amount: plan.price, currency: "INR" },
      notes: { internalPlanId: plan.id },
    });
    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: { razorpayPlanId: rp.id },
    });
    return rp.id;
  } catch (err: any) {
    console.warn("Failed to create Razorpay plan:", err.error?.description || err.message || err);
    throw err;
  }
}

router.get("/plans", async (_req, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ plans });
  } catch (err) {
    console.error("Get plans error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscription", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["created", "active", "paused"] } },
      include: {
        plan: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ subscription: sub || null });
  } catch (err) {
    console.error("Get subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/create-subscription", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = z.object({ planId: z.string() }).parse(req.body);
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({ error: "Payment gateway not configured" });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const existing = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["created", "active", "paused"] } },
    });
    if (existing) {
      if (existing.razorpaySubscriptionId) {
        try { await razorpay.subscriptions.cancel(existing.razorpaySubscriptionId); } catch { }
      }
      await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
    }

    if (plan.price === 0) {
      const sub = await prisma.subscription.create({
        data: {
          userId: req.userId!,
          planId: plan.id,
          status: "active",
          aiCallsLimit: plan.aiCallsLimit,
          businessLimit: plan.businessLimit,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        },
      });
      return res.json({ subscription: sub, shortUrl: null });
    }

    const razorpayPlanId = plan.razorpayPlanId || await getOrCreateRazorpayPlan(razorpay, plan);

    const razorpaySub = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 999,
      customer_notify: true,
      notes: { userId: req.userId!, planId: plan.id },
    } as any);

    const rpSub = razorpaySub as any;

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.userId!,
        planId: plan.id,
        status: "created",
        razorpaySubscriptionId: rpSub.id,
        razorpayCustomerId: rpSub.customer_id || null,
        aiCallsLimit: plan.aiCallsLimit,
        businessLimit: plan.businessLimit,
        currentPeriodStart: rpSub.current_start ? new Date(rpSub.current_start * 1000) : null,
        currentPeriodEnd: rpSub.current_end ? new Date(rpSub.current_end * 1000) : null,
      },
    });

    res.json({ subscription, shortUrl: rpSub.short_url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Create subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cancel", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["active", "paused", "created"] } },
    });
    if (!sub) return res.status(404).json({ error: "No active subscription" });

    const razorpay = getRazorpay();
    if (razorpay && sub.razorpaySubscriptionId) {
      try { await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId); } catch { }
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
    if (freePlan) {
      await prisma.subscription.create({
        data: {
          userId: req.userId!,
          planId: freePlan.id,
          status: "active",
          aiCallsLimit: freePlan.aiCallsLimit,
          businessLimit: freePlan.businessLimit,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
