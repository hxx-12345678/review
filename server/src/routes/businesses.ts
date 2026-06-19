import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

const createBusinessSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.enum(["DENTAL", "MEDICAL", "SALON", "GYM", "HOME_SERVICES", "RESTAURANT", "AUTO", "FITNESS", "OTHER"]),
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  promptTopics: z.array(z.string()).optional(),
});

const updateBusinessSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  promptTopics: z.array(z.string()).optional(),
  emailTemplate: z.string().max(500).optional().or(z.literal("")),
  smsTemplate: z.string().max(300).optional().or(z.literal("")),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

router.get("/", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { userId: req.userId },
      include: {
        _count: {
          select: { feedback: true, qrCodes: true, reviewClicks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ businesses });
  } catch (err) {
    console.error("Get businesses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.id as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
      include: {
        _count: {
          select: { feedback: true, qrCodes: true, reviewClicks: true },
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json({ business });
  } catch (err) {
    console.error("Get business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = createBusinessSchema.parse(req.body);
    let slug = generateSlug(data.name);

    const existing = await prisma.business.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const business = await prisma.business.create({
      data: {
        userId: req.userId!,
        name: data.name,
        slug,
        industry: data.industry,
        googleReviewUrl: data.googleReviewUrl || null,
        location: data.location || null,
        phoneNumber: data.phoneNumber || null,
        website: data.website || null,
        promptTopics: data.promptTopics || [],
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "business_created",
        details: { name: business.name },
      },
    });

    res.status(201).json({ business });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Create business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.id as string;
    const data = updateBusinessSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data,
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: updated.id,
        action: "business_updated",
        details: { changes: Object.keys(data) },
      },
    });

    res.json({ business: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Update business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
