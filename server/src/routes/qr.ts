import { Router, Response } from "express";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";
import { getEnv } from "../config/env";
import { normalizeTouchpoint, touchpointLabel } from "../utils/review-touchpoints";

const router = Router();

const generateQrSchema = z.object({
  touchpoint: z.string().max(30).optional().or(z.literal("")),
  label: z.string().max(80).optional().or(z.literal("")),
  table: z.string().max(40).optional().or(z.literal("")),
  staff: z.string().max(80).optional().or(z.literal("")),
});

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

    const parsed = generateQrSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid QR options" });
    }
    const options = parsed.data;

    const env = getEnv();
    const touchpoint = normalizeTouchpoint(options.touchpoint);
    const table = options.table?.trim();
    const staff = options.staff?.trim();
    const params = new URLSearchParams();
    if (touchpoint) params.set("touchpoint", touchpoint);
    if (table) params.set("table", table);
    if (staff) params.set("staff", staff);
    const query = params.toString();
    const reviewUrl = `${env.FRONTEND_URL.split(",")[0].trim()}/r/${business.slug}${query ? `?${query}` : ""}`;

    const autoLabel = [
      touchpointLabel(touchpoint),
      table ? `Table ${table}` : null,
      staff ? `Staff ${staff}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const label = options.label?.trim() || autoLabel || null;

    const qrCode = await prisma.qrCode.create({
      data: {
        businessId: business.id,
        type: "review",
        touchpoint,
        label,
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
        details: { qrCodeId: qrCode.id, touchpoint },
      },
    });

    res.json({ qrCode, pngDataUrl, svgString, reviewUrl });
  } catch (err) {
    console.error("Generate QR error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
