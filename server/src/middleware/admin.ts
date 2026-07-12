import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";

export interface AdminRequest extends Request {
  adminId?: string;
}

export function adminAuthRequired(req: AdminRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Admin authentication required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const env = getEnv();
    const decoded = jwt.verify(token, env.ADMIN_JWT_SECRET) as { adminId: string; role: string };
    if (decoded.role !== "super_admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    req.adminId = decoded.adminId;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
