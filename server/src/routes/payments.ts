import { Router, Response, Request } from "express";
import { z } from "zod";
import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { authRequired, authOptional, AuthRequest } from "../middleware/auth";


const router = Router();

function getRazorpay(): Razorpay | null {
  const env = getEnv();
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

const RAZORPAY_UPI_MAX_END = 4765046400;
const RAZORPAY_UPI_MAX_YEARS = 30;

function getSafeTotalCount(interval: string): number {
  const now = Math.floor(Date.now() / 1000);
  const maxByEndTime = RAZORPAY_UPI_MAX_END - now;
  const maxBy30yr = RAZORPAY_UPI_MAX_YEARS * 365 * 86400;
  const maxDuration = Math.min(maxByEndTime, maxBy30yr);
  const periodSeconds: Record<string, number> = { day: 86400, week: 604800, month: 2592000, quarter: 7776000, year: 31536000 };
  const secs = periodSeconds[interval] || 2592000;
  return Math.max(1, Math.min(100, Math.floor(maxDuration / secs)));
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

router.get("/plans", authOptional, async (req: AuthRequest, res: Response) => {
  try {
    const allPlans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    const userId = req.userId;
    if (!userId) {
      return res.json({ plans: allPlans });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { visiblePlanSlugs: true },
    });
    const visibleSlugs = Array.isArray(user?.visiblePlanSlugs)
      ? (user.visiblePlanSlugs as string[])
      : null;
    // visiblePlanSlugs is a list of base monthly slugs ("lite", "starter", ...).
    // A base slug also unlocks its yearly variant. null/empty = no restriction.
    if (visibleSlugs && visibleSlugs.length > 0) {
      const visible = allPlans.filter(
        (p: any) => visibleSlugs.includes(p.slug) || visibleSlugs.includes(p.slug.replace("-yearly", "")),
      );
      return res.json({ plans: visible });
    }
    res.json({ plans: allPlans });
  } catch (err) {
    console.error("Get plans error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subscription", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    let sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["authenticated", "active", "paused", "past_due"] } },
      include: {
        plan: true,
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      },
      orderBy: { createdAt: "desc" },
    });

    // If no active subscription, return the most recent one so the frontend
    // knows the user's state (cancelled, completed) and can determine limits
    if (!sub) {
      const latest = await prisma.subscription.findFirst({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        include: {
          plan: true,
          invoices: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      });
      // Only return if it's a recently meaningful state
      if (latest && ["cancelled", "completed", "halted"].includes(latest.status)) {
        sub = latest;
      }
    }

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
      return res.status(503).json({ error: "Payments are not available right now. Please try again later or contact support." });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const existing = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["created", "authenticated", "active", "paused", "past_due"] } },
    });
    if (existing) {
      if (existing.razorpaySubscriptionId) {
        try {
          const rpSubInfo = await razorpay.subscriptions.fetch(existing.razorpaySubscriptionId);
          const cancellableStatuses = ["active", "paused", "pending", "created"];
          if (rpSubInfo && cancellableStatuses.includes(rpSubInfo.status)) {
            await razorpay.subscriptions.cancel(existing.razorpaySubscriptionId);
          }
        } catch (cancelErr: any) {
          console.warn("Failed to cancel existing Razorpay subscription:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
        }
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
          creditsLimit: plan.creditsLimit,
          businessLimit: plan.businessLimit,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        },
      });
      return res.json({ subscription: sub, shortUrl: null });
    }

    let razorpayPlanId = plan.razorpayPlanId || await getOrCreateRazorpayPlan(razorpay, plan);

    let rpSub: any;
    try {
      rpSub = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: getSafeTotalCount(plan.interval),
        customer_notify: true,
        notes: { userId: req.userId!, planId: plan.id },
      } as any);
    } catch (planErr: any) {
      console.warn("Subscription create failed, re-creating plan and retrying:", planErr?.error?.description || planErr?.message || String(planErr));
      await prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: { razorpayPlanId: null },
      });
      razorpayPlanId = await getOrCreateRazorpayPlan(razorpay, plan);
      rpSub = await razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: getSafeTotalCount(plan.interval),
        customer_notify: true,
        notes: { userId: req.userId!, planId: plan.id },
      } as any);
    }
    rpSub = rpSub as any;

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.userId!,
        planId: plan.id,
        status: "created",
        razorpaySubscriptionId: rpSub.id,
        razorpayCustomerId: rpSub.customer_id || null,
        creditsLimit: plan.creditsLimit,
        businessLimit: plan.businessLimit,
        currentPeriodStart: rpSub.current_start ? new Date(rpSub.current_start * 1000) : null,
        currentPeriodEnd: rpSub.current_end ? new Date(rpSub.current_end * 1000) : null,
      },
    });

    const env = getEnv();
    res.json({
      subscription,
      shortUrl: rpSub.short_url,
      keyId: env.RAZORPAY_KEY_ID,
      razorpaySubscriptionId: rpSub.id,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Create subscription error:", err);
    const serialized = Object.keys(err as object).length ? JSON.stringify(err, Object.getOwnPropertyNames(err), 2) : String(err);
    console.error("Create subscription error details:", serialized);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Razorpay redirects here after customer completes payment on subscription-hosted page
// Verifies HMAC signature (payment_id|subscription_id signed with KEY_SECRET) before redirecting to frontend
router.get("/subscription-callback", async (req: Request, res: Response) => {
  try {
    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.query;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.redirect(`${frontendUrl}/dashboard/billing?success=false&error=missing_params`);
    }

    if (!env.RAZORPAY_KEY_SECRET) {
      return res.redirect(`${frontendUrl}/dashboard/billing?success=false&error=gateway_not_configured`);
    }

    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      console.error("Subscription callback signature mismatch");
      return res.redirect(`${frontendUrl}/dashboard/billing?success=false&error=invalid_signature`);
    }

    const dbSub = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: razorpay_subscription_id as string },
    });

    let capturedPlan: { name: string; interval: string; price: number } | null = null;
    if (dbSub && dbSub.status === "created") {
      try {
        const razorpay = getRazorpay();
        if (razorpay) {
          const payment = await razorpay.payments.fetch(razorpay_payment_id as string);
          if (payment.status === "captured") {
            await prisma.subscription.update({
              where: { id: dbSub.id },
              data: {
                status: "authenticated",
                razorpayCustomerId: (payment as any).customer_id || dbSub.razorpayCustomerId,
              },
            });
            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: dbSub.planId } });
            if (plan) capturedPlan = { name: plan.name, interval: plan.interval, price: plan.price };
            await prisma.invoice.upsert({
              where: { razorpayPaymentId: razorpay_payment_id as string },
              create: {
                subscriptionId: dbSub.id,
                razorpayPaymentId: razorpay_payment_id as string,
                amount: Number(payment.amount) || plan?.price || 0,
                currency: "INR",
                status: "captured",
                description: `Initial payment for ${plan?.name || "subscription"}`,
              },
              update: {},
            }).catch(() => {});
          }
        }
      } catch (fetchErr: any) {
        console.warn("Could not verify payment status on callback:", fetchErr.message || fetchErr);
      }
    }

    let redirectUrl = `${frontendUrl}/payment/success?payment_id=${razorpay_payment_id}&subscription_id=${razorpay_subscription_id}`;
    if (capturedPlan) {
      redirectUrl += `&plan=${encodeURIComponent(capturedPlan.name)}&amount=${capturedPlan.price}&interval=${capturedPlan.interval}`;
    }
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Subscription callback error:", err);
    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/dashboard/billing?success=false&error=server_error`);
  }
});

router.post("/verify-payment", async (req: Request, res: Response) => {
  try {
    const env = getEnv();
    const { payment_id, subscription_id, signature } = req.body;

    if (!payment_id || !subscription_id || !signature) {
      return res.status(400).json({ error: "Missing payment verification parameters" });
    }

    if (!env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: "Payment gateway not configured" });
    }

    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(`${payment_id}|${subscription_id}`)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    let invoice = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: payment_id as string },
      include: { subscription: { include: { plan: true, user: { select: { name: true, email: true } } } } },
    });

    if (invoice) {
      return res.json({ verified: true, invoice });
    }

    const dbSub = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription_id as string },
    });

    if (!dbSub) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const razorpay = getRazorpay();
    let capturedPlan: { name: string; interval: string; price: number } | null = null;

    if (razorpay && dbSub.status === "created") {
      try {
        const payment = await razorpay.payments.fetch(payment_id as string);
        if (payment.status === "captured") {
          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: {
              status: "authenticated",
              razorpayCustomerId: (payment as any).customer_id || dbSub.razorpayCustomerId,
            },
          });
          const plan = await prisma.subscriptionPlan.findUnique({ where: { id: dbSub.planId } });
          if (plan) capturedPlan = { name: plan.name, interval: plan.interval, price: plan.price };
          await prisma.invoice.upsert({
            where: { razorpayPaymentId: payment_id as string },
            create: {
              subscriptionId: dbSub.id,
              razorpayPaymentId: payment_id as string,
              amount: Number(payment.amount) || plan?.price || 0,
              currency: "INR",
              status: "captured",
              description: `Initial payment for ${plan?.name || "subscription"}`,
            },
            update: {},
          }).catch(() => {});
        }
      } catch (fetchErr: any) {
        console.warn("Could not verify payment status:", fetchErr.message || fetchErr);
      }
    }

    invoice = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: payment_id as string },
      include: { subscription: { include: { plan: true, user: { select: { name: true, email: true } } } } },
    });

    if (!invoice) {
      return res.status(202).json({ verified: true, invoice: null, message: "Payment verified but invoice not yet created. Please try again." });
    }

    res.json({ verified: true, invoice });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invoice/:paymentId", async (req: Request, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: req.params.paymentId as string },
      include: { subscription: { include: { plan: true } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json({ invoice });
  } catch (err) {
    console.error("Get invoice error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/receipt/:paymentId", async (req: Request, res: Response) => {
  try {
    const invoice: any = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: req.params.paymentId as string },
      include: { subscription: { include: { user: { select: { name: true, email: true } }, plan: true } } },
    });
    if (!invoice) {
      return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Receipt - BEYONDVYU</title><style>body{font-family:'Segoe UI',system-ui,sans-serif;background:#f5f5f5;padding:40px 20px;display:flex;justify-content:center;}.card{max-width:480px;width:100%;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:48px 40px;text-align:center;}h1{font-size:22px;color:#0f172a;margin-bottom:8px;}p{color:#64748b;font-size:14px;line-height:1.6;}.spinner{margin:24px auto;width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#0f172a;border-radius:50%;animation:spin .8s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}</style></head><body><div class="card"><div class="spinner"></div><h1>Receipt is being generated</h1><p>Your receipt will be available shortly. Please check back in a few minutes.</p></div></body></html>`);
    }

    const plan = invoice.subscription?.plan;
    const user = invoice.subscription?.user;
    const amt = (invoice.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const date = new Date(invoice.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    const total = (invoice.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const invNum = invoice.id.slice(-8).toUpperCase();
    const domain = req.headers.host || "beyondvyu.com";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const baseUrl = `${protocol}://${domain}`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Security-Policy", `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; frame-ancestors 'none';`);
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Receipt - BEYONDVYU</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f5f5f5; padding: 40px 20px; display: flex; justify-content: center; }
  .receipt { max-width: 640px; width: 100%; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 48px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f0f0f0; }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 40px; height: 40px; background: #0f172a; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
  .brand h1 { font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; }
  .brand p { font-size: 12px; color: #64748b; margin-top: 1px; }
  .badge { background: #059669; color: #fff; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
  .status { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; }
  .status-icon { width: 20px; height: 20px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
  .status-text { font-size: 14px; font-weight: 600; color: #065f46; }
  .details { margin-bottom: 24px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f5f5f5; }
  .row:last-child { border-bottom: none; }
  .label { color: #64748b; }
  .value { font-weight: 500; color: #0f172a; }
  .total-row { display: flex; justify-content: space-between; padding: 16px 0 0; margin-top: 8px; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 700; color: #0f172a; }
  .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6; }
  .footer a { color: #0f172a; text-decoration: none; }
  .actions { margin-top: 24px; text-align: center; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .actions button { background: #0f172a; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
  .actions button:hover { background: #1e293b; }
  .actions .secondary { background: #fff; color: #0f172a; border: 1.5px solid #e2e8f0; }
  .actions .secondary:hover { background: #f8fafc; }
  @media print { body { padding: 0; background: #fff; } .receipt { box-shadow: none; padding: 24px; } .actions { display: none; } }
</style></head>
<body>
<div class="receipt">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">BV</div>
      <div class="brand">
        <h1>BEYONDVYU</h1>
        <p>Payment Receipt</p>
      </div>
    </div>
    <span class="badge">Paid</span>
  </div>
  <div class="status">
    <span class="status-icon">&#10003;</span>
    <span class="status-text">Payment Successful</span>
  </div>
  <div class="details">
    <div class="row"><span class="label">Invoice Number</span><span class="value">${invNum}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
    <div class="row"><span class="label">Plan</span><span class="value">${plan?.name || "N/A"} ${plan ? `(${plan.interval})` : ""}</span></div>
    <div class="row"><span class="label">Payment ID</span><span class="value" style="font-size:12px">${invoice.razorpayPaymentId}</span></div>
    <div class="row"><span class="label">Customer</span><span class="value">${user?.name || user?.email || "N/A"}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${user?.email || "N/A"}</span></div>
    <div class="row"><span class="label">Amount Paid</span><span class="value">&#8377; ${amt}</span></div>
  </div>
  <div class="total-row"><span>Total Paid</span><span>&#8377; ${total}</span></div>
  <div class="footer">
    <p>BEYONDVYU &middot; <a href="https://beyondvyu.com">beyondvyu.com</a></p>
    <p>support@beyondvyu.com</p>
    <p>This is a computer-generated receipt.</p>
  </div>
  <div class="actions">
    <button id="printBtn">&#128424; Print / Save as PDF</button>
    <button id="closeBtn" class="secondary">Close</button>
  </div>
</div>
<script>
  document.getElementById('printBtn').addEventListener('click', function() { window.print(); });
  document.getElementById('closeBtn').addEventListener('click', function() { window.close(); });
</script>
</body>
</html>`);
  } catch (err) {
    console.error("Receipt generation error:", err);
    res.status(500).send("<h1>Error generating receipt</h1>");
  }
});

router.post("/cancel-pending", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: "created" },
    });
    if (!sub) return res.json({ success: true });

    const razorpay = getRazorpay();
    if (razorpay && sub.razorpaySubscriptionId) {
      try {
        const rpSubInfo = await razorpay.subscriptions.fetch(sub.razorpaySubscriptionId);
        const cancellableStatuses = ["active", "paused", "pending", "created"];
        if (rpSubInfo && cancellableStatuses.includes(rpSubInfo.status)) {
          await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
        }
      } catch (cancelErr: any) {
        console.warn("Failed to cancel pending Razorpay subscription:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
      }
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Cancel pending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/update-subscription", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = z.object({ planId: z.string() }).parse(req.body);

    const currentSub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["active", "authenticated"] } },
      include: { plan: true },
    });
    if (!currentSub) return res.status(404).json({ error: "No active subscription" });

    const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!newPlan || !newPlan.active) return res.status(404).json({ error: "Plan not found" });
    if (newPlan.id === currentSub.planId) return res.status(400).json({ error: "Already on this plan" });
    if (newPlan.price === 0) return res.status(400).json({ error: "Cannot switch to free plan. Use cancel instead." });

    const isUpgrade = newPlan.price >= currentSub.plan.price;
    const razorpay = getRazorpay();

    if (!isUpgrade) {
      const businessCount = await prisma.business.count({ where: { userId: req.userId } });
      if (businessCount > newPlan.businessLimit) {
        return res.status(400).json({
          error: `You have ${businessCount} businesses but the ${newPlan.name} plan only allows ${newPlan.businessLimit}. Please delete ${businessCount - newPlan.businessLimit} business(es) first to downgrade.`,
        });
      }
    }

    if (isUpgrade) {
      // Upgrade: change plan immediately with proration
      let subscription = currentSub;

      if (razorpay && currentSub.razorpaySubscriptionId) {
        let razorpayPlanId: string;
        try {
          razorpayPlanId = newPlan.razorpayPlanId || await getOrCreateRazorpayPlan(razorpay, newPlan);
          await razorpay.subscriptions.update(currentSub.razorpaySubscriptionId, {
            plan_id: razorpayPlanId,
          } as any);
        } catch (updateErr: any) {
          // Razorpay PATCH may fail (stale plan_id, emandate) — fallback: create fresh plan + new subscription
          console.warn("Razorpay subscription update failed, fallback:", updateErr?.error?.description || updateErr?.message || String(updateErr));
          if (newPlan.razorpayPlanId) {
            await prisma.subscriptionPlan.update({
              where: { id: newPlan.id },
              data: { razorpayPlanId: null },
            });
          }
          razorpayPlanId = await getOrCreateRazorpayPlan(razorpay, newPlan);
          try { await razorpay.subscriptions.cancel(currentSub.razorpaySubscriptionId); } catch (_) {}
          const rpSub = await razorpay.subscriptions.create({
            plan_id: razorpayPlanId,
            total_count: getSafeTotalCount(newPlan.interval),
            customer_notify: true,
            notes: { userId: req.userId!, planId: newPlan.id },
          } as any);
          await prisma.subscription.update({
            where: { id: currentSub.id },
            data: { razorpaySubscriptionId: rpSub.id },
          });
        }
      }

      subscription = await prisma.subscription.update({
        where: { id: currentSub.id },
        data: {
          planId: newPlan.id,
          creditsLimit: newPlan.creditsLimit,
          businessLimit: newPlan.businessLimit,
          creditsUsed: 0,
          creditsLastResetAt: new Date(),
          pendingPlanId: null,
          scheduledChangeAt: null,
        },
        include: { plan: true },
      });

      return res.json({
        subscription,
        upgrade: true,
        immediate: true,
        message: `Upgraded to ${newPlan.name}. Prorated difference will be charged.`,
      });
    } else {
      // Downgrade: schedule at end of current billing cycle
      if (razorpay && currentSub.razorpaySubscriptionId) {
        try {
          let razorpayPlanId = newPlan.razorpayPlanId || await getOrCreateRazorpayPlan(razorpay, newPlan);
          await razorpay.subscriptions.update(currentSub.razorpaySubscriptionId, {
            plan_id: razorpayPlanId,
            schedule_change_at: "cycle_end",
          } as any);
        } catch (updateErr: any) {
          // Razorpay PATCH may fail (stale plan_id, emandate) — retry with fresh plan
          console.warn("Razorpay scheduled update failed, retrying with fresh plan:", updateErr?.error?.description || updateErr?.message || String(updateErr));
          if (newPlan.razorpayPlanId) {
            await prisma.subscriptionPlan.update({
              where: { id: newPlan.id },
              data: { razorpayPlanId: null },
            });
            try {
              const freshPlanId = await getOrCreateRazorpayPlan(razorpay, newPlan);
              await razorpay.subscriptions.update(currentSub.razorpaySubscriptionId, {
                plan_id: freshPlanId,
                schedule_change_at: "cycle_end",
              } as any);
            } catch (retryErr: any) {
              console.warn("Razorpay scheduled update retry also failed, using DB-only fallback:", retryErr?.error?.description || retryErr?.message || String(retryErr));
            }
          }
        }
      }

      const scheduledChangeAt = currentSub.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);
      const subscription = await prisma.subscription.update({
        where: { id: currentSub.id },
        data: {
          pendingPlanId: newPlan.id,
          scheduledChangeAt,
        },
      });

      return res.json({
        subscription,
        upgrade: false,
        immediate: false,
        scheduledDate: scheduledChangeAt.toISOString(),
        message: `Downgrade to ${newPlan.name} scheduled at end of current billing period (${scheduledChangeAt.toLocaleDateString()}).`,
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Update subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cancel", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["active", "authenticated"] } },
      include: { plan: true },
    });
    if (!sub) return res.status(404).json({ error: "No active subscription" });

    // Check business limit before cancelling — user will be downgraded to free plan (limit=1)
    const businessCount = await prisma.business.count({ where: { userId: req.userId } });
    const freePlanCheck = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
    const freeLimit = freePlanCheck?.businessLimit ?? 1;
    if (businessCount > freeLimit) {
      return res.status(400).json({
        error: `You have ${businessCount} businesses but the Free plan only allows ${freeLimit}. Please delete ${businessCount - freeLimit} business(es) first to cancel your subscription.`,
        code: "BUSINESS_LIMIT_EXCEEDS_FREE",
        current: businessCount,
        limit: freeLimit,
      });
    }

    const razorpay = getRazorpay();
    const daysSinceCreation = (Date.now() - new Date(sub.createdAt).getTime()) / 86400000;
    const isRefundEligible = daysSinceCreation <= 7;

    if (razorpay && sub.razorpaySubscriptionId) {
      try {
        if (isRefundEligible) {
          // Full refund within 7-day window
          const invoice = await prisma.invoice.findFirst({
            where: { subscriptionId: sub.id, status: "captured" },
            orderBy: { createdAt: "asc" },
          });
          if (invoice?.razorpayPaymentId) {
            try {
              await razorpay.payments.refund(invoice.razorpayPaymentId, { amount: invoice.amount });
            } catch (refundErr: any) {
              console.warn("Refund failed:", refundErr?.error?.description || refundErr?.message || String(refundErr));
            }
          }
          await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
        } else {
          // Cancel at cycle end — user keeps access until period end
          await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, 1);
        }
      } catch (cancelErr: any) {
        console.warn("Failed to cancel Razorpay subscription:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
      }
    }

    if (isRefundEligible) {
      // Within 7 days: immediate revert to free plan
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
            creditsLimit: freePlan.creditsLimit,
            businessLimit: freePlan.businessLimit,
            creditsLastResetAt: new Date(),
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
          },
        });
      }
      return res.json({ success: true, refunded: true, message: "Subscription cancelled and fully refunded." });
    } else {
      // After 7 days: keep access until period end
      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          cancelledAt: new Date(),
          pendingPlanId: null,
          scheduledChangeAt: null,
        },
      });
      return res.json({
        success: true,
        refunded: false,
        message: `Subscription will remain active until ${sub.currentPeriodEnd?.toLocaleDateString() || "end of billing period"}. No refund issued as per our policy.`,
      });
    }
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Credit Top-Up Endpoints ──────────────────────────────────────────────

const CREDITS_PRICE_PER_UNIT = 99; // 99 paise per credit (₹99 per 100 credits)

function getCreditPacks(): { credits: number; amount: number; label: string }[] {
  return [
    { credits: 100, amount: 9900, label: "100 Credits" },
    { credits: 500, amount: 44900, label: "500 Credits" },
    { credits: 1000, amount: 79900, label: "1,000 Credits" },
    { credits: 2500, amount: 179900, label: "2,500 Credits" },
  ];
}

router.get("/credit-packs", (_req, res: Response) => {
  res.json({ packs: getCreditPacks() });
});

router.post("/create-top-up", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { credits } = z.object({ credits: z.number().int().min(1).max(100000) }).parse(req.body);
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({ error: "Payments are not available right now." });
    }

    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["authenticated", "active"] } },
    });
    if (!sub) return res.status(404).json({ error: "No active subscription" });

    const amount = credits * CREDITS_PRICE_PER_UNIT;

    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";

    // Create Razorpay Payment Link for one-time purchase
    const link = await razorpay.paymentLink.create({
      amount,
      currency: "INR",
      description: `${credits} Credits Top-Up`,
      customer: { email: (req as any).user?.email || "", contact: "" },
      notify: { email: true, sms: false },
      notes: {
        subscriptionId: sub.id,
        credits: credits.toString(),
        type: "credit_topup",
      },
      callback_url: `${frontendUrl}/api/payments/top-up-callback?credits=${credits}`,
      callback_method: "get",
    } as any);

    if (!link || !link.short_url) {
      return res.status(500).json({ error: "Failed to create payment link" });
    }

    // Create pending CreditTopUp record
    await prisma.creditTopUp.create({
      data: {
        subscriptionId: sub.id,
        credits,
        amount,
        status: "pending",
      },
    });

    res.json({ shortUrl: link.short_url, credits, amount, id: link.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Create top-up error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/top-up-callback", async (req: Request, res: Response) => {
  try {
    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";
    const { razorpay_payment_id, razorpay_payment_link_id, razorpay_signature, credits } = req.query;

    if (!razorpay_payment_id) {
      return res.redirect(`${frontendUrl}/dashboard/billing?topup=error&reason=missing_payment`);
    }

    // Verify signature
    if (env.RAZORPAY_KEY_SECRET && razorpay_signature) {
      const expected = crypto
        .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_payment_id}|${razorpay_payment_link_id}`)
        .digest("hex");
      if (expected !== razorpay_signature) {
        console.error("Top-up callback signature mismatch");
      }
    }

    // Find and update pending CreditTopUp
    const topUp = await prisma.creditTopUp.findFirst({
      where: { razorpayPaymentId: razorpay_payment_id as string },
      orderBy: { createdAt: "desc" },
    });

    if (topUp && topUp.status === "pending") {
      await prisma.creditTopUp.update({
        where: { id: topUp.id },
        data: {
          status: "captured",
          razorpayPaymentId: razorpay_payment_id as string,
        },
      });
      await prisma.subscription.update({
        where: { id: topUp.subscriptionId },
        data: { creditsTopUpBalance: { increment: topUp.credits } },
      });
    }

    return res.redirect(`${frontendUrl}/dashboard/billing?topup=success&credits=${credits || (topUp?.credits || "")}`);
  } catch (err) {
    console.error("Top-up callback error:", err);
    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";
    return res.redirect(`${frontendUrl}/dashboard/billing?topup=error`);
  }
});

// Webhook handler for Payment Link completions (Razorpay sends this)
router.post("/top-up-webhook", async (req: Request, res: Response) => {
  try {
    const env = getEnv();
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"] as string;

    if (webhookSecret && signature) {
      const expected = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");
      if (expected !== signature) {
        return res.status(400).json({ status: "error", message: "Invalid signature" });
      }
    }

    const event = req.body;
    if (event.event === "payment_link.paid") {
      const paymentLink = event.payload.payment_link?.entity;
      const paymentEntity = event.payload.payment?.entity;
      const notes = paymentLink?.notes || {};
      const credits = parseInt(notes.credits || "0", 10);
      const subscriptionId = notes.subscriptionId || "";
      const paymentId = paymentEntity?.id || paymentLink?.id;

      if (credits > 0 && subscriptionId) {
        // Check if already processed
        const existing = await prisma.creditTopUp.findFirst({
          where: { razorpayPaymentId: paymentId },
        });
        if (!existing) {
          await prisma.creditTopUp.create({
            data: {
              subscriptionId,
              credits,
              amount: paymentEntity?.amount || paymentLink?.amount || 0,
              razorpayPaymentId: paymentId,
              status: "captured",
            },
          });
          await prisma.subscription.update({
            where: { id: subscriptionId },
            data: { creditsTopUpBalance: { increment: credits } },
          });
        }
      }
    }
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Top-up webhook error:", err);
    res.status(500).json({ status: "error" });
  }
});

router.get("/credit-balance", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["authenticated", "active", "created"] } },
      orderBy: { createdAt: "desc" },
    });

    if (!sub) {
      return res.json({ balance: null });
    }

    // Monthly reset check
    const daysSinceReset = sub.creditsLastResetAt
      ? (Date.now() - new Date(sub.creditsLastResetAt).getTime()) / 86400000
      : 31;
    let creditsUsed = sub.creditsUsed;
    let creditsLimit = sub.creditsLimit;
    let creditsLastResetAt = sub.creditsLastResetAt;

    if (daysSinceReset >= 30) {
      creditsUsed = 0;
      creditsLastResetAt = new Date();
      // Don't update in DB here, just report — the middleware will reset on next request
    }

    res.json({
      balance: {
        creditsUsed,
        creditsLimit,
        creditsTopUpBalance: sub.creditsTopUpBalance,
        creditsLastResetAt,
        monthlyRemaining: Math.max(0, creditsLimit - creditsUsed),
        totalRemaining: Math.max(0, creditsLimit - creditsUsed) + sub.creditsTopUpBalance,
        autoRechargeEnabled: sub.autoRechargeEnabled,
        autoRechargeThreshold: sub.autoRechargeThreshold,
        autoRechargeAmount: sub.autoRechargeAmount,
      },
    });
  } catch (err) {
    console.error("Credit balance error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auto-recharge", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      enabled: z.boolean(),
      threshold: z.number().int().min(5).max(500).optional().default(20),
      amount: z.number().int().min(50).max(10000).optional().default(100),
    }).parse(req.body);

    const sub = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { in: ["authenticated", "active"] } },
    });
    if (!sub) return res.status(404).json({ error: "No active subscription" });

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        autoRechargeEnabled: data.enabled,
        autoRechargeThreshold: data.threshold,
        autoRechargeAmount: data.amount,
      },
    });

    res.json({
      autoRechargeEnabled: updated.autoRechargeEnabled,
      autoRechargeThreshold: updated.autoRechargeThreshold,
      autoRechargeAmount: updated.autoRechargeAmount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Auto-recharge error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
