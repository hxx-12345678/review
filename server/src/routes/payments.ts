import { Router, Response, Request } from "express";
import { z } from "zod";
import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { authRequired, authOptional, AuthRequest } from "../middleware/auth";
import {
  ENTITLED_STATUSES,
  monthlyEquivalentPaise,
  computeTaxBreakup,
  allocateInvoiceNumber,
  escapeHtml,
  maskEmail,
  getCreditPacks,
  priceForCredits,
} from "../utils/billing";
import {
  loadEntitledSubscription,
  ensureFreeSubscription,
  cancelOtherEntitledSubscriptions,
  promoteSubscription,
  resetMonthlyCreditsIfDue,
} from "../services/subscriptions";


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

/** Constant-time comparison of two hex HMAC strings. */
function signaturesMatch(expected: string, provided: string | undefined | null): boolean {
  if (!provided || typeof provided !== "string") return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Human-readable label for an invoice/subscription status. */
function Invoice_statusLabel(status: string | null | undefined): string {
  const s = (status || "pending").toLowerCase();
  const map: Record<string, string> = {
    captured: "Paid",
    paid: "Paid",
    created: "Pending",
    pending: "Pending",
    failed: "Failed",
    refunded: "Refunded",
    partially_refunded: "Partially refunded",
  };
  return map[s] || s.charAt(0).toUpperCase() + s.slice(1);
}

/** Only these plan fields are safe to expose to anonymous callers. */
const PLAN_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  interval: true,
  creditsLimit: true,
  businessLimit: true,
  teamSeats: true,
  features: true,
  active: true,
  sortOrder: true,
} as const;

/** Per-user plan visibility (`User.visiblePlanSlugs`); empty/null = all plans. */
async function isPlanVisibleToUser(userId: string, plan: { slug: string }): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { visiblePlanSlugs: true },
  });
  const slugs = Array.isArray(user?.visiblePlanSlugs)
    ? (user!.visiblePlanSlugs as string[])
    : null;
  if (!slugs || slugs.length === 0) return true;
  return slugs.includes(plan.slug) || slugs.includes(plan.slug.replace("-yearly", ""));
}

type InvoiceInput = {
  subscriptionId: string | null;
  planId?: string | null;
  paymentId?: string | null;
  amount: number;
  status?: string;
  kind?: "subscription" | "topup";
  description?: string;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  customerEmail?: string | null;
  customerName?: string | null;
};

/**
 * Create (idempotently by Razorpay payment id) a subscription invoice with a
 * sequential number, GST breakup and customer snapshot. Amounts are the
 * collected (tax-inclusive) paise, so the tax invoice reconciles to the payment.
 */
export async function recordInvoice(input: InvoiceInput) {
  const env = getEnv();
  const { taxableAmount, taxAmount } = computeTaxBreakup(input.amount, env.GST_RATE_PERCENT);

  // Idempotent: a retried webhook/verify must not consume another invoice
  // number or rewrite the original amount/customer snapshot.
  if (input.paymentId) {
    const existing = await prisma.invoice.findUnique({
      where: { razorpayPaymentId: input.paymentId },
    });
    if (existing) {
      const nextStatus = input.status ?? existing.status;
      if (nextStatus !== existing.status) {
        return prisma.invoice.update({ where: { id: existing.id }, data: { status: nextStatus } });
      }
      return existing;
    }
  }

  const invoiceNumber = await allocateInvoiceNumber(prisma);

  const base = {
    subscriptionId: input.subscriptionId,
    planId: input.planId ?? null,
    amount: input.amount,
    taxableAmount,
    taxAmount,
    currency: "INR",
    status: input.status ?? "captured",
    kind: input.kind ?? "subscription",
    description: input.description ?? null,
    periodStart: input.periodStart ?? null,
    periodEnd: input.periodEnd ?? null,
    customerEmail: input.customerEmail ?? null,
    customerName: input.customerName ?? null,
  };

  if (input.paymentId) {
    return prisma.invoice.create({
      data: { ...base, razorpayPaymentId: input.paymentId, invoiceNumber },
    });
  }
  return prisma.invoice.create({ data: { ...base, invoiceNumber } });
}

