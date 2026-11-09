import express from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import { loadEnv } from "./config/env";
import { prisma } from "./config/database";
import { apiLimiter } from "./middleware/rate-limit";
import { sanitizeInput } from "./middleware/sanitize";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import businessRoutes from "./routes/businesses";
import feedbackRoutes from "./routes/feedback";
import reviewRoutes from "./routes/reviews";
import qrRoutes from "./routes/qr";
import aiRoutes from "./routes/ai";
import activityRoutes from "./routes/activity";
import communicationRoutes from "./routes/communications";
import googleReviewsRoutes from "./routes/google-reviews";
import googlePlacesRoutes from "./routes/google-places";
import uploadRoutes from "./routes/upload";
import paymentsRoutes, { handleTopUpWebhook, applyTopUpEvent, recordInvoice } from "./routes/payments";
import { promoteSubscription, ensureFreeSubscription } from "./services/subscriptions";
import adminRoutes from "./routes/admin";
import adminAnalyticsRoutes from "./routes/admin-analytics";
import consentRoutes from "./routes/consent";
import aiVisibilityRoutes from "./routes/ai-visibility";
import v2Features from "./features/index";

const env = loadEnv();

const app = express();

app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://apis.google.com", "https://static.cloudflareinsights.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.razorpay.com"],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://generativelanguage.googleapis.com",
        "https://oauth2.googleapis.com",
        "https://mybusinessaccountmanagement.googleapis.com",
      ],
      fontSrc: ["'self'"],
      frameSrc: ["https://api.razorpay.com", "https://*.razorpay.com"],
      frameAncestors: ["'none'"],
      formAction: ["'self'", "https://api.razorpay.com", "https://*.razorpay.com"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: { policy: "require-corp" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  originAgentCluster: true,
}));
// PCI DSS v4.0.1 Requirement 11.6.1: Change/tamper detection for payment pages
// Implemented via CSP report-to directive — violations are logged for review.
// Requirement 6.4.3: Script inventory maintained at client/app/dashboard/billing/page.tsx
//   - lucide-react: UI icons (necessary for page rendering)
//   - next/navigation: Next.js router (necessary for page navigation)
//   - @/components/ui/*: UI component library (necessary for layout)
//   - @/lib/api: API client (necessary for data fetching)
//   - @/lib/auth-context: Auth context (necessary for user session)
//   - @/lib/utils: Utility functions (necessary for className merging)

const allowedOrigins: string[] = [
  ...env.FRONTEND_URL.split(",").map((o) => o.trim()).filter(Boolean),
  "http://localhost:3000",
  "http://localhost:3001",
  "https://review-nine-inky.vercel.app",
  "https://review-ewye.onrender.com",
  "https://beyondvyu.com",
  "https://www.beyondvyu.com",
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  exposedHeaders: ["Content-Length", "X-Requested-With"],
  maxAge: 86400,
}));

