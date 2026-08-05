import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { authRequired, AuthRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rate-limit";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../services/email";

const signToken = (payload: object, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

function issueSessionToken(userId: string): string {
  const env = getEnv();
  const token = signToken({ userId }, env.JWT_SECRET, env.JWT_EXPIRES_IN);
  prisma.session.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  }).catch((e) => console.error("Session create error:", e));
  return token;
}

router.post("/signup", authLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name || null,
      },
    });

    // Auto-assign Free plan subscription
    const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
    if (freePlan) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: freePlan.id,
          status: "active",
          creditsLimit: freePlan.creditsLimit,
          businessLimit: freePlan.businessLimit,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
        },
      });
    }

    const env = getEnv();
    const token = signToken({ userId: user.id }, env.JWT_SECRET, env.JWT_EXPIRES_IN);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    sendWelcomeEmail(user.email, user.name || "").catch((e) => {
      console.error("Welcome email send failure:", e);
    });

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", authLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = issueSessionToken(user.id);

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Forgot Password ───────────────────────────────────────────────────────────

router.post("/forgot-password", authLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Always return the same response to prevent user enumeration
    const genericResponse = { message: "If that email is registered, you will receive a password reset link." };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.json(genericResponse);
    }

    // Generate cryptographically secure 32-byte token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Invalidate any previous reset token, set new one with 15-minute expiry
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    const frontendUrl = getFrontendUrl();
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    sendPasswordResetEmail(user.email, user.name || "", resetLink).catch((e) => {
      console.error("Password reset email send failure:", e);
    });

    // In development, log the reset link so it can be tested without SMTP
    if (getEnv().NODE_ENV === "development") {
      console.log(`\n[DEV] Password reset link for ${user.email}:`);
      console.log(`[DEV] ${resetLink}\n`);
    }

    res.json(genericResponse);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reset Password ────────────────────────────────────────────────────────────

router.post("/reset-password", authLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { token: rawToken, password } = resetPasswordSchema.parse(req.body);

    // Hash the provided token to look up in DB
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // Atomic: find user with matching, non-expired, unused reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    // Validate new password then hash it
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password, clear reset token, revoke all sessions atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      }),
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    res.json({ message: "Password reset successfully. You can now sign in with your new password." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Change Password (from settings) ──────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.post("/change-password", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Block Google OAuth users — they don't own the password
    if (user.googleId) {
      return res.status(403).json({ error: "Password change is not available for Google-linked accounts" });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Google OAuth Sign-In ─────────────────────────────────────────────────────

// Resolve the frontend origin from FRONTEND_URL (comma-separated allowed).
// Strips any trailing slashes so redirects never produce "//google/auth/success"
// style broken URLs, and skips localhost entries when running in production.
function getFrontendUrl(): string {
  const env = getEnv();
  const list = (env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (env.NODE_ENV === "production") {
    const remote = list.find((u) => /^https:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u));
    if (remote) return remote;
  }

  return list[0] || "http://localhost:3000";
}

// The OAuth callback MUST match EXACTLY one of the authorized redirect URIs
// registered in Google Cloud Console (else Error 400: redirect_uri_mismatch).
// Priority:
//   1. GOOGLE_OAUTH_AUTH_REDIRECT_URI  (explicit login-flow URI, recommended)
//   2. GOOGLE_OAUTH_REDIRECT_URI with the GBP path swapped to /auth/google/callback
//      (backwards-compatible with what was previously registered)
//   3. <FRONTEND_URL>/api/auth/google/callback
//   4. request host fallback
function getGoogleAuthRedirectUri(req: AuthRequest): string {
  const env = getEnv();
  const isProd = env.NODE_ENV === "production";
  const isRemote = (u: string) => /^https:\/\//.test(u) && !/localhost|127\.0\.0\.1/.test(u);

  // 1. Explicit login-flow URI (recommended — set this in production)
  const explicit = env.GOOGLE_OAUTH_AUTH_REDIRECT_URI.trim();
  if (explicit) return explicit;

  // 2. Backwards-compatible: derive from GOOGLE_OAUTH_REDIRECT_URI, but never
  //    send a localhost URI in production (the schema default is localhost and
  //    would otherwise cause Error 400: redirect_uri_mismatch).
  if (env.GOOGLE_OAUTH_REDIRECT_URI) {
    const derived = env.GOOGLE_OAUTH_REDIRECT_URI.replace("/google-reviews/oauth/callback", "/auth/google/callback");
    if (derived && (!isProd || isRemote(derived))) return derived;
  }

  // 3. Frontend origin
  const frontendUrl = getFrontendUrl();
  if (frontendUrl && (!isProd || isRemote(frontendUrl))) {
    return `${frontendUrl}/api/auth/google/callback`;
  }

  // 4. Request host fallback
  return `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
}

router.get("/google", (req: AuthRequest, res: Response) => {
  try {
    const env = getEnv();
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({ error: "Google OAuth is not configured" });
    }

    const finalRedirectUri = getGoogleAuthRedirectUri(req);

    console.log("[Google Auth] Using redirect_uri:", finalRedirectUri);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: finalRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });

    res.json({
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  } catch (err) {
    console.error("Google OAuth URL error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/google/callback", async (req: AuthRequest, res: Response) => {
  try {
    const frontendUrl = getFrontendUrl();
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    const env = getEnv();
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
    }

    const finalRedirectUri = getGoogleAuthRedirectUri(req);

    console.log("[Google Callback] Using redirect_uri:", finalRedirectUri);

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: finalRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token exchange failed:", errBody);
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    const tokens: any = await tokenRes.json();
    if (!tokens.id_token) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    // Verify the ID token
    const client = new OAuth2Client(clientId, clientSecret, finalRedirectUri);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
    }

    // Upsert user: find by googleId first, then by email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: payload.sub },
          { email: payload.email },
        ],
      },
    });

    if (user) {
      // Link googleId if this user signed up via email/password first
      if (!user.googleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub },
        });
      }
    } else {
      // Create a new user via Google sign-up
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || null,
          googleId: payload.sub,
          passwordHash,
        },
      });

      // Auto-assign Free plan
      const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
      if (freePlan) {
        await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: freePlan.id,
            status: "active",
            creditsLimit: freePlan.creditsLimit,
            businessLimit: freePlan.businessLimit,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
          },
        });
      }
    }

    // Issue session JWT
    const token = issueSessionToken(user.id);

    res.redirect(`${frontendUrl}/google/auth/success?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    res.redirect(`${getFrontendUrl()}/login?error=google_auth_failed`);
  }
});

router.get("/me", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true, googleId: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const businesses = await prisma.business.findMany({
      where: { userId: req.userId },
      select: { id: true, name: true, slug: true, industry: true },
    });

    res.json({ user, businesses });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader!.split(" ")[1];

    await prisma.session.deleteMany({ where: { token } });
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