router.get("/plans", authOptional, async (req: AuthRequest, res: Response) => {
  try {
    const allPlans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: PLAN_PUBLIC_SELECT,
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
    const include = {
      plan: true,
      pendingPlan: true,
      invoices: { orderBy: { createdAt: "desc" as const }, take: 20 },
    };

    let sub = await loadEntitledSubscription(req.userId!, { include });

    // Guarantee the user always has an entitled plan (Free if nothing else),
    // so the billing UI never dead-ends on a cancelled/created row.
    if (!sub) {
      await ensureFreeSubscription(req.userId!);
      sub = await loadEntitledSubscription(req.userId!, { include });
    }

    // Most recent non-entitled subscription (cancelled/created/paused/halted)
    // so the client can still surface its invoices/receipts.
    const previous = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: { notIn: [...ENTITLED_STATUSES] }, id: { not: sub?.id ?? "" } },
      include,
      orderBy: { createdAt: "desc" },
    });

    res.json({ subscription: sub || null, previous: previous || null });
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

    // Per-user plan visibility (admin can restrict which plans an account sees).
    if (!(await isPlanVisibleToUser(req.userId!, plan))) {
      return res.status(403).json({ error: "This plan is not available for your account." });
    }

    // A user with a paid entitled plan must use change-plan, not create a
    // second subscription (the old code silently cancelled their paid plan
    // before the new payment even succeeded).
    const existing = await loadEntitledSubscription(req.userId!);
    if (existing) {
      const existingPlan = await prisma.subscriptionPlan.findUnique({ where: { id: existing.planId } });
      if (existingPlan && existingPlan.price > 0) {
        return res.status(409).json({
          error: "You already have an active subscription. Use Change Plan to switch plans.",
          code: "ACTIVE_SUBSCRIPTION",
        });
      }
    }

    // Clear abandoned `created` rows so we never stack unpaid subscriptions.
    // Only rows older than 30 minutes are touched: a payment can succeed
    // seconds before its webhook arrives, and cancelling that row here would
    // charge the customer for a subscription we just killed.
    const stale = await prisma.subscription.findMany({
      where: {
        userId: req.userId,
        status: "created",
        createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
    });
    for (const row of stale) {
      if (razorpay && row.razorpaySubscriptionId) {
        try {
          const info = await razorpay.subscriptions.fetch(row.razorpaySubscriptionId);
          // Paid at Razorpay but the webhook never landed. Promote the existing
          // subscription instead of cancelling a paid plan and selling another.
          if (info && (info.status === "authenticated" || info.status === "active")) {
            await promoteSubscription(row.id, {
              status: info.status === "active" ? "active" : "authenticated",
              razorpayCustomerId: info.customer_id || row.razorpayCustomerId,
              currentPeriodStart: info.current_start ? new Date(info.current_start * 1000) : undefined,
              currentPeriodEnd: info.current_end ? new Date(info.current_end * 1000) : undefined,
            });
            return res.status(409).json({
              error: "Your previous payment went through. Your subscription is now active — refresh the billing page.",
              code: "ACTIVE_SUBSCRIPTION",
            });
          }
          if (info && ["cancelled", "completed", "expired"].includes(info.status)) {
            await prisma.subscription.update({
              where: { id: row.id },
              data: { status: "cancelled", cancelledAt: new Date() },
            });
            continue;
          }
          await razorpay.subscriptions.cancel(row.razorpaySubscriptionId);
        } catch (cancelErr: any) {
          // Leave the row as `created` (never entitled) when Razorpay could not
          // confirm the cancellation. Marking it cancelled locally while a live
          // mandate survives is exactly how a "cancelled" user gets charged.
          if (cancelErr?.statusCode !== 400) {
            console.warn(
              "Could not verify stale Razorpay subscription; leaving it for retry:",
              cancelErr?.error?.description || cancelErr?.message || String(cancelErr),
            );
            continue;
          }
        }
      }
      await prisma.subscription.update({ where: { id: row.id }, data: { status: "cancelled", cancelledAt: new Date() } });
    }

    if (plan.price === 0) {
      // Explicit move to Free. ensureFreeSubscription reuses an existing free row.
      const sub = await ensureFreeSubscription(req.userId!);
      return res.json({ subscription: sub, shortUrl: null });
    }

    let razorpayPlanId = plan.razorpayPlanId || await getOrCreateRazorpayPlan(razorpay, plan);

    let rpSub: any;
    const createRp = () =>
      razorpay.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: getSafeTotalCount(plan.interval),
        customer_notify: true,
        notes: { userId: req.userId!, planId: plan.id },
      } as any);
    try {
      rpSub = await createRp();
    } catch (planErr: any) {
      console.warn("Subscription create failed, re-creating plan and retrying:", planErr?.error?.description || planErr?.message || String(planErr));
      await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { razorpayPlanId: null } });
      razorpayPlanId = await getOrCreateRazorpayPlan(razorpay, plan);
      rpSub = await createRp();
    }
    rpSub = rpSub as any;

    // NOTE: status stays `created` and grants NO entitlements until a payment
    // is confirmed (verify-payment or webhook). The plan limits are stored for
    // later, but `created` is excluded from every entitlement check.
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

    if (!signaturesMatch(expected, razorpay_signature as string)) {
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
            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: dbSub.planId } });
            const user = await prisma.user.findUnique({
              where: { id: dbSub.userId },
              select: { name: true, email: true },
            });
            // Grant entitlements only now that money is confirmed, and retire
            // any Free/old row so exactly one plan is in force.
            await promoteSubscription(dbSub.id, {
              status: "authenticated",
              razorpayCustomerId: (payment as any).customer_id || dbSub.razorpayCustomerId,
            });
            if (plan) capturedPlan = { name: plan.name, interval: plan.interval, price: plan.price };
            await recordInvoice({
              subscriptionId: dbSub.id,
              planId: dbSub.planId,
              paymentId: razorpay_payment_id as string,
              amount: Number(payment.amount) || plan?.price || 0,
              status: "captured",
              description: `Initial payment for ${plan?.name || "subscription"}`,
              customerEmail: user?.email ?? null,
              customerName: user?.name ?? null,
            }).catch((e) => console.warn("Callback invoice failed:", e?.message || e));
          }
        }
      } catch (fetchErr: any) {
        console.warn("Could not verify payment status on callback:", fetchErr.message || fetchErr);
      }
    }

    let redirectUrl = `${frontendUrl}/payment/success?payment_id=${razorpay_payment_id}&subscription_id=${razorpay_subscription_id}&signature=${encodeURIComponent(razorpay_signature as string)}`;
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

