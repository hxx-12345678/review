import { Router, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { adminAuthRequired, AdminRequest } from "../middleware/admin";
import { authLimiter } from "../middleware/rate-limit";
import { ENTITLED_STATUSES } from "../utils/billing";
import { ensureFreeSubscription } from "../services/subscriptions";
import {
  sanitizeCustomReviewTopics,
  sanitizeEnabledCategories,
} from "../utils/review-options";

function getRazorpay(): Razorpay | null {
  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

const router = Router();

// ─── Admin Login (rate-limited to prevent brute-force) ─────────────────────────
router.post("/login", authLimiter, async (req: AdminRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    const env = getEnv();

    if (email !== env.ADMIN_EMAIL) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: "super_admin", role: "super_admin" },
      env.ADMIN_JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({ token, admin: { email: env.ADMIN_EMAIL, role: "super_admin" } });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// All routes below require auth
router.use(adminAuthRequired);

// ─── Verify token is still valid ───────────────────────────────────────────────
router.get("/verify", (_req: AdminRequest, res: Response) => {
  res.json({ valid: true });
});

// ─── Platform Stats ────────────────────────────────────────────────────────────
router.get("/stats", async (_req: AdminRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      pendingChanges,
      totalFeedback,
      totalInvoices,
      totalRevenue,
      lastMonthRevenue,
      totalAiCalls,
      refundedAmount,
      plans,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.subscription.count({ where: { status: { in: ["cancelled", "completed", "expired"] } } }),
      prisma.subscription.count({ where: { pendingPlanId: { not: null } } }),
      prisma.feedback.count(),
      prisma.invoice.count(),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "captured" } }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: "captured", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      prisma.subscription.aggregate({ _sum: { creditsUsed: true } }),
      prisma.invoice.aggregate({ _sum: { refundedAmount: true } }),
      prisma.subscriptionPlan.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { subscriptions: true } } },
      }),
    ]);

    const totalSubs = totalSubscriptions || 1;
    const churnRate = Math.round((cancelledSubscriptions / totalSubs) * 100);

    res.json({
      totalUsers,
      totalBusinesses,
      totalSubscriptions,
      activeSubscriptions,
      cancelledSubscriptions,
      churnRate,
      pendingChanges,
      totalFeedback,
      totalInvoices,
      totalRevenue: totalRevenue._sum.amount || 0,
      lastMonthRevenue: lastMonthRevenue._sum.amount || 0,
      totalAiCalls: totalAiCalls._sum.creditsUsed || 0,
      refundedAmount: refundedAmount._sum.refundedAmount || 0,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        interval: p.interval,
        creditsLimit: p.creditsLimit,
        businessLimit: p.businessLimit,
        active: p.active,
        subscriberCount: p._count.subscriptions,
      })),
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    const where = search
      ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { businesses: true, subscriptions: true } },
          subscriptions: { take: 1, orderBy: { createdAt: "desc" }, include: { plan: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        googleId: u.googleId ? true : false,
        showLitePlan: u.showLitePlan,
        visiblePlanSlugs: u.visiblePlanSlugs,
        suspended: u.suspended,
        suspendedAt: u.suspendedAt,
        suspendedReason: u.suspendedReason,
        deletedAt: u.deletedAt,
        createdAt: u.createdAt,
        businessCount: u._count.businesses,
        subscriptionCount: u._count.subscriptions,
        currentPlan: u.subscriptions[0]?.plan?.name || null,
        subscriptionStatus: u.subscriptions[0]?.status || null,
        creditsUsed: u.subscriptions[0]?.creditsUsed || 0,
        creditsLimit: u.subscriptions[0]?.creditsLimit || 0,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        businesses: { include: { _count: { select: { feedback: true } } } },
        subscriptions: { include: { plan: true, invoices: { orderBy: { createdAt: "desc" }, take: 10 } }, orderBy: { createdAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error("Admin user detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── User Management Actions ──────────────────────────────────────────────────
router.put("/users/:id/suspend", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { suspended: true, suspendedAt: new Date(), suspendedReason: reason || null },
    });
    await prisma.activityLog.create({
      data: { userId, businessId: null, action: "admin:suspend_user", details: { reason, adminId: req.adminId } },
    });
    res.json({ user });
  } catch (err) {
    console.error("Admin suspend user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id/unsuspend", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { suspended: false, suspendedAt: null, suspendedReason: null },
    });
    await prisma.activityLog.create({
      data: { userId, businessId: null, action: "admin:unsuspend_user", details: { adminId: req.adminId } },
    });
    res.json({ user });
  } catch (err) {
    console.error("Admin unsuspend user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), suspended: true },
    });
    await prisma.activityLog.create({
      data: { userId, businessId: null, action: "admin:delete_user", details: { adminId: req.adminId } },
    });
    res.json({ user });
  } catch (err) {
    console.error("Admin delete user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id/plan-visibility", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { visiblePlanSlugs } = req.body;
    if (!Array.isArray(visiblePlanSlugs)) {
      return res.status(400).json({ error: "visiblePlanSlugs must be an array of base plan slugs" });
    }
    const unique = Array.from(new Set(visiblePlanSlugs as string[]));
    const user = await prisma.user.update({
      where: { id: userId },
      data: { visiblePlanSlugs: unique.length > 0 ? unique : Prisma.DbNull },
    });
    await prisma.activityLog.create({
      data: { userId, businessId: null, action: "admin:update_plan_visibility", details: { visiblePlanSlugs: unique, adminId: req.adminId } },
    });
    res.json({ user });
  } catch (err) {
    console.error("Admin update plan visibility error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id/restore", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null, suspended: false, suspendedAt: null, suspendedReason: null },
    });
    await prisma.activityLog.create({
      data: { userId, businessId: null, action: "admin:restore_user", details: { adminId: req.adminId } },
    });
    res.json({ user });
  } catch (err) {
    console.error("Admin restore user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id/subscription/cancel", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: { in: [...ENTITLED_STATUSES] } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    if (!activeSub) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const razorpay = getRazorpay();
    const { issueRefund } = req.body || {};
    const wantsRefund = issueRefund === true;
    let refunded = false;

    if (!razorpay || !activeSub.razorpaySubscriptionId) {
      return res.status(503).json({ error: "Payment gateway is not configured for this subscription. Nothing was changed." });
    }

    const lastInvoice = await prisma.invoice.findFirst({
      where: { subscriptionId: activeSub.id, status: { in: ["captured", "paid"] }, kind: "subscription" },
      orderBy: { createdAt: "desc" },
    });

    if (wantsRefund) {
      if (!lastInvoice?.razorpayPaymentId) {
        return res.status(400).json({ error: "No captured invoice is available to refund." });
      }
      // Stop the mandate first, then refund the most recent charge.
      try {
        await razorpay.subscriptions.cancel(activeSub.razorpaySubscriptionId);
      } catch (cancelErr: any) {
        console.warn("Admin Razorpay cancel failed:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
        return res.status(502).json({ error: "Razorpay cancellation failed. Nothing was changed.", code: "CANCEL_FAILED" });
      }

      const refundable = Math.max(0, lastInvoice.amount - (lastInvoice.refundedAmount || 0));
      try {
        if (refundable > 0) {
          await razorpay.payments.refund(lastInvoice.razorpayPaymentId, { amount: refundable });
        }
        await prisma.invoice.update({
          where: { id: lastInvoice.id },
          data: { status: "refunded", refundedAmount: lastInvoice.amount },
        });
        refunded = true;
      } catch (refundErr: any) {
        console.warn("Admin refund failed:", refundErr?.error?.description || refundErr?.message || String(refundErr));
        await prisma.subscription.update({
          where: { id: activeSub.id },
          data: { status: "cancelled", cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
        });
        await ensureFreeSubscription(userId);
        return res.status(502).json({
          error: "Subscription cancelled, but the refund failed. Please retry the refund manually.",
          code: "REFUND_FAILED",
        });
      }
    } else {
      try {
        await razorpay.subscriptions.cancel(activeSub.razorpaySubscriptionId, 1);
      } catch (cancelErr: any) {
        console.warn("Admin Razorpay cancel failed:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
        return res.status(502).json({ error: "Razorpay cancellation failed. Nothing was changed.", code: "CANCEL_FAILED" });
      }
    }

    await prisma.subscription.update({
      where: { id: activeSub.id },
      data: {
        ...(wantsRefund ? { status: "cancelled" } : {}),
        cancelledAt: new Date(),
        pendingPlanId: null,
        scheduledChangeAt: null,
      },
    });
    if (wantsRefund) {
      await ensureFreeSubscription(userId);
    }

    await prisma.activityLog.create({
      data: { userId, businessId: null, action: "admin:cancel_subscription", details: { subscriptionId: activeSub.id, adminId: req.adminId, refunded, planName: activeSub.plan?.name } },
    });

    const updatedSub = await prisma.subscription.findUnique({
      where: { id: activeSub.id },
      include: { plan: true },
    });

    res.json({ subscription: updatedSub, refunded });
  } catch (err) {
    console.error("Admin cancel subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Force plan change for a user ─────────────────────────────────────
router.put("/users/:id/subscription/update", async (req: AdminRequest, res: Response) => {
  try {
    const userId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { planId, immediate } = req.body;
    if (!planId) return res.status(400).json({ error: "planId is required" });

    const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!newPlan) return res.status(404).json({ error: "Plan not found" });

    const activeSub = await prisma.subscription.findFirst({
      where: { userId, status: { in: [...ENTITLED_STATUSES] } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    if (!activeSub) return res.status(404).json({ error: "No active subscription" });
    if (newPlan.id === activeSub.planId) return res.status(400).json({ error: "Already on this plan" });

    const isImmediate = immediate !== false;
    const razorpay = getRazorpay();
    let subscription;

    /** Resolve (or create) the Razorpay plan, returning null on failure. */
    const ensureRazorpayPlan = async (): Promise<string | null> => {
      if (newPlan.razorpayPlanId) return newPlan.razorpayPlanId;
      if (!razorpay) return null;
      const periodMap: Record<string, string> = { month: "monthly", year: "yearly", day: "daily", week: "weekly", quarter: "quarterly" };
      try {
        const rpPlan = await razorpay.plans.create({
          period: (periodMap[newPlan.interval] || newPlan.interval) as any,
          interval: 1,
          item: { name: newPlan.name, amount: newPlan.price, currency: "INR" },
          notes: { internalPlanId: newPlan.id },
        });
        await prisma.subscriptionPlan.update({ where: { id: newPlan.id }, data: { razorpayPlanId: rpPlan.id } });
        return rpPlan.id;
      } catch (planErr: any) {
        console.warn("Admin create plan failed:", planErr?.error?.description || planErr?.message || String(planErr));
        return null;
      }
    };

    // Never change the DB plan when the gateway change failed — the previous
    // code ignored Razorpay failures, leaving entitlements and billing out of
    // sync (and could create an unauthorized subscription).
    if (razorpay && activeSub.razorpaySubscriptionId) {
      const razorpayPlanId = await ensureRazorpayPlan();
      if (!razorpayPlanId) {
        return res.status(502).json({ error: "Could not create the plan at the payment gateway. Nothing was changed.", code: "GATEWAY_ERROR" });
      }
      try {
        await razorpay.subscriptions.update(
          activeSub.razorpaySubscriptionId,
          (isImmediate ? { plan_id: razorpayPlanId } : { plan_id: razorpayPlanId, schedule_change_at: "cycle_end" }) as any,
        );
      } catch (updateErr: any) {
        console.warn("Admin Razorpay update failed:", updateErr?.error?.description || updateErr?.message || String(updateErr));
        return res.status(502).json({ error: "Razorpay rejected the plan change. Nothing was changed.", code: "GATEWAY_UPDATE_FAILED" });
      }
    } else if (razorpay && !activeSub.razorpaySubscriptionId && newPlan.price > 0) {
      return res.status(400).json({ error: "This subscription has no Razorpay mandate; use cancel + re-subscribe instead." });
    }

    if (isImmediate) {
      subscription = await prisma.subscription.update({
        where: { id: activeSub.id },
        data: {
          planId: newPlan.id,
          creditsLimit: newPlan.creditsLimit,
          businessLimit: newPlan.businessLimit,
          pendingPlanId: null,
          scheduledChangeAt: null,
        },
      });
    } else {
      const scheduledChangeAt = activeSub.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);
      subscription = await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { pendingPlanId: newPlan.id, scheduledChangeAt },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId, businessId: null,
        action: `admin:${isImmediate ? "immediate" : "scheduled"}_plan_change`,
        details: { fromPlanId: activeSub.planId, toPlanId: newPlan.id, adminId: req.adminId },
      },
    });

    subscription = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: { plan: true, pendingPlan: true },
    });

    res.json({ subscription, immediate: isImmediate });
  } catch (err) {
    console.error("Admin update subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Admin: Manual refund ─────────────────────────────────────────────────────
router.post("/invoices/:paymentId/refund", async (req: AdminRequest, res: Response) => {
  try {
    const paymentId = Array.isArray(req.params.paymentId) ? req.params.paymentId[0] : req.params.paymentId;
    const invoice = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: paymentId },
      include: { subscription: { include: { user: true } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (!["captured", "paid"].includes(invoice.status)) {
      return res.status(400).json({ error: "Invoice is not in a refundable status" });
    }

    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ error: "Payment gateway not configured" });

    const refundable = Math.max(0, invoice.amount - (invoice.refundedAmount || 0));
    if (refundable <= 0) {
      return res.status(400).json({ error: "Invoice is already fully refunded" });
    }

    let refund: any;
    try {
      refund = await razorpay.payments.refund(paymentId, { amount: refundable });
    } catch (refundErr: any) {
      console.error("Admin refund error:", refundErr);
      const message = refundErr?.error?.description || refundErr?.message || "Refund failed";
      return res.status(502).json({ error: message, code: "REFUND_FAILED" });
    }

    const refundedAmount = (invoice.refundedAmount || 0) + refundable;
    const fullyRefunded = refundedAmount >= invoice.amount;
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        refundedAmount,
        status: fullyRefunded ? "refunded" : "captured",
      },
    });

    // Refunding a credit top-up must also reverse the credits it granted.
    // Clamped in SQL so an already-spent balance can never go negative.
    if (invoice.kind === "topup") {
      const topUp = await prisma.creditTopUp.findFirst({
        where: { razorpayPaymentId: paymentId },
        select: { id: true, credits: true, subscriptionId: true },
      });
      if (topUp) {
        await prisma.$transaction(async (tx) => {
          await tx.creditTopUp.update({ where: { id: topUp.id }, data: { status: "refunded" } });
          await tx.$executeRaw`
            UPDATE "Subscription"
            SET "creditsTopUpBalance" = GREATEST(0, "creditsTopUpBalance" - ${topUp.credits}),
                "updatedAt" = NOW()
            WHERE "id" = ${topUp.subscriptionId}
          `;
        });
      }
    }

    const logUserId = invoice.subscription?.userId || invoice.subscription?.user?.id;
    if (logUserId) {
      await prisma.activityLog.create({
        data: {
          userId: logUserId,
          businessId: null,
          action: "admin:manual_refund",
          details: { paymentId, amount: refundable, refundId: refund?.id, subscriptionId: invoice.subscriptionId, adminId: req.adminId },
        },
      });
    }

    res.json({ success: true, amount: refundable, refundedAmount, fullyRefunded });
  } catch (err: any) {
    console.error("Admin refund error:", err);
    const message = err?.error?.description || err?.message || "Refund failed";
    res.status(500).json({ error: message });
  }
});

// ─── Businesses ────────────────────────────────────────────────────────────────
router.get("/businesses", async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    const where = search
      ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search, mode: "insensitive" as const } }] }
      : {};

    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, name: true } },
          _count: { select: { feedback: true, generatedReplies: true, qrCodes: true } },
        },
      }),
      prisma.business.count({ where }),
    ]);

    res.json({ businesses, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin businesses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/businesses/:id", async (req: AdminRequest, res: Response) => {
  try {
    const businessId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { feedback: true, qrCodes: true, generatedReplies: true, googleReviews: true } },
        feedback: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!business) return res.status(404).json({ error: "Business not found" });

    res.json({ business });
  } catch (err) {
    console.error("Admin business detail error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Update business industry (superadmin allotment) ─────────────────────────
// Founder-led food-only sales: customers never pick an industry in onboarding
// (it defaults to RESTAURANT). The admin allots/changes it here. Validated
// against the Prisma Industry enum; logged for audit.
const adminUpdateBusinessSchema = z.object({
  industry: z.enum(["DENTAL", "MEDICAL", "SALON", "GYM", "HOME_SERVICES", "RESTAURANT", "AUTO", "AUTO_DEALER", "FITNESS", "ELECTRONICS", "OTHER"]),
  promptTopics: z.array(z.string().max(100)).max(30).optional(),
  enabledCategories: z.array(z.string().max(50)).max(30).optional(),
  customReviewTopics: z.array(z.string().max(80)).max(20).optional(),
});

router.patch("/businesses/:id", async (req: AdminRequest, res: Response) => {
  try {
    const businessId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = adminUpdateBusinessSchema.parse(req.body);

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, userId: true, industry: true },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: {
        industry: data.industry as any,
        ...(data.promptTopics !== undefined ? { promptTopics: data.promptTopics } : {}),
        // Category IDs are industry-scoped. Reset to the new industry's
        // defaults when an admin re-allots the industry.
        ...(data.industry !== business.industry || data.enabledCategories !== undefined
          ? {
              enabledCategories: sanitizeEnabledCategories(
                data.industry,
                data.enabledCategories,
              ),
            }
          : {}),
        ...(data.customReviewTopics !== undefined
          ? { customReviewTopics: sanitizeCustomReviewTopics(data.customReviewTopics) }
          : {}),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: business.userId,
        businessId,
        action: "admin:industry_updated",
        details: { from: business.industry, to: data.industry, adminId: (req as any).adminId },
      },
    });

    res.json({ business: updated });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Admin update business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Subscriptions ─────────────────────────────────────────────────────────────
router.get("/subscriptions", async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, name: true } },
          plan: true,
          pendingPlan: true,
          invoices: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      }),
      prisma.subscription.count(),
    ]);

    res.json({ subscriptions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin subscriptions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Subscription Plans ────────────────────────────────────────────────────────
const adminPlanSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, digits or hyphens"),
  description: z.string().max(500).nullable().optional(),
  price: z.number().int().min(0).max(100_000_000),
  interval: z.enum(["day", "week", "month", "quarter", "year"]),
  creditsLimit: z.number().int().min(0).max(1_000_000),
  businessLimit: z.number().int().min(1).max(1000),
  teamSeats: z.number().int().min(1).max(1000).optional(),
  features: z.array(z.string().max(200)).max(50).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  razorpayPlanId: z.string().max(100).nullable().optional(),
});

