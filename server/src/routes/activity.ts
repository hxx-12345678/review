import { Router, Response } from "express";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const logs = await prisma.activityLog.findMany({
      where: { businessId: businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ logs });
  } catch (err) {
    console.error("Get activity logs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