router.post("/verify-payment", authRequired, async (req: AuthRequest, res: Response) => {
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

    if (!signaturesMatch(expected, signature)) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Ownership: the subscription must belong to the caller. Without this any
    // authenticated user could read another user's invoice (name + email).
    const dbSub = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: subscription_id as string, userId: req.userId },
    });
    if (!dbSub) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const invoiceInclude = {
      subscription: { include: { plan: true, user: { select: { name: true, email: true } } } },
    } as const;

    let invoice = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: payment_id as string },
      include: invoiceInclude,
    });

    if (invoice) {
      return res.json({ verified: true, invoice });
    }

    const razorpay = getRazorpay();
    if (razorpay) {
      try {
        const payment = await razorpay.payments.fetch(payment_id as string);
        if (payment.status === "captured") {
          const plan = await prisma.subscriptionPlan.findUnique({ where: { id: dbSub.planId } });
          const user = await prisma.user.findUnique({
            where: { id: dbSub.userId },
            select: { name: true, email: true },
          });
          // Promote on first confirmation; the helper is idempotent if the
          // webhook already did it. Then create the invoice if it is missing
          // (e.g. the webhook was not delivered).
          if (dbSub.status === "created") {
            await promoteSubscription(dbSub.id, {
              status: "authenticated",
              razorpayCustomerId: (payment as any).customer_id || dbSub.razorpayCustomerId,
            });
          }
          await recordInvoice({
            subscriptionId: dbSub.id,
            planId: dbSub.planId,
            paymentId: payment_id as string,
            amount: Number(payment.amount) || plan?.price || 0,
            status: "captured",
            description: `Initial payment for ${plan?.name || "subscription"}`,
            customerEmail: user?.email ?? null,
            customerName: user?.name ?? null,
          }).catch((e) => console.warn("Verify-payment invoice failed:", e?.message || e));
        }
      } catch (fetchErr: any) {
        console.warn("Could not verify payment status:", fetchErr.message || fetchErr);
      }
    }

    invoice = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: payment_id as string },
      include: invoiceInclude,
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