app.options("*", cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  maxAge: 86400,
}));
// Raw body parser for Razorpay webhook (must be before express.json to receive raw body)
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const env = loadEnv();
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const body = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);

    // Fail closed: whenever a secret is configured, the signature is required.
    // In production the secret itself is required.
    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      if (env.NODE_ENV === "production") {
        console.error("Webhook rejected: RAZORPAY_WEBHOOK_SECRET is not configured");
        return res.status(503).json({ error: "Webhook not configured" });
      }
      console.warn("RAZORPAY_WEBHOOK_SECRET not set — signature check skipped (development only)");
    } else {
      if (!signature) {
        return res.status(400).json({ error: "Missing webhook signature" });
      }
      const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(signature, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        console.error("Webhook signature mismatch");
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = JSON.parse(body);
    const razorpaySub = event.payload?.subscription?.entity;

    // Payment-link / top-up events carry no subscription entity. Handle them
    // here too: Razorpay may be configured with only this webhook URL, and
    // without this a customer who pays a top-up but closes the tab before the
    // redirect would never receive credits. Idempotent on both sides.
    if (!razorpaySub) {
      if (event.event === "payment_link.paid" || event.event === "payment.captured") {
        await applyTopUpEvent(event).catch((e) => console.error("Top-up event handling failed:", e));
      }
      // A late `payment.captured` upgrades an invoice we first saw as
      // authorized. Only touch `created` rows so a refunded invoice can never
      // be flipped back to captured by a replayed webhook.
      if (event.event === "payment.captured") {
        const capturedId = event.payload?.payment?.entity?.id;
        if (capturedId) {
          await prisma.invoice
            .updateMany({
              where: { razorpayPaymentId: capturedId, status: "created" },
              data: { status: "captured" },
            })
            .catch((e) => console.error("Failed to mark invoice captured:", e));
        }
      }
      return res.json({ status: "skipped" });
    }

    const dbSub = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: razorpaySub.id },
      include: { plan: { select: { name: true } } },
    });
    if (!dbSub) return res.json({ status: "not_found" });
    if (dbSub.status === "cancelled") {
      // A charge after the local cancellation means the user paid for a plan we
      // do not grant. Never promote (that would ignore their cancellation), but
      // record the payment so finance can refund/reconcile it.
      if (event.event === "subscription.charged") {
        const strayPayment = event.payload?.payment?.entity;
        console.error(
          `Razorpay charged a locally-cancelled subscription ${dbSub.id} (rzp ${razorpaySub.id}, payment ${strayPayment?.id ?? "unknown"}) — refund/reconciliation required`,
        );
        if (strayPayment?.id && (strayPayment.status === "captured" || strayPayment.captured === "1")) {
          await recordInvoice({
            subscriptionId: dbSub.id,
            planId: dbSub.planId,
            paymentId: strayPayment.id,
            amount: strayPayment.amount || 0,
            status: "captured",
            description: "Charge received after cancellation (needs refund)",
            customerEmail: null,
            customerName: null,
          }).catch((e) => console.error("Failed to record post-cancellation charge:", e));
        }
      }
      return res.json({ status: "skipped_cancelled" });
    }

    switch (event.event) {
      case "subscription.authenticated": {
        // First payment authorization succeeded (mandate registered). Promote
        // and retire any Free/old row so exactly one plan is in force.
        await promoteSubscription(dbSub.id, {
          status: "authenticated",
          razorpayCustomerId: razorpaySub.customer_id || dbSub.razorpayCustomerId,
        });
        break;
      }
      case "subscription.activated": {
        // Billing cycle started - subscription is now active
        const authPayment = event.payload?.payment?.entity;
        await promoteSubscription(dbSub.id, {
          status: "active",
          currentPeriodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : undefined,
          currentPeriodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : undefined,
        });
        // Create invoice for the authentication payment if present (idempotent
        // by Razorpay payment id).
        if (authPayment && authPayment.id && (authPayment.status === "captured" || authPayment.captured === "1")) {
          const customer = await prisma.user.findUnique({
            where: { id: dbSub.userId },
            select: { name: true, email: true },
          });
          await recordInvoice({
            subscriptionId: dbSub.id,
            planId: dbSub.planId,
            paymentId: authPayment.id,
            amount: authPayment.amount || 0,
            status: "captured",
            description: `Initial payment for ${dbSub.plan?.name || razorpaySub.plan_id || "subscription"}`,
            periodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : null,
            periodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : null,
            customerEmail: customer?.email ?? null,
            customerName: customer?.name ?? null,
          }).catch((e) => console.error("Failed to create invoice record:", e));
        }
        break;
      }
      case "subscription.charged": {
        // Recurring charge succeeded - update period and create invoice
        const payment = event.payload?.payment?.entity;

        // If the user already scheduled cancellation, a charge means Razorpay
        // and our local state disagree. Never clear the cancellation (that
        // would silently re-enable auto-renewal); record it for reconciliation.
        if (dbSub.cancelledAt) {
          console.error(
            `Razorpay charged subscription ${dbSub.id} after cancellation was scheduled (rzp ${razorpaySub.id}, payment ${payment?.id ?? "unknown"}) — refund/reconciliation required`,
          );
          if (payment?.id && (payment.status === "captured" || payment.captured === "1")) {
            await recordInvoice({
              subscriptionId: dbSub.id,
              planId: dbSub.planId,
              paymentId: payment.id,
              amount: payment.amount || 0,
              status: "captured",
              description: "Charge received after cancellation was scheduled (needs review)",
              customerEmail: null,
              customerName: null,
            }).catch((e) => console.error("Failed to record post-cancellation charge:", e));
          }
          break;
        }

        await promoteSubscription(dbSub.id, {
          status: "active",
          currentPeriodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : undefined,
          currentPeriodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : undefined,
        });
        if (payment && payment.id) {
          const customer = await prisma.user.findUnique({
            where: { id: dbSub.userId },
            select: { name: true, email: true },
          });
          // A scheduled downgrade takes effect with this charge. The GST
          // invoice must name the plan the customer actually paid for, not the
          // one that is about to be replaced.
          const chargedPlan =
            dbSub.pendingPlanId && dbSub.pendingPlanId !== dbSub.planId
              ? await prisma.subscriptionPlan.findUnique({
                  where: { id: dbSub.pendingPlanId },
                  select: { id: true, name: true },
                })
              : null;
          await recordInvoice({
            subscriptionId: dbSub.id,
            planId: chargedPlan?.id ?? dbSub.planId,
            paymentId: payment.id,
            amount: payment.amount || 0,
            status: payment.status === "captured" || payment.captured === "1" ? "captured" : "created",
            description: `Recurring charge for ${chargedPlan?.name || dbSub.plan?.name || "subscription"}`,
            periodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : null,
            periodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : null,
            customerEmail: customer?.email ?? null,
            customerName: customer?.name ?? null,
          }).catch((invoiceErr) => console.error("Failed to create invoice record:", invoiceErr));
        }
        // Apply pending plan change (downgrade scheduled at cycle end)
        if (dbSub.pendingPlanId && dbSub.pendingPlanId !== dbSub.planId) {
          try {
            const pendingPlan = await prisma.subscriptionPlan.findUnique({ where: { id: dbSub.pendingPlanId } });
            if (pendingPlan) {
              await prisma.subscription.update({
                where: { id: dbSub.id },
                data: {
                  planId: pendingPlan.id,
                  creditsLimit: pendingPlan.creditsLimit,
                  businessLimit: pendingPlan.businessLimit,
                  creditsUsed: 0,
                  creditsLastResetAt: new Date(),
                  pendingPlanId: null,
                  scheduledChangeAt: null,
                },
              });
              console.log(`Applied pending plan change for sub ${dbSub.id}: ${dbSub.planId} -> ${pendingPlan.id}`);
            }
          } catch (pendingErr) {
            console.error("Failed to apply pending plan change:", pendingErr);
          }
        }
        break;
      }
      case "subscription.cancelled": {
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "cancelled", cancelledAt: new Date(), pendingPlanId: null, scheduledChangeAt: null },
        });
        // Idempotent: reuses an existing Free row instead of stacking duplicates.
        await ensureFreeSubscription(dbSub.userId);
        break;
      }
      case "subscription.completed": {
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "completed", cancelledAt: new Date() },
        });
        // Downgrade to free plan when subscription completes
        await ensureFreeSubscription(dbSub.userId);
        break;
      }
      case "subscription.pending": {
        // Payment failed - Razorpay will auto-retry. Mark as paused in our system
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "past_due" },
        });
        break;
      }
      case "subscription.halted": {
        // All retries exhausted - mark as halted, then fall back to Free so the
        // user still has a usable plan instead of being locked out entirely.
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "halted" },
        });
        await ensureFreeSubscription(dbSub.userId);
        break;
      }
      case "subscription.paused": {
        // User manually paused from dashboard
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "paused" },
        });
        await ensureFreeSubscription(dbSub.userId);
        break;
      }
      case "subscription.resumed": {
        // User manually resumed from dashboard. Razorpay shifts the billing
        // dates forward while paused, so take the fresh period from the event.
        await promoteSubscription(dbSub.id, {
          status: "active",
          cancelledAt: null,
          currentPeriodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : undefined,
          currentPeriodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : undefined,
        });
        break;
      }
      case "subscription.updated": {
        // Plan/quantity changed. Update the period and, if the cycle rolled
        // over, apply a scheduled downgrade.
        const newStart = razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : null;
        const newEnd = razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : null;
        const advanced =
          !!newStart &&
          !!dbSub.currentPeriodStart &&
          newStart.getTime() > new Date(dbSub.currentPeriodStart).getTime();

        if (razorpaySub.status === "active") {
          await promoteSubscription(dbSub.id, {
            status: "active",
            currentPeriodStart: newStart ?? undefined,
            currentPeriodEnd: newEnd ?? undefined,
          });
        } else {
          await prisma.subscription.update({
            where: { id: dbSub.id },
            data: { currentPeriodStart: newStart ?? undefined, currentPeriodEnd: newEnd ?? undefined },
          });
        }

        if (advanced && dbSub.pendingPlanId && dbSub.pendingPlanId !== dbSub.planId) {
          const pendingPlan = await prisma.subscriptionPlan.findUnique({ where: { id: dbSub.pendingPlanId } });
          if (pendingPlan) {
            await prisma.subscription.update({
              where: { id: dbSub.id },
              data: {
                planId: pendingPlan.id,
                creditsLimit: pendingPlan.creditsLimit,
                businessLimit: pendingPlan.businessLimit,
                creditsUsed: 0,
                creditsLastResetAt: new Date(),
                pendingPlanId: null,
                scheduledChangeAt: null,
              },
            });
          }
        }
        break;
      }
    }
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// Top-up webhook needs the exact raw bytes for HMAC verification, so it must
// be registered before the JSON body parser. Signature is mandatory.
app.post("/api/payments/top-up-webhook", express.raw({ type: "*/*" }), handleTopUpWebhook);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(sanitizeInput);
app.use(apiLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/qr", qrRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/communications", communicationRoutes);
app.use("/api/google-reviews", googleReviewsRoutes);
app.use("/api/google-places", googlePlacesRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/auth", consentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminAnalyticsRoutes);
app.use("/api/ai", aiVisibilityRoutes);

// v2 Feature routes (isolated from above — these are the new 6 features)
app.use("/api/v2", v2Features);

// Resolve uploads directory relative to THIS FILE's location
// Dev (tsx):  __dirname = server/src/  → ../uploads = server/uploads/
// Prod (dist): __dirname = server/dist/  → ../uploads = server/uploads/
const uploadsDir = path.resolve(__dirname, "../uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("Created uploads directory at:", uploadsDir);
  }
} catch {
  console.warn("Could not create uploads directory");
}

