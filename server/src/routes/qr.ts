import { Router, Response } from "express";
import QRCode from "qrcode";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";
import { getEnv } from "../config/env";

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

    const qrCodes = await prisma.qrCode.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ qrCodes });
  } catch (err) {
    console.error("Get QR codes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/generate/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const env = getEnv();
    const reviewUrl = `${env.FRONTEND_URL.split(",")[0].trim()}/r/${business.slug}`;

    const qrCode = await prisma.qrCode.create({
      data: {
        businessId: business.id,
        type: "review",
        url: reviewUrl,
      },
    });

    const pngDataUrl = await QRCode.toDataURL(reviewUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#0d9488", light: "#ffffff" },
    });

    const svgString = await QRCode.toString(reviewUrl, {
      type: "svg",
      width: 400,
      margin: 2,
      color: { dark: "#0d9488", light: "#ffffff" },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "qr_generated",
        details: { qrCodeId: qrCode.id },
      },
    });

    res.json({ qrCode, pngDataUrl, svgString, reviewUrl });
  } catch (err) {
    console.error("Generate QR error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