router.get("/invoice/:paymentId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { razorpayPaymentId: req.params.paymentId as string },
      include: { subscription: { include: { plan: true } } },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    // Only the owning user may read an invoice.
    if (!invoice.subscription || invoice.subscription.userId !== req.userId) {
      return res.status(404).json({ error: "Invoice not found" });
    }
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

    const env = getEnv();
    const plan = invoice.subscription?.plan;
    const user = invoice.subscription?.user;

    // Amounts are integer paise. Treat the collected amount as GST-inclusive so
    // the tax invoice reconciles to what was charged.
    const totalPaise = Number(invoice.amount) || 0;
    const fallbackTax = computeTaxBreakup(totalPaise, env.GST_RATE_PERCENT);
    const taxableAmount = Number(invoice.taxableAmount) || fallbackTax.taxableAmount;
    const taxAmount = Number(invoice.taxAmount) || totalPaise - taxableAmount;
    const cgst = Math.floor(taxAmount / 2);
    const sgst = taxAmount - cgst;

    const inr = (paise: number) =>
      (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Split rate label must follow the configured GST rate, not a hardcoded 9%.
    const halfRate = Number((env.GST_RATE_PERCENT / 2).toFixed(2));
    const date = new Date(invoice.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
    const invNum = invoice.invoiceNumber || invoice.id.slice(-8).toUpperCase();
    const isPaid = invoice.status === "captured" || invoice.status === "paid";
    const badgeText = isPaid ? "Paid" : Invoice_statusLabel(invoice.status);

    // Every user/plan-derived value is escaped before it reaches the template.
    const safe = {
      planName: escapeHtml(plan?.name || "Subscription"),
      planInterval: plan ? ` (${escapeHtml(plan.interval)})` : "",
      paymentId: escapeHtml(invoice.razorpayPaymentId),
      customer: escapeHtml(invoice.customerName || user?.name || "N/A"),
      email: escapeHtml(maskEmail(invoice.customerEmail || user?.email || "")),
      customerGstin: escapeHtml(invoice.customerGstin || ""),
      description: escapeHtml(invoice.description || plan?.name || "Subscription"),
    };

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
  .badge.due { background: #d97706; }
  .status { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; }
  .status-icon { width: 20px; height: 20px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
  .status-text { font-size: 14px; font-weight: 600; color: #065f46; }
  .details { margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f5f5f5; }
  .row:last-child { border-bottom: none; }
  .label { color: #64748b; }
  .value { font-weight: 500; color: #0f172a; text-align: right; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; margin: 24px 0 4px; }
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
        <h1>${escapeHtml(env.COMPANY_LEGAL_NAME)}</h1>
        <p>Tax Invoice / Payment Receipt</p>
      </div>
    </div>
    <span class="badge${isPaid ? "" : " due"}">${badgeText}</span>
  </div>
  <div class="status">
    <span class="status-icon">${isPaid ? "&#10003;" : "!"}</span>
    <span class="status-text">${isPaid ? "Payment Successful" : "Payment " + badgeText}</span>
  </div>
  <div class="section-title">Invoice</div>
  <div class="details">
    <div class="row"><span class="label">Invoice Number</span><span class="value">${escapeHtml(invNum)}</span></div>
    <div class="row"><span class="label">Date</span><span class="value">${escapeHtml(date)}</span></div>
    <div class="row"><span class="label">Description</span><span class="value">${safe.description}</span></div>
    ${invoice.kind === "topup" ? "" : `<div class="row"><span class="label">Plan</span><span class="value">${safe.planName}${safe.planInterval}</span></div>`}
    <div class="row"><span class="label">Payment ID</span><span class="value" style="font-size:12px">${safe.paymentId}</span></div>
  </div>
  <div class="section-title">Billed To</div>
  <div class="details">
    <div class="row"><span class="label">Customer</span><span class="value">${safe.customer}</span></div>
    <div class="row"><span class="label">Email</span><span class="value">${safe.email}</span></div>
    ${safe.customerGstin ? `<div class="row"><span class="label">GSTIN</span><span class="value">${safe.customerGstin}</span></div>` : ""}
  </div>
  <div class="section-title">Tax Details</div>
  <div class="details">
    <div class="row"><span class="label">Taxable Value</span><span class="value">&#8377; ${inr(taxableAmount)}</span></div>
    ${taxAmount > 0 ? `<div class="row"><span class="label">CGST (${halfRate}%)</span><span class="value">&#8377; ${inr(cgst)}</span></div>
    <div class="row"><span class="label">SGST (${halfRate}%)</span><span class="value">&#8377; ${inr(sgst)}</span></div>` : ""}
    ${env.COMPANY_GSTIN ? `<div class="row"><span class="label">Supplier GSTIN</span><span class="value">${escapeHtml(env.COMPANY_GSTIN)}</span></div>` : ""}
    <div class="row"><span class="label">SAC</span><span class="value">${escapeHtml(env.COMPANY_SAC)}</span></div>
    ${env.COMPANY_STATE ? `<div class="row"><span class="label">Place of Supply</span><span class="value">${escapeHtml(env.COMPANY_STATE)}</span></div>` : ""}
    ${Number(invoice.refundedAmount) > 0 ? `<div class="row"><span class="label">Refunded</span><span class="value">&#8377; ${inr(Number(invoice.refundedAmount))}</span></div>` : ""}
  </div>
  <div class="total-row"><span>Total ${isPaid ? "Paid" : "Due"}</span><span>&#8377; ${inr(totalPaise)}</span></div>
  <div class="footer">
    <p>${escapeHtml(env.COMPANY_LEGAL_NAME)}${env.COMPANY_ADDRESS ? " &middot; " + escapeHtml(env.COMPANY_ADDRESS) : ""}</p>
    <p>support@beyondvyu.com</p>
    <p>This is a computer-generated tax invoice.</p>
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
    // A user can have more than one abandoned checkout row (they clicked
    // subscribe again). Handle every one, deterministically, instead of
    // cancelling an arbitrary `findFirst` row.
    const pendingSubs = await prisma.subscription.findMany({
      where: { userId: req.userId, status: "created" },
    });
    if (pendingSubs.length === 0) return res.json({ success: true });

    const razorpay = getRazorpay();
    let kept = 0;

    for (const sub of pendingSubs) {
      let safeToCancelLocally = true;

      if (razorpay && sub.razorpaySubscriptionId) {
        safeToCancelLocally = false;
        try {
          const rpSubInfo = await razorpay.subscriptions.fetch(sub.razorpaySubscriptionId);
          // The customer may have paid a moment before dismissing the checkout.
          // Never cancel a subscription Razorpay has already authenticated —
          // verify-payment / the webhook will promote it.
          if (rpSubInfo && (rpSubInfo.status === "authenticated" || rpSubInfo.status === "active")) {
            kept += 1;
            continue;
          }
          const cancellableStatuses = ["paused", "pending", "created"];
          if (rpSubInfo && cancellableStatuses.includes(rpSubInfo.status)) {
            await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
          }
          safeToCancelLocally = true;
        } catch (cancelErr: any) {
          // 400 = already cancelled / not found at Razorpay → nothing can charge.
          // Anything else (auth, network, 5xx) must keep the row retryable: never
          // tell the customer "cancelled" while a mandate may still be alive.
          if (cancelErr?.statusCode === 400) {
            safeToCancelLocally = true;
          } else {
            console.warn(
              "Failed to cancel pending Razorpay subscription; keeping it for retry:",
              cancelErr?.error?.description || cancelErr?.message || String(cancelErr),
            );
          }
        }
      }

      if (!safeToCancelLocally) continue;

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
    }

    // Never strand a user without a plan: fall back to Free. If a payment was
    // actually authenticated, it remains entitled and this is a no-op.
    await ensureFreeSubscription(req.userId!);

    res.json({ success: true, pending: kept > 0 });
  } catch (err) {
    console.error("Cancel pending error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/update-subscription", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = z.object({ planId: z.string() }).parse(req.body);

    const currentSub = await loadEntitledSubscription(req.userId!, { include: { plan: true } });
    if (!currentSub) return res.status(404).json({ error: "No active subscription" });

    const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!newPlan || !newPlan.active) return res.status(404).json({ error: "Plan not found" });
    // Same per-user visibility restriction enforced at checkout.
    if (!(await isPlanVisibleToUser(req.userId!, newPlan))) {
      return res.status(403).json({ error: "This plan is not available for your account." });
    }
    if (newPlan.id === currentSub.planId) return res.status(400).json({ error: "Already on this plan" });
    if (newPlan.price === 0) return res.status(400).json({ error: "Cannot switch to the free plan. Use cancel instead." });
    if (currentSub.cancelledAt) {
      return res.status(400).json({
        error: `Your subscription is set to cancel on ${currentSub.currentPeriodEnd?.toLocaleDateString() || "the period end"}. Choose a new plan after it ends, or contact support if you need to change it now.`,
        code: "SUBSCRIPTION_CANCELLING",
      });
    }

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({ error: "Payments are not available right now. Please try again later." });
    }
    if (!currentSub.razorpaySubscriptionId) {
      return res.status(400).json({
        error: "This plan can't be changed automatically. Please cancel and subscribe to the new plan.",
        code: "SUBSCRIBE_REQUIRED",
      });
    }

    // Compare *monthly-equivalent* prices so a ₹1,200/year plan is correctly
    // seen as ₹100/month rather than misclassified by raw price.
    const currentMonthly = monthlyEquivalentPaise(currentSub.plan.price, currentSub.plan.interval);
    const newMonthly = monthlyEquivalentPaise(newPlan.price, newPlan.interval);
    const isUpgrade = newMonthly >= currentMonthly;

    if (!isUpgrade) {
      const businessCount = await prisma.business.count({ where: { userId: req.userId } });
      if (businessCount > newPlan.businessLimit) {
        return res.status(400).json({
          error: `You have ${businessCount} businesses but the ${newPlan.name} plan only allows ${newPlan.businessLimit}. Please delete ${businessCount - newPlan.businessLimit} business(es) first to downgrade.`,
        });
      }
    }

    /** Update the Razorpay subscription, retrying once with a fresh plan. */
    const syncRazorpayPlan = async (scheduleAtCycleEnd: boolean) => {
      const doUpdate = (pid: string) =>
        razorpay.subscriptions.update(
          currentSub.razorpaySubscriptionId!,
          (scheduleAtCycleEnd ? { plan_id: pid, schedule_change_at: "cycle_end" } : { plan_id: pid }) as any,
        );
      try {
        const pid = newPlan.razorpayPlanId || (await getOrCreateRazorpayPlan(razorpay, newPlan));
        await doUpdate(pid);
        return true;
      } catch (firstErr: any) {
        console.warn("Razorpay plan update failed; retrying with a fresh plan:", firstErr?.error?.description || firstErr?.message || String(firstErr));
        await prisma.subscriptionPlan.update({ where: { id: newPlan.id }, data: { razorpayPlanId: null } });
        try {
          const freshId = await getOrCreateRazorpayPlan(razorpay, newPlan);
          await doUpdate(freshId);
          return true;
        } catch (secondErr: any) {
          console.warn("Razorpay plan update retry failed:", secondErr?.error?.description || secondErr?.message || String(secondErr));
          return false;
        }
      }
    };

    if (isUpgrade) {
      const synced = await syncRazorpayPlan(false);
      if (!synced) {
        // No DB mutation happened — never desync DB entitlements from billing.
        return res.status(502).json({
          error: "We couldn't update your plan with the payment provider, so nothing was changed and you have not been charged. Please try again or contact support.",
          code: "GATEWAY_UPDATE_FAILED",
        });
      }

      const subscription = await prisma.subscription.update({
        where: { id: currentSub.id },
        data: {
          planId: newPlan.id,
          creditsLimit: newPlan.creditsLimit,
          businessLimit: newPlan.businessLimit,
          pendingPlanId: null,
          scheduledChangeAt: null,
        },
        include: { plan: true },
      });

      return res.json({
        subscription,
        upgrade: true,
        immediate: true,
        message: `Upgraded to ${newPlan.name}. Any prorated difference will be charged by the payment provider.`,
      });
    }

    // Downgrade: schedule at cycle end. If Razorpay can't be updated (e.g. UPI
    // mandates are immutable), refuse rather than silently keeping the DB and
    // the mandate on different plans (which overcharges the customer).
    const synced = await syncRazorpayPlan(true);
    if (!synced) {
      return res.status(502).json({
        error: "We couldn't schedule this change with the payment provider, so nothing was changed. If you're paying by UPI Autopay, cancel and subscribe to the new plan instead. You have not been charged.",
        code: "GATEWAY_UPDATE_FAILED",
      });
    }

    const scheduledChangeAt = currentSub.currentPeriodEnd || new Date(Date.now() + 30 * 86400000);
    const subscription = await prisma.subscription.update({
      where: { id: currentSub.id },
      data: { pendingPlanId: newPlan.id, scheduledChangeAt },
    });

    return res.json({
      subscription,
      upgrade: false,
      immediate: false,
      scheduledDate: scheduledChangeAt.toISOString(),
      razorpaySynced: true,
      message: `Downgrade to ${newPlan.name} scheduled for the end of your current billing period (${scheduledChangeAt.toLocaleDateString()}).`,
    });
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
    const sub = await loadEntitledSubscription(req.userId!, { include: { plan: true } });
    if (!sub) return res.status(404).json({ error: "No active subscription" });

    if (sub.plan.price === 0) {
      return res.status(400).json({ error: "You're on the Free plan — there's nothing to cancel.", code: "FREE_PLAN" });
    }

    // NOTE: Do not block cancellation because the account is over the Free
    // business limit. Trapping a customer in a paid plan is a dark pattern
    // (and contrary to easy-cancellation requirements). Existing businesses
    // keep working; the Free limit only prevents creating more.
    const razorpay = getRazorpay();
    if (!razorpay || !sub.razorpaySubscriptionId) {
      return res.status(503).json({ error: "Payments are not available right now. Please try again later or contact support." });
    }

    // The refund window is measured from the most recent charge, not from when
    // the subscription row was created (which could be months earlier).
    const lastInvoice = await prisma.invoice.findFirst({
      where: { subscriptionId: sub.id, status: { in: ["captured", "paid"] }, kind: "subscription" },
      orderBy: { createdAt: "desc" },
    });
    const windowStart = lastInvoice ? new Date(lastInvoice.createdAt) : new Date(sub.createdAt);
    const daysSinceCharge = (Date.now() - windowStart.getTime()) / 86400000;
    const isRefundEligible = daysSinceCharge <= 7 && !!lastInvoice?.razorpayPaymentId;

    if (isRefundEligible && lastInvoice) {
      // 1) Stop the recurring mandate first so no further charge can occur.
      try {
        await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId);
      } catch (cancelErr: any) {
        console.warn("Failed to cancel Razorpay subscription:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
        return res.status(502).json({
          error: "We couldn't cancel your subscription with the payment provider, so nothing was changed. Please try again or contact support.",
          code: "CANCEL_FAILED",
        });
      }

      // 2) Refund the most recent charge (never the oldest).
      const refundable = Math.max(0, lastInvoice.amount - (lastInvoice.refundedAmount || 0));
      try {
        if (refundable > 0) {
          await razorpay.payments.refund(lastInvoice.razorpayPaymentId!, { amount: refundable });
        }
        await prisma.invoice.update({
          where: { id: lastInvoice.id },
          data: { status: "refunded", refundedAmount: lastInvoice.amount },
        });
      } catch (refundErr: any) {
        console.warn("Refund failed:", refundErr?.error?.description || refundErr?.message || String(refundErr));
        // Mandate is already cancelled, so downgrade now and be honest about the refund.
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: "cancelled", cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
        });
        await ensureFreeSubscription(req.userId!);
        return res.status(502).json({
          error: "Your subscription was cancelled, but the refund couldn't be processed automatically. Please contact support and we'll refund you right away.",
          code: "REFUND_FAILED",
        });
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "cancelled", cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
      });
      await cancelOtherEntitledSubscriptions(req.userId!, sub.id);
      await ensureFreeSubscription(req.userId!);
      return res.json({ success: true, refunded: true, message: "Subscription cancelled and fully refunded." });
    }

    // Past the refund window: cancel at cycle end, keep access until then.
    try {
      await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, 1);
    } catch (cancelErr: any) {
      console.warn("Failed to schedule Razorpay cancellation:", cancelErr?.error?.description || cancelErr?.message || String(cancelErr));
      return res.status(502).json({
        error: "We couldn't schedule your cancellation with the payment provider, so nothing was changed. Please try again or contact support.",
        code: "CANCEL_FAILED",
      });
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
    });

    return res.json({
      success: true,
      refunded: false,
      message: `Subscription will remain active until ${sub.currentPeriodEnd?.toLocaleDateString() || "the end of the billing period"}, then move to Free. No refund is due outside the 7-day window.`,
    });
  } catch (err) {
    console.error("Cancel subscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Credit Top-Up Endpoints ──────────────────────────────────────────────

router.get("/credit-packs", (_req, res: Response) => {
  res.json({ packs: getCreditPacks() });
});

/**
 * Issue the GST invoice for a paid credit top-up. Keyed by Razorpay payment id,
 * so the callback, the webhook and retries collapse into one invoice. Skipped
 * when the event carried no payment id (e.g. `payment_link.paid` without an
 * expanded payment entity) — the later `payment.captured` event heals it.
 */
async function issueTopUpInvoice(
  topUp: { subscriptionId: string; credits: number; amount: number },
  paymentId: string | null,
  amount?: number,
) {
  if (!paymentId) return;
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: topUp.subscriptionId },
      select: { user: { select: { name: true, email: true } } },
    });
    await recordInvoice({
      subscriptionId: topUp.subscriptionId,
      planId: null,
      paymentId,
      amount: amount || topUp.amount,
      status: "captured",
      kind: "topup",
      description: `${topUp.credits.toLocaleString("en-IN")} AI credits top-up`,
      customerEmail: sub?.user?.email ?? null,
      customerName: sub?.user?.name ?? null,
    });
  } catch (e) {
    console.warn("Top-up invoice failed:", e instanceof Error ? e.message : String(e));
  }
}

