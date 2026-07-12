import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SENTRY_DSN: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SMTP_FROM: z.string().optional().default("noreply@beyondvyu.app"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  SMS_API_KEY: z.string().optional().default(""),
  SMS_SENDER_ID: z.string().optional().default(""),
  SMS_TEMPLATE_ID: z.string().optional().default(""),
  SMS_BASE_URL: z.string().optional().default("https://login.smsforyou.biz/V2/http-api.php"),
  GEMINI_API_KEY_1: z.string().optional().default(""),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default(""),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional().default("http://localhost:4000/api/google-reviews/oauth/callback"),
  TOKEN_ENCRYPTION_KEY: z.string().optional().default(""),
  GOOGLE_PLACES_API_KEY: z.string().optional().default(""),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),

  // Super Admin
  ADMIN_EMAIL: z.string().email().default("admin@beyondvyu.app"),
  ADMIN_PASSWORD_HASH: z.string().min(16).default(""), // bcrypt hash of admin password
  ADMIN_JWT_SECRET: z.string().min(16).default(""),
  ADMIN_PATH_PREFIX: z.string().default("admin"), // frontend path prefix for admin pages
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  if (!env) {
    const processed: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        processed[key] = value;
      }
    }
    // Support legacy EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD naming
    if (processed["EMAIL_HOST"] && !processed["SMTP_HOST"]) {
      processed["SMTP_HOST"] = processed["EMAIL_HOST"];
    }
    if (processed["EMAIL_USER"] && !processed["SMTP_USER"]) {
      processed["SMTP_USER"] = processed["EMAIL_USER"];
    }
    if (processed["EMAIL_PASSWORD"] && !processed["SMTP_PASS"]) {
      processed["SMTP_PASS"] = processed["EMAIL_PASSWORD"];
    }
    if (processed["EMAIL_PORT"] && !processed["SMTP_PORT"]) {
      processed["SMTP_PORT"] = processed["EMAIL_PORT"];
    }
    if (processed["EMAIL_SECURE"] && !processed["SMTP_SECURE"]) {
      processed["SMTP_SECURE"] = processed["EMAIL_SECURE"];
    }
    if (processed["GEMINI_API_KEY_1"] && !processed["GOOGLE_GENERATIVE_AI_API_KEY"]) {
      processed["GOOGLE_GENERATIVE_AI_API_KEY"] = processed["GEMINI_API_KEY_1"];
    }
    if (processed["GOOGLE_CLIENT_ID"] && !processed["GOOGLE_OAUTH_CLIENT_ID"]) {
      processed["GOOGLE_OAUTH_CLIENT_ID"] = processed["GOOGLE_CLIENT_ID"];
    }
    if (processed["GOOGLE_CLIENT_SECRET"] && !processed["GOOGLE_OAUTH_CLIENT_SECRET"]) {
      processed["GOOGLE_OAUTH_CLIENT_SECRET"] = processed["GOOGLE_CLIENT_SECRET"];
    }
    if (processed["GOOGLE_REDIRECT_URI"] && !processed["GOOGLE_OAUTH_REDIRECT_URI"]) {
      processed["GOOGLE_OAUTH_REDIRECT_URI"] = processed["GOOGLE_REDIRECT_URI"];
    }
    const result = envSchema.safeParse(processed);
    if (!result.success) {
      console.error("Invalid environment variables:", result.error.format());
      process.exit(1);
    }
    env = result.data;
  }
  return env;
}

export function getEnv(): Env {
  if (!env) {
    return loadEnv();
  }
  return env;
}
