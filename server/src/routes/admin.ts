import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { adminAuthRequired, AdminRequest } from "../middleware/admin";
import { authLimiter } from "../middleware/rate-limit";

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
      totalFeedback,
      totalInvoices,
      totalRevenue,
      totalAiCalls,
      plans,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.feedback.count(),
      prisma.invoice.count(),
      prisma.invoice.aggregate({ _sum: { amount: true }, where: { status: "captured" } }),
      prisma.subscription.aggregate({ _sum: { aiCallsUsed: true } }),
      prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    res.json({
      totalUsers,
      totalBusinesses,
      totalSubscriptions,
      activeSubscriptions,
      totalFeedback,
      totalInvoices,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalAiCalls: totalAiCalls._sum.aiCallsUsed || 0,
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        active: p.active,
        subscriberCount: 0,
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
      where: { userId, status: "active" },
    });
    if (!activeSub) {
      return res.status(404).json({ error: "No active subscription found" });
    }
    const sub = await prisma.subscription.update({
      where: { id: activeSub.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });
    await prisma.activityLog.create({
      data: { userId, businessId: "", action: "admin:cancel_subscription", details: { subscriptionId: sub.id, adminId: req.adminId } },
    });
    res.json({ subscription: sub });
  } catch (err) {
    console.error("Admin cancel subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
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