/**
 * Idempotently apply a paid credit top-up. Matches the pending row by payment
 * link id / reference id / payment id, then credits the subscription exactly
 * once (guarded by a conditional `updateMany` on `status: "pending"`).
 */
async function creditTopUpFromPayment(input: {
  paymentId?: string | null;
  paymentLinkId?: string | null;
  referenceId?: string | null;
  subscriptionId?: string | null;
  credits?: number;
  amount?: number;
  type?: string;
}): Promise<{ ok: boolean; credits?: number; reason?: string }> {
  const or: any[] = [];
  if (input.referenceId) or.push({ referenceId: input.referenceId });
  if (input.paymentLinkId) or.push({ razorpayPaymentLinkId: input.paymentLinkId });
  if (input.paymentId) or.push({ razorpayPaymentId: input.paymentId });

  let topUp = or.length
    ? await prisma.creditTopUp.findFirst({ where: { OR: or }, orderBy: { createdAt: "desc" } })
    : null;

  // Webhook fallback: recover a row purely from signed notes.
  if (!topUp && input.subscriptionId && input.credits && input.credits > 0) {
    topUp = await prisma.creditTopUp.create({
      data: {
        subscriptionId: input.subscriptionId,
        credits: input.credits,
        amount: input.amount || priceForCredits(input.credits),
        status: "pending",
        type: input.type || "auto_recharge",
        referenceId: input.referenceId || null,
        razorpayPaymentLinkId: input.paymentLinkId || null,
      },
    });
  }
  if (!topUp) return { ok: false, reason: "not_found" };

  const alreadyCaptured = topUp.status === "captured";

  if (!alreadyCaptured) {
    const applied = await prisma.$transaction(async (tx) => {
      const claimed = await tx.creditTopUp.updateMany({
        where: { id: topUp!.id, status: "pending" },
        data: { status: "captured", razorpayPaymentId: input.paymentId || topUp!.razorpayPaymentId },
      });
      if (claimed.count === 0) return false;
      await tx.subscription.update({
        where: { id: topUp!.subscriptionId },
        data: { creditsTopUpBalance: { increment: topUp!.credits } },
      });
      return true;
    });

    if (!applied) return { ok: false, reason: "already_processed" };
  }

  // Issue the tax invoice on both the first claim and any retry that finds the
  // credits already granted (self-heals a crash between the two steps).
  await issueTopUpInvoice(topUp, input.paymentId || topUp.razorpayPaymentId, input.amount);

  return { ok: true, credits: topUp.credits };
}

