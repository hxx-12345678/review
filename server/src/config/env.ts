import * as fs from "fs";
import * as path from "path";
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
  SMTP_FROM: z.string().optional().default("noreply@beyondvyu.com"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  SMS_API_KEY: z.string().optional().default(""),
  SMS_SENDER_ID: z.string().optional().default(""),
  SMS_TEMPLATE_ID: z.string().optional().default(""),
  SMS_BASE_URL: z.string().optional().default("https://login.smsforyou.biz/V2/http-api.php"),
  GEMINI_API_KEY_1: z.string().optional().default(""),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default(""),
  // OpenRouter failover (secondary AI provider when Gemini is rate-limited/down).
  // Default model chosen Sep 2026 after cost/quality research: qwen/qwen3-30b-a3b
  // (~$0.13 in / $0.52 out per 1M tokens, 131K context, JSON mode, strong multilingual incl. Hindi).
  // Free ":free" variants exist but are rate-capped (20/min, ~50-200/day) and less reliable — paid cheap model is the default.
  OPENROUTER_API_KEY: z.string().optional().default(""),
  OPENROUTER_MODEL: z.string().default("qwen/qwen3-30b-a3b"),
  OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
  OPENROUTER_TIMEOUT_MS: z.coerce.number().default(20000),
  OPENROUTER_APP_URL: z.string().default("https://beyondvyu.com"),
  OPENROUTER_APP_NAME: z.string().default("BEYONDVYU"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().optional().default("http://localhost:4000/api/google-reviews/oauth/callback"),
  // Dedicated callback for user login OAuth (distinct from GBP google-reviews flow).
  // Defaults to <FRONTEND_URL>/api/auth/google/callback when unset.
  GOOGLE_OAUTH_AUTH_REDIRECT_URI: z.string().optional().default(""),
  TOKEN_ENCRYPTION_KEY: z.string().optional().default(""),
  GOOGLE_PLACES_API_KEY: z.string().optional().default(""),

  // WhatsApp Business Cloud API
  WHATSAPP_API_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional().default(""),
  WHATSAPP_API_VERSION: z.string().default("v25.0"),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional().default(""),

  // Instagram Graph API
  INSTAGRAM_APP_ID: z.string().optional().default(""),
  INSTAGRAM_APP_SECRET: z.string().optional().default(""),
  INSTAGRAM_WEBHOOK_TOKEN: z.string().optional().default(""),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional().default(""),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional().default("").transform((s) => s.trim()),
  RAZORPAY_KEY_SECRET: z.string().optional().default("").transform((s) => s.trim()),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default("").transform((s) => s.trim()),

  // Super Admin
  ADMIN_EMAIL: z.string().email().default("admin@beyondvyu.com"),
  ADMIN_PASSWORD_HASH: z.string().min(16).default(""), // bcrypt hash of admin password
  ADMIN_JWT_SECRET: z.string().min(16).default(""),
  ADMIN_PATH_PREFIX: z.string().default("admin"), // frontend path prefix for admin pages
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

// Dependency-free .env loader (tsx doesn't auto-load dotenv, and the runtime
// previously never read server/.env at all — pasted keys were silently ignored).
// Real environment variables always win; .env only fills gaps. Exported for tests.
export function applyDotEnvFile(envPath: string, target: Record<string, string>): string[] {
  const applied: string[] = [];
  try {
    if (!fs.existsSync(envPath)) return applied;
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const eqIdx = trimmed.indexOf("=");
      let key = trimmed.slice(0, eqIdx).trim();
      if (key.startsWith("export ")) key = key.slice(7).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
      ) {
        value = value.slice(1, -1);
      }
      if (key && target[key] === undefined) {
        target[key] = value;
        applied.push(key);
      }
    }
  } catch {
    // .env is best-effort; missing/unreadable file must never crash boot
  }
  return applied;
}

export function loadEnv(): Env {
  if (!env) {
    const processed: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        processed[key] = value;
      }
    }
    // Fill gaps from server/.env (same dir in dev src/ and prod dist/ layouts)
    const candidates = [
      path.resolve(__dirname, "../../.env"),
      path.resolve(process.cwd(), ".env"),
    ];
    for (const p of candidates) {
      applyDotEnvFile(p, processed);
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
  if (process.env.NODE_ENV === "production" && env.DATABASE_URL && !/ap-south-1|central-india/i.test(env.DATABASE_URL)) {
    console.error("FATAL: DATABASE_URL must be ap-south-1/central-india per RBI Apr-2018 localization");
  }
  return env;
}

// Hot-pickup for keys pasted into server/.env AFTER boot: if the cached env has
// no OpenRouter key, re-scan the .env files (real process env still wins) and
// update the cache. Lets "paste key → works" without restarting the server.
export function getOpenRouterConfig(): {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  appUrl: string;
  appName: string;
} {
  const e = getEnv();
  let apiKey = process.env.OPENROUTER_API_KEY || e.OPENROUTER_API_KEY;
  let model = process.env.OPENROUTER_MODEL || e.OPENROUTER_MODEL;
  if (!apiKey) {
    const fresh: Record<string, string> = {};
    for (const p of [path.resolve(__dirname, "../../.env"), path.resolve(process.cwd(), ".env")]) {
      applyDotEnvFile(p, fresh);
    }
    if (fresh.OPENROUTER_API_KEY && !process.env.OPENROUTER_API_KEY) {
      e.OPENROUTER_API_KEY = fresh.OPENROUTER_API_KEY;
      apiKey = fresh.OPENROUTER_API_KEY;
    }
    if (fresh.OPENROUTER_MODEL && !process.env.OPENROUTER_MODEL) {
      e.OPENROUTER_MODEL = fresh.OPENROUTER_MODEL;
      model = fresh.OPENROUTER_MODEL;
    }
  }
  return {
    apiKey,
    model,
    baseUrl: process.env.OPENROUTER_BASE_URL || e.OPENROUTER_BASE_URL,
    timeoutMs: e.OPENROUTER_TIMEOUT_MS,
    appUrl: process.env.OPENROUTER_APP_URL || e.OPENROUTER_APP_URL,
    appName: process.env.OPENROUTER_APP_NAME || e.OPENROUTER_APP_NAME,
  };
}
