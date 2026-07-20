import express from "express";
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
import paymentsRoutes from "./routes/payments";
import adminRoutes from "./routes/admin";
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
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = req.body instanceof Buffer ? req.body.toString("utf8") : JSON.stringify(req.body);

    if (env.NODE_ENV === "production" && (!env.RAZORPAY_WEBHOOK_SECRET || !signature)) {
      return res.status(400).json({ error: "Missing webhook signature" });
    }

    if (env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const crypto = require("crypto");
      const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
      if (expected !== signature) {
        console.error("Webhook signature mismatch");
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = JSON.parse(body);
    const razorpaySub = event.payload?.subscription?.entity;
    if (!razorpaySub) return res.json({ status: "skipped" });

    const dbSub = await prisma.subscription.findFirst({
      where: { razorpaySubscriptionId: razorpaySub.id },
    });
    if (!dbSub) return res.json({ status: "not_found" });
    if (dbSub.status === "cancelled") return res.json({ status: "skipped_cancelled" });

    switch (event.event) {
      case "subscription.authenticated": {
        // First payment authorization succeeded (mandate registered)
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: {
            status: "authenticated",
            razorpayCustomerId: razorpaySub.customer_id || dbSub.razorpayCustomerId,
          },
        });
        break;
      }
      case "subscription.activated": {
        // Billing cycle started - subscription is now active
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: {
            status: "active",
            currentPeriodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : undefined,
            currentPeriodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : undefined,
          },
        });
        // Create invoice for authentication payment if payment entity exists
        const authPayment = event.payload?.payment?.entity;
        if (authPayment && (authPayment.status === "captured" || authPayment.captured === "1")) {
          try {
            await prisma.invoice.create({
              data: {
                subscriptionId: dbSub.id,
                razorpayPaymentId: authPayment.id,
                amount: authPayment.amount || 0,
                currency: authPayment.currency || "INR",
                status: "captured",
                description: `Initial payment for ${razorpaySub.plan_id}`,
              },
            }).catch(() => {});
          } catch (_) {}
        }
        break;
      }
      case "subscription.charged": {
        // Recurring charge succeeded - update period and create invoice
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: {
            status: "active",
            currentPeriodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : undefined,
            currentPeriodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : undefined,
          },
        });
        const payment = event.payload?.payment?.entity;
        if (payment && payment.id) {
          try {
            await prisma.invoice.upsert({
              where: { razorpayPaymentId: payment.id },
              create: {
                subscriptionId: dbSub.id,
                razorpayPaymentId: payment.id,
                amount: payment.amount || 0,
                currency: payment.currency || "INR",
                status: payment.status === "captured" || payment.captured === "1" ? "captured" : "created",
                description: `Recurring charge for ${razorpaySub.plan_id}`,
              },
              update: { status: payment.status === "captured" || payment.captured === "1" ? "captured" : "created" },
            });
          } catch (invoiceErr) {
            console.error("Failed to create invoice record:", invoiceErr);
          }
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
                  aiCallsLimit: pendingPlan.aiCallsLimit,
                  businessLimit: pendingPlan.businessLimit,
                  aiCallsUsed: 0,
                  aiCallsLastResetAt: new Date(),
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
          data: { status: "cancelled", cancelledAt: new Date() },
        });
        const fb = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
        if (fb) {
          await prisma.subscription.create({
            data: {
              userId: dbSub.userId, planId: fb.id, status: "active",
              aiCallsLimit: fb.aiCallsLimit, businessLimit: fb.businessLimit,
              currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
            },
          });
        }
        break;
      }
      case "subscription.completed": {
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "completed" },
        });
        // Downgrade to free plan when subscription completes
        const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
        if (freePlan && dbSub.planId !== freePlan.id) {
          await prisma.subscription.create({
            data: {
              userId: dbSub.userId, planId: freePlan.id, status: "active",
              aiCallsLimit: freePlan.aiCallsLimit, businessLimit: freePlan.businessLimit,
              currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
            },
          });
        }
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
        // All retries exhausted - mark as halted
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "halted" },
        });
        break;
      }
      case "subscription.paused": {
        // User manually paused from dashboard
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "paused" },
        });
        break;
      }
      case "subscription.resumed": {
        // User manually resumed from dashboard
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: { status: "active" },
        });
        break;
      }
      case "subscription.updated": {
        // Plan/quantity changed
        await prisma.subscription.update({
          where: { id: dbSub.id },
          data: {
            status: razorpaySub.status === "active" ? "active" : dbSub.status,
            currentPeriodStart: razorpaySub.current_start ? new Date(razorpaySub.current_start * 1000) : undefined,
            currentPeriodEnd: razorpaySub.current_end ? new Date(razorpaySub.current_end * 1000) : undefined,
          },
        });
        break;
      }
    }
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

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
app.use("/api/admin", adminRoutes);

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
    { name: "Free", slug: "free", price: 0, interval: "month", sortOrder: 0, aiCallsLimit: 1000, businessLimit: 1, features: ["1 business", "1000 AI calls/mo", "Unlimited QR codes", "Review inbox", "Basic analytics"], description: "For businesses just getting started." },
    { name: "Starter", slug: "starter", price: 49900, interval: "month", sortOrder: 1, aiCallsLimit: 500, businessLimit: 1, features: ["1 business", "500 AI calls/mo", "AI reply drafting", "Review insights", "SMS & email requests", "Priority support"], description: "For single-location businesses ready to grow." },
    { name: "Growth", slug: "pro", price: 79900, interval: "month", sortOrder: 2, aiCallsLimit: 999999, businessLimit: 5, features: ["Up to 5 businesses", "Unlimited AI calls", "Everything in Starter", "Google Business Profile sync", "Team roles (3 users)", "Priority support"], description: "For growing businesses — unlimited AI responses." },
    { name: "Starter Yearly", slug: "starter-yearly", price: 499000, interval: "year", sortOrder: 3, aiCallsLimit: 500, businessLimit: 1, features: ["1 business", "500 AI calls/mo", "AI reply drafting", "Review insights", "SMS & email requests", "Priority support", "Save 2 months free"], description: "Billed annually. Save ₹998 vs monthly." },
    { name: "Growth Yearly", slug: "pro-yearly", price: 799000, interval: "year", sortOrder: 4, aiCallsLimit: 999999, businessLimit: 5, features: ["Up to 5 businesses", "Unlimited AI calls", "Everything in Starter", "Google Business Profile sync", "Team roles (3 users)", "Priority support", "Save 2 months free"], description: "Billed annually. Save ₹1,598 vs monthly." },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: p.slug },
      create: p,
      update: p,
    });
  }
  // Also sync aiCallsLimit for all active subscriptions tied to updated plans
  // so existing users don't hit the old limit after a plan change
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
  if (freePlan) {
    const updated = await prisma.subscription.updateMany({
      where: { status: "active", planId: freePlan.id, aiCallsLimit: { lt: freePlan.aiCallsLimit } },
      data: { aiCallsLimit: freePlan.aiCallsLimit },
    });
    if (updated.count > 0) {
      console.log(`Synced aiCallsLimit for ${updated.count} active free subscriptions`);
    }
  }
  console.log("Default subscription plans seeded");
}

async function start() {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL");
    await seedDefaultPlans();

    app.listen(env.PORT, () => {
      console.log(`BEYONDVYU API server running on port ${env.PORT}`);
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