router.post("/create-top-up", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { credits } = z.object({ credits: z.number().int().min(1).max(100000) }).parse(req.body);
    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(503).json({ error: "Payments are not available right now." });
    }

    let sub = await loadEntitledSubscription(req.userId!);
    if (!sub) sub = await ensureFreeSubscription(req.userId!);
    if (!sub) return res.status(404).json({ error: "No active subscription" });

    const amount = priceForCredits(credits);
    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: "Minimum top-up is ₹1." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true },
    });

    const env = getEnv();
    const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";

    // Create the pending row first so its id can be the payment-link reference.
    // The reference is stored in the same INSERT (not patched afterwards) so a
    // payment that lands immediately can never create a duplicate fallback row.
    const topUpId = crypto.randomUUID();
    const topUp = await prisma.creditTopUp.create({
      data: {
        id: topUpId,
        subscriptionId: sub.id,
        credits,
        amount,
        status: "pending",
        type: "manual",
        referenceId: topUpId,
      },
    });

    let link: any;
    try {
      link = await razorpay.paymentLink.create({
        amount,
        currency: "INR",
        description: `${credits} Credits Top-Up`,
        ...(user?.email ? { customer: { email: user.email } } : {}),
        notify: { email: true, sms: false },
        reference_id: topUp.id,
        notes: {
          subscriptionId: sub.id,
          credits: String(credits),
          type: "credit_topup",
          topUpId: topUp.id,
        },
        callback_url: `${frontendUrl}/api/payments/top-up-callback`,
        callback_method: "get",
      } as any);
    } catch (linkErr: any) {
      await prisma.creditTopUp.delete({ where: { id: topUp.id } }).catch(() => {});
      console.warn("Payment link create failed:", linkErr?.error?.description || linkErr?.message || String(linkErr));
      return res.status(502).json({ error: "We couldn't start the payment. Please try again or contact support." });
    }

    if (!link?.short_url) {
      await prisma.creditTopUp.delete({ where: { id: topUp.id } }).catch(() => {});
      return res.status(500).json({ error: "Failed to create payment link" });
    }

    await prisma.creditTopUp.update({
      where: { id: topUp.id },
      data: { razorpayPaymentLinkId: link.id },
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
  const env = getEnv();
  const frontendUrl = env.FRONTEND_URL.split(",")[0].trim() || "http://localhost:3000";
  try {
    const {
      razorpay_payment_id,
      razorpay_payment_link_id,
      razorpay_payment_link_reference_id,
      razorpay_payment_link_status,
      razorpay_signature,
    } = req.query as Record<string, string | undefined>;

    if (!razorpay_payment_id || !razorpay_payment_link_id || !razorpay_signature) {
      return res.redirect(`${frontendUrl}/dashboard/billing?topup=error&reason=missing_params`);
    }
    if (!env.RAZORPAY_KEY_SECRET) {
      return res.redirect(`${frontendUrl}/dashboard/billing?topup=error&reason=gateway_not_configured`);
    }

    // Payment-link signature formula:
    // payment_link_id|reference_id|status|payment_id (Razorpay docs).
    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
      .update(
        `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id || ""}|${razorpay_payment_link_status || ""}|${razorpay_payment_id}`,
      )
      .digest("hex");
    if (!signaturesMatch(expected, razorpay_signature)) {
      console.error("Top-up callback signature mismatch");
      return res.redirect(`${frontendUrl}/dashboard/billing?topup=error&reason=invalid_signature`);
    }

    if (razorpay_payment_link_status && razorpay_payment_link_status !== "paid") {
      return res.redirect(`${frontendUrl}/dashboard/billing?topup=error&reason=not_paid`);
    }

    const result = await creditTopUpFromPayment({
      paymentId: razorpay_payment_id,
      paymentLinkId: razorpay_payment_link_id,
      referenceId: razorpay_payment_link_reference_id || null,
      type: "manual",
    });

    if (result.ok) {
      return res.redirect(`${frontendUrl}/dashboard/billing?topup=success&credits=${result.credits ?? ""}`);
    }
    return res.redirect(`${frontendUrl}/dashboard/billing?topup=error&reason=${result.reason || "not_found"}`);
  } catch (err) {
    console.error("Top-up callback error:", err);
    return res.redirect(`${frontendUrl}/dashboard/billing?topup=error`);
  }
});