// Serve uploaded files statically — allow cross-origin image loading
app.use("/api/uploads", (_req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}, express.static(uploadsDir, {
  maxAge: "1y",
  immutable: true,
}));

if (env.SENTRY_DSN) {
  try {
    const Sentry = require("@sentry/node");
    Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.errorHandler());
  } catch {
    console.warn("Sentry initialization failed");
  }
}

app.use(notFoundHandler);
app.use(errorHandler);

async function seedDefaultPlans() {
  const plans = [
    { name: "Free", slug: "free", price: 0, interval: "month", sortOrder: 0, creditsLimit: 30, businessLimit: 1, teamSeats: 1, features: ["1 business", "30 Credits/mo", "Review collection (email + QR)", "Review inbox (Google)", "Basic analytics"], description: "For businesses just getting started." },
    { name: "Lite (Monthly)", slug: "lite", price: 10000, interval: "month", sortOrder: 1, creditsLimit: 100, businessLimit: 1, teamSeats: 1, features: ["1 business", "100 Credits/mo", "Review collection (email + QR)", "Review inbox (Google)", "Basic analytics", "Priority email support"], description: "Affordable entry-level plan." },
    { name: "Lite (Yearly)", slug: "lite-yearly", price: 120000, interval: "year", sortOrder: 2, creditsLimit: 100, businessLimit: 1, teamSeats: 1, features: ["1 business", "100 Credits/mo", "Everything in Lite monthly", "Billed annually"], description: "Billed annually." },
    { name: "Starter (Monthly)", slug: "starter", price: 24900, interval: "month", sortOrder: 3, creditsLimit: 300, businessLimit: 1, teamSeats: 2, features: ["1 business", "300 Credits/mo", "AI reply drafting", "Review insights", "SMS & email requests", "Priority support"], description: "For single-location businesses ready to grow." },
    { name: "Growth (Monthly)", slug: "growth", price: 49900, interval: "month", sortOrder: 4, creditsLimit: 1500, businessLimit: 3, teamSeats: 5, features: ["Up to 3 businesses", "1,500 Credits/mo", "Everything in Starter", "Google Business Profile sync", "Team roles (5 users)", "Priority support"], description: "For growing businesses." },
    { name: "Pro (Monthly)", slug: "pro", price: 79900, interval: "month", sortOrder: 5, creditsLimit: 5000, businessLimit: 10, teamSeats: 15, features: ["Up to 10 businesses", "5,000 Credits/mo", "Everything in Growth", "WhatsApp review collection", "Google Business Profile sync", "Team roles (15 users)", "Dedicated support"], description: "For multi-location businesses." },
    { name: "Starter (Yearly)", slug: "starter-yearly", price: 249900, interval: "year", sortOrder: 6, creditsLimit: 300, businessLimit: 1, teamSeats: 2, features: ["1 business", "300 Credits/mo", "AI reply drafting", "Review insights", "SMS & email requests", "Priority support", "Save 2 months free"], description: "Billed annually. Save ₹489 vs monthly." },
    { name: "Growth (Yearly)", slug: "growth-yearly", price: 499900, interval: "year", sortOrder: 7, creditsLimit: 1500, businessLimit: 3, teamSeats: 5, features: ["Up to 3 businesses", "1,500 Credits/mo", "Everything in Starter", "Google Business Profile sync", "Team roles (5 users)", "Priority support", "Save 2 months free"], description: "Billed annually. Save ₹989 vs monthly." },
    { name: "Pro (Yearly)", slug: "pro-yearly", price: 799900, interval: "year", sortOrder: 8, creditsLimit: 5000, businessLimit: 10, teamSeats: 15, features: ["Up to 10 businesses", "5,000 Credits/mo", "Everything in Pro monthly", "WhatsApp review collection", "Google Business Profile sync", "Team roles (15 users)", "Dedicated support", "Save 2 months free"], description: "Billed annually. Save ₹1,589 vs monthly." },
  ];
  // Insert-only seeding: create any missing plans, but NEVER overwrite an
  // existing row. Admins edit price/limits/features from the dashboard; the
  // old `update: p` upsert silently reverted those edits on every boot (and
  // left a stale `razorpayPlanId`, so the code price and the charged price
  // diverged). Existing plans are managed by migrations/admin actions.
  const existing = await prisma.subscriptionPlan.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((p) => p.slug));
  let createdCount = 0;
  for (const p of plans) {
    if (existingSlugs.has(p.slug)) continue;
    await prisma.subscriptionPlan.create({ data: p });
    createdCount++;
  }
  if (createdCount > 0) {
    console.log(`Seeded ${createdCount} missing subscription plan(s)`);
  } else {
    console.log("Plans up to date — no seed writes");
  }
  console.log("Default subscription plans ready");
}

async function start() {
  const bootStart = Date.now();
  try {
    await prisma.$connect();
    console.log(`Connected to PostgreSQL in ${Date.now() - bootStart}ms`);
    await seedDefaultPlans();

    app.listen(env.PORT, () => {
      console.log(`BEYONDVYU API server running on port ${env.PORT} (boot ${Date.now() - bootStart}ms)`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
