import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Razorpay from "razorpay";
import crypto from "crypto";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { adminAuthRequired, AdminRequest } from "../middleware/admin";
import { authLimiter } from "../middleware/rate-limit";

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
      prisma.subscription.aggregate({ _sum: { aiCallsUsed: true } }),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "refunded" } }),
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
      totalAiCalls: totalAiCalls._sum.aiCallsUsed || 0,
      refundedAmount: refundedAmount._sum.amount || 0,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        aiCallsLimit: p.aiCallsLimit,
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
        suspended: u.suspended,
        suspendedAt: u.suspendedAt,
        suspendedReason: u.suspendedReason,
        deletedAt: u.deletedAt,
        createdAt: u.createdAt,
        businessCount: u._count.businesses,
        subscriptionCount: u._count.subscriptions,
        currentPlan: u.subscriptions[0]?.plan?.name || null,
        subscriptionStatus: u.subscriptions[0]?.status || null,
        aiCallsUsed: u.subscriptions[0]?.aiCallsUsed || 0,
        aiCallsLimit: u.subscriptions[0]?.aiCallsLimit || 0,
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
      data: { userId, businessId: "", action: "admin:suspend_user", details: { reason, adminId: req.adminId } },
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
      data: { userId, businessId: "", action: "admin:unsuspend_user", details: { adminId: req.adminId } },
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
      data: { userId, businessId: "", action: "admin:delete_user", details: { adminId: req.adminId } },
    });
    res.json({ user });
  } catch (err) {
    console.error("Admin delete user error:", err);
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
      data: { userId, businessId: "", action: "admin:restore_user", details: { adminId: req.adminId } },
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
      where: { userId, status: { in: ["active", "authenticated"] } },
      include: { plan: true },
    });
    if (!activeSub) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const razorpay = getRazorpay();
    const { issueRefund } = req.body || {};
    const isRefundEligible = issueRefund === true;
    let refunded = false;

    if (razorpay && activeSub.razorpaySubscriptionId) {
      try {
        if (isRefundEligible) {
          const invoice = await prisma.invoice.findFirst({
            where: { subscriptionId: activeSub.id, status: "captured" },
            orderBy: { createdAt: "asc" },
          });
          if (invoice?.razorpayPaymentId) {
            try {
              await razorpay.payments.refund(invoice.razorpayPaymentId, { amount: invoice.amount });
              await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "refunded" },
              });
              refunded = true;
            } catch (refundErr: any) {
              console.warn("Admin refund failed:", refundErr?.error?.description || refundErr?.message || String(refundErr));
            }
          }
          await razorpay.subscriptions.cancel(activeSub.razorpaySubscriptionId);
          await prisma.subscription.update({
            where: { id: activeSub.id },
            data: { status: "cancelled", cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
          });
          const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
          if (freePlan) {
            await prisma.subscription.create({
              data: {
                userId, planId: freePlan.id, status: "active",
                aiCallsLimit: freePlan.aiCallsLimit, businessLimit: freePlan.businessLimit,
                aiCallsLastResetAt: new Date(),
                currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
              },
            });
          }
        } else {
          await razorpay.subscriptions.cancel(activeSub.razorpaySubscriptionId, 1);
          await prisma.subscription.update({
            where: { id: activeSub.id },
            data: { cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
          });
        }
      } catch (cancelErr: any) {
        console.warn("Admin Razorpay cancel failed:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
        await prisma.subscription.update({
          where: { id: activeSub.id },
          data: { status: "cancelled", cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
        });
      }
    } else {
      await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { status: "cancelled", cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
      });
    }

    await prisma.activityLog.create({
      data: { userId, businessId: "", action: "admin:cancel_subscription", details: { subscriptionId: activeSub.id, adminId: req.adminId, refunded, planName: activeSub.plan?.name } },
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
      where: { userId, status: { in: ["active", "authenticated"] } },
      include: { plan: true },
    });
    if (!activeSub) return res.status(404).json({ error: "No active subscription" });
    if (newPlan.id === activeSub.planId) return res.status(400).json({ error: "Already on this plan" });

    const isImmediate = immediate !== false;
    const razorpay = getRazorpay();

    let subscription;

    if (isImmediate) {
      if (razorpay && activeSub.razorpaySubscriptionId) {
        let razorpayPlanId = newPlan.razorpayPlanId;
        if (!razorpayPlanId) {
          const rp = razorpay;
          const periodMap: Record<string, string> = { month: "monthly", year: "yearly", day: "daily", week: "weekly", quarter: "quarterly" };
          const period = periodMap[newPlan.interval] || newPlan.interval;
          try {
            const rpPlan = await rp.plans.create({
              period: period as any, interval: 1,
              item: { name: newPlan.name, amount: newPlan.price, currency: "INR" },
              notes: { internalPlanId: newPlan.id },
            });
            await prisma.subscriptionPlan.update({ where: { id: newPlan.id }, data: { razorpayPlanId: rpPlan.id } });
            razorpayPlanId = rpPlan.id;
          } catch (planErr: any) {
            console.warn("Admin create plan failed:", planErr?.error?.description || planErr?.message || String(planErr));
          }
        }
        if (razorpayPlanId) {
          try {
            await razorpay.subscriptions.update(activeSub.razorpaySubscriptionId, { plan_id: razorpayPlanId } as any);
          } catch (updateErr: any) {
            console.warn("Admin Razorpay update failed:", updateErr?.error?.description || updateErr?.message || String(updateErr));
          }
        }
      }
      subscription = await prisma.subscription.update({
        where: { id: activeSub.id },
        data: {
          planId: newPlan.id,
          aiCallsLimit: newPlan.aiCallsLimit,
          businessLimit: newPlan.businessLimit,
          aiCallsUsed: 0,
          aiCallsLastResetAt: new Date(),
          pendingPlanId: null,
          scheduledChangeAt: null,
        },
      });
    } else {
      const scheduledChangeAt = activeSub.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);
      if (razorpay && activeSub.razorpaySubscriptionId) {
        let razorpayPlanId = newPlan.razorpayPlanId;
        if (!razorpayPlanId) {
          try {
            const rpPlan = await razorpay.plans.create({
              period: (newPlan.interval === "year" ? "yearly" : "monthly") as any, interval: 1,
              item: { name: newPlan.name, amount: newPlan.price, currency: "INR" },
              notes: { internalPlanId: newPlan.id },
            });
            await prisma.subscriptionPlan.update({ where: { id: newPlan.id }, data: { razorpayPlanId: rpPlan.id } });
            razorpayPlanId = rpPlan.id;
          } catch (_) {}
        }
        if (razorpayPlanId) {
          try {
            await razorpay.subscriptions.update(activeSub.razorpaySubscriptionId, {
              plan_id: razorpayPlanId,
              schedule_change_at: "cycle_end",
            } as any);
          } catch (_) {}
        }
      }
      subscription = await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { pendingPlanId: newPlan.id, scheduledChangeAt },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId, businessId: "",
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
    if (invoice.status !== "captured") return res.status(400).json({ error: "Invoice is not in captured status" });

    const razorpay = getRazorpay();
    if (!razorpay) return res.status(503).json({ error: "Payment gateway not configured" });

    await razorpay.payments.refund(paymentId, { amount: invoice.amount });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "refunded" },
    });

    await prisma.activityLog.create({
      data: {
        userId: invoice.subscription.userId, businessId: "",
        action: "admin:manual_refund",
        details: { paymentId, amount: invoice.amount, subscriptionId: invoice.subscriptionId, adminId: req.adminId },
      },
    });

    res.json({ success: true, amount: invoice.amount });
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
    const { name, slug, description, price, interval, aiCallsLimit, businessLimit, features, active, sortOrder, razorpayPlanId } = req.body;
    const plan = await prisma.subscriptionPlan.create({
      data: { name, slug, description, price, interval, aiCallsLimit, businessLimit, features: features || [], active: active ?? true, sortOrder: sortOrder || 0, razorpayPlanId },
    });
    res.status(201).json({ plan });
  } catch (err) {
    console.error("Admin create plan error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/plans/:id", async (req: AdminRequest, res: Response) => {
  try {
    const planId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, slug, description, price, interval, aiCallsLimit, businessLimit, features, active, sortOrder, razorpayPlanId } = req.body;
    const plan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { name, slug, description, price, interval, aiCallsLimit, businessLimit, features, active, sortOrder, razorpayPlanId },
    });
    res.json({ plan });
  } catch (err) {
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
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, name: true } },
          business: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.activityLog.count(),
    ]);

    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
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