/**
 * Apply a Razorpay payment-link / payment event to the credit ledger. Exported
 * so the *main* subscription webhook can also process top-up events: Razorpay
 * may be configured with a single webhook URL, and payment links do not carry a
 * subscription entity. Both endpoints verify the same signature and the ledger
 * write is idempotent, so duplicate delivery cannot double-credit.
 */
export async function applyTopUpEvent(event: any): Promise<void> {
  if (event?.event !== "payment_link.paid" && event?.event !== "payment.captured") return;

  const paymentLink = event.payload?.payment_link?.entity;
  const paymentEntity = event.payload?.payment?.entity;
  const notes = paymentLink?.notes || paymentEntity?.notes || {};
  const credits = parseInt(notes.credits || "0", 10);
  const subscriptionId = notes.subscriptionId || null;
  const paymentId = paymentEntity?.id || null;
  const paymentLinkId = paymentLink?.id || notes.paymentLinkId || null;
  const referenceId = paymentLink?.reference_id || notes.topUpId || null;

  if (credits > 0 && (subscriptionId || referenceId || paymentLinkId)) {
    await creditTopUpFromPayment({
      paymentId,
      paymentLinkId,
      referenceId,
      subscriptionId,
      credits,
      amount: paymentEntity?.amount || paymentLink?.amount,
      type: notes.type === "auto_recharge" ? "auto_recharge" : "manual",
    });
  }
}