router.get("/plans", async (_req: AdminRequest, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json({ plans });
  } catch (err) {
    console.error("Admin plans error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/plans", async (req: AdminRequest, res: Response) => {
  try {
    const data = adminPlanSchema.parse(req.body);
    const plan = await prisma.subscriptionPlan.create({
      data: {
        ...data,
        features: data.features || [],
        active: data.active ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    res.status(201).json({ plan });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.errors });
    console.error("Admin create plan error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/plans/:id", async (req: AdminRequest, res: Response) => {
  try {
    const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const data = adminPlanSchema.partial().parse(req.body);

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!existing) return res.status(404).json({ error: "Plan not found" });

    // If price or interval changes, the cached Razorpay plan points at the old
    // amount/period. Clear it (unless the admin supplied a new one) so the next
    // checkout creates a matching Razorpay plan instead of silently charging
    // the old price.
    const pricingChanged =
      (data.price !== undefined && data.price !== existing.price) ||
      (data.interval !== undefined && data.interval !== existing.interval);
    if (pricingChanged && data.razorpayPlanId === undefined) {
      data.razorpayPlanId = null;
    }

    const plan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data,
    });
    res.json({ plan });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: "Invalid input", details: err.errors });
    console.error("Admin update plan error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Invoices / Payments ───────────────────────────────────────────────────────
router.get("/invoices", async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          subscription: {
            include: { user: { select: { id: true, email: true, name: true } }, plan: true },
          },
        },
      }),
      prisma.invoice.count(),
    ]);

    res.json({ invoices, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin invoices error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Activity Log ──────────────────────────────────────────────────────────────
router.get("/activity", async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 30));
    const skip = (page - 1) * limit;
    const action = (req.query.action as string) || "";
    const search = (req.query.search as string) || "";
    const days = parseInt(req.query.days as string) || 0;

    const where: any = {};
    if (action) where.action = action;
    if (days > 0) where.createdAt = { gte: new Date(Date.now() - days * 86400000) };
    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: "insensitive" as const } } },
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { business: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    const [logs, total, actionBreakdown, totalAll] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, name: true } },
          business: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.groupBy({
        by: ["action"],
        _count: true,
        where: days > 0 ? { createdAt: { gte: new Date(Date.now() - days * 86400000) } } : {},
        orderBy: { _count: { action: "desc" } },
        take: 12,
      }),
      prisma.activityLog.count(),
    ]);

    res.json({ logs, total, totalAll, page, totalPages: Math.ceil(total / limit), actionBreakdown });
  } catch (err) {
    console.error("Admin activity error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Feedback Moderation ───────────────────────────────────────────────────────
router.get("/feedback", async (req: AdminRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          business: { select: { id: true, name: true, slug: true } },
          generatedReply: { select: { content: true, status: true } },
        },
      }),
      prisma.feedback.count(),
    ]);

    res.json({ feedback, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Admin feedback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
