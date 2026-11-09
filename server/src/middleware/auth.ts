import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";
import { prisma } from "../config/database";

export interface AuthRequest extends Request {
  userId?: string;
  businessId?: string;
}

export async function authRequired(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(`Auth failed (no token): ${req.method} ${req.originalUrl} from ${req.ip}`);
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const env = getEnv();
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { select: { suspended: true, deletedAt: true } } },
    });
    if (!session || session.userId !== decoded.userId) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }
    if (!session.user || session.user.deletedAt) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
      return res.status(401).json({ error: "Account not found." });
    }
    if (session.user.suspended) {
      return res.status(403).json({
        error: "Your account has been suspended. Please contact support.",
        code: "ACCOUNT_SUSPENDED",
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (err: any) {
    console.warn(`Auth failed: ${req.method} ${req.originalUrl} from ${req.ip} - ${err.message}`);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function authOptional(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const env = getEnv();
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: { select: { suspended: true, deletedAt: true } } },
      });
      if (
        session &&
        session.userId === decoded.userId &&
        session.user &&
        !session.user.deletedAt &&
        !session.user.suspended &&
        (!session.expiresAt || new Date(session.expiresAt).getTime() > Date.now())
      ) {
        req.userId = decoded.userId;
      }
    } catch {
      // Token invalid, continue without auth
    }
  }
  next();
}