/**
 * Razorpay payment-link webhook. Registered in `index.ts` with
 * `express.raw()` *before* the JSON body parser, because the HMAC must be
 * computed over the exact raw bytes. Verification is mandatory (fail closed):
 * the previous implementation skipped it entirely when the signature header
 * was absent, letting anyone forge a paid event and mint credits.
 */
export async function handleTopUpWebhook(req: Request, res: Response) {
  try {
    const env = getEnv();
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"] as string | undefined;

    const raw = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}), "utf8");

    if (!secret) {
      console.error("Top-up webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured");
      return res.status(503).json({ status: "error", message: "Webhook not configured" });
    }

    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!signaturesMatch(expected, signature)) {
      return res.status(400).json({ status: "error", message: "Invalid signature" });
    }

    let event: any;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      return res.status(400).json({ status: "error", message: "Invalid JSON" });
    }

    await applyTopUpEvent(event);
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Top-up webhook error:", err);
    res.status(500).json({ status: "error" });
  }
}

router.get("/credit-balance", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    let sub = await loadEntitledSubscription(req.userId!);
    if (!sub) sub = await ensureFreeSubscription(req.userId!);
    if (!sub) {
      return res.json({ balance: null });
    }

    // Persist the monthly reset here too, so the balance the customer sees is
    // the balance the metering middleware will enforce (idempotent + race-safe).
    sub = await resetMonthlyCreditsIfDue(sub);

    res.json({
      balance: {
        creditsUsed: sub.creditsUsed,
        creditsLimit: sub.creditsLimit,
        creditsTopUpBalance: sub.creditsTopUpBalance,
        creditsLastResetAt: sub.creditsLastResetAt,
        monthlyRemaining: Math.max(0, sub.creditsLimit - sub.creditsUsed),
        totalRemaining: Math.max(0, sub.creditsLimit - sub.creditsUsed) + sub.creditsTopUpBalance,
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
      threshold: z.number().int().min(5).max(500).optional(),
      amount: z.number().int().min(50).max(10000).optional(),
    }).parse(req.body);

    const sub = await loadEntitledSubscription(req.userId!);
    if (!sub) return res.status(404).json({ error: "No active subscription" });

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        autoRechargeEnabled: data.enabled,
        // Only change the parameters when supplied, so toggling Off doesn't
        // silently reset a custom threshold/amount back to defaults.
        ...(data.threshold !== undefined ? { autoRechargeThreshold: data.threshold } : {}),
        ...(data.amount !== undefined ? { autoRechargeAmount: data.amount } : {}),
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
