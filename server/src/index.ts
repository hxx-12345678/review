import express from "express";
import cors from "cors";
import helmet from "helmet";
import { loadEnv } from "./config/env";
import { prisma } from "./config/database";
import { apiLimiter } from "./middleware/rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import businessRoutes from "./routes/businesses";
import feedbackRoutes from "./routes/feedback";
import reviewRoutes from "./routes/reviews";
import qrRoutes from "./routes/qr";
import aiRoutes from "./routes/ai";
import activityRoutes from "./routes/activity";
import communicationRoutes from "./routes/communications";

const env = loadEnv();

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: [
    env.FRONTEND_URL,
    "http://localhost:3000",
    "https://review-nine-inky.vercel.app",
  ].filter(Boolean) as string[],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
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

async function start() {
  try {
    await prisma.$connect();
    console.log("Connected to PostgreSQL");

    app.listen(env.PORT, () => {
      console.log(`ReviewOS API server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Frontend URL: ${env.FRONTEND_URL}`);
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
