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

    const session = await prisma.session.findUnique({ where: { token } });
    if (!session) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    req.userId = decoded.userId;
    next();
  } catch (err: any) {
    console.warn(`Auth failed: ${req.method} ${req.originalUrl} from ${req.ip} - ${err.message}`);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function authOptional(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const env = getEnv();
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      req.userId = decoded.userId;
    } catch {
      // Token invalid, continue without auth
    }
  }
  next();
}
