import { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/env";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const env = getEnv();
  console.error("Unhandled error:", err);

  if (env.SENTRY_DSN) {
    try {
      const Sentry = require("@sentry/node");
      Sentry.captureException(err);
    } catch {
      // Sentry not configured
    }
  }

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS policy: origin not allowed" });
  }

  res.status(500).json({
    error: "Internal server error",
    ...(env.NODE_ENV === "development" && { message: err.message }),
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}
