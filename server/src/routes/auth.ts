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
          aiCallsLimit: freePlan.aiCallsLimit,
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

    const frontendUrl = getEnv().FRONTEND_URL || getEnv().FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    sendPasswordResetEmail(user.email, user.name || "", resetLink).catch((e) => {
      console.error("Password reset email send failure:", e);
    });

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

// ── Google OAuth Sign-In ─────────────────────────────────────────────────────

router.get("/google", (req: AuthRequest, res: Response) => {
  try {
    const env = getEnv();
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return res.status(400).json({ error: "Google OAuth is not configured" });
    }

    const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI
      ? env.GOOGLE_OAUTH_REDIRECT_URI.replace("/google-reviews/oauth/callback", "/auth/google/callback")
      : "";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri || `${req.protocol}://${req.get("host")}/api/auth/google/callback`,
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
    const { code } = req.query;
    if (!code || typeof code !== "string") {
      return res.redirect(`${getEnv().FRONTEND_URL || "http://localhost:3000"}/login?error=google_auth_failed`);
    }

    const env = getEnv();
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.redirect(`${env.FRONTEND_URL || "http://localhost:3000"}/login?error=google_not_configured`);
    }

    const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI
      ? env.GOOGLE_OAUTH_REDIRECT_URI.replace("/google-reviews/oauth/callback", "/auth/google/callback")
      : "";

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || `${req.protocol}://${req.get("host")}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token exchange failed:", errBody);
      return res.redirect(`${env.FRONTEND_URL || "http://localhost:3000"}/login?error=google_auth_failed`);
    }

    const tokens: any = await tokenRes.json();
    if (!tokens.id_token) {
      return res.redirect(`${env.FRONTEND_URL || "http://localhost:3000"}/login?error=google_auth_failed`);
    }

    // Verify the ID token
    const client = new OAuth2Client(clientId, clientSecret, redirectUri || undefined);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.redirect(`${env.FRONTEND_URL || "http://localhost:3000"}/login?error=google_auth_failed`);
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
            aiCallsLimit: freePlan.aiCallsLimit,
            businessLimit: freePlan.businessLimit,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
          },
        });
      }
    }

    // Issue session JWT
    const token = issueSessionToken(user.id);

    const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/auth/google/success?token=${token}`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const frontendUrl = getEnv().FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
  }
});

router.get("/me", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
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
