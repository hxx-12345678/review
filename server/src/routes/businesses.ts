import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

async function getEffectiveBusinessLimit(userId: string): Promise<number> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["authenticated", "active", "created"] } },
    orderBy: { createdAt: "desc" },
  });

  if (sub?.businessLimit) return sub.businessLimit;

  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
  return freePlan?.businessLimit ?? 1;
}

const createBusinessSchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.enum(["DENTAL", "MEDICAL", "SALON", "GYM", "HOME_SERVICES", "RESTAURANT", "AUTO", "FITNESS", "OTHER"]),
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  googlePlaceId: z.string().max(200).optional().or(z.literal("")),
  location: z.string().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  promptTopics: z.array(z.string()).optional(),
});

const updateBusinessSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  googleReviewUrl: z.string().url().optional().or(z.literal("")),
  googlePlaceId: z.string().max(200).optional().or(z.literal("")),
  location: z.string().max(500).optional().or(z.literal("")),
  phoneNumber: z.string().max(20).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  promptTopics: z.array(z.string()).optional(),
  emailTemplate: z.string().max(500).optional().or(z.literal("")),
  smsTemplate: z.string().max(300).optional().or(z.literal("")),
  // Branding
  logoUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().max(7).optional().or(z.literal("")),
  backgroundColor: z.string().max(7).optional().or(z.literal("")),
  splashTagline: z.string().max(200).optional().or(z.literal("")),
  showPoweredBy: z.boolean().optional(),
});

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

/**
 * Extracts a direct image URL from wrapper URLs (Google imgres, etc.)
 */
function extractImageUrl(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Google imgres: https://www.google.com/imgres?imgurl=ENCODED_URL
    if (parsed.hostname.includes("google.") && parsed.pathname.includes("/imgres")) {
      const imgurl = parsed.searchParams.get("imgurl");
      if (imgurl) return decodeURIComponent(imgurl);
    }
    // Google image search: tbm=isch
    if (parsed.hostname.includes("google.") && parsed.searchParams.get("tbm") === "isch") {
      const imgurl = parsed.searchParams.get("imgurl");
      if (imgurl) return decodeURIComponent(imgurl);
    }
    return url;
  } catch {
    return url;
  }
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

    const result = await prisma.$transaction(async (tx) => {
      const limit = await getEffectiveBusinessLimit(req.userId!);

      const count = await tx.business.count({
        where: { userId: req.userId },
      });
      if (count >= limit) {
        throw Object.assign(
          new Error(`Your plan covers ${limit} business${limit === 1 ? "" : "es"}. Upgrade to add more.`),
          { statusCode: 403, code: "BUSINESS_LIMIT_REACHED", limit, current: count }
        );
      }

      let slug = generateSlug(data.name);

      const existing = await tx.business.findUnique({ where: { slug } });
      if (existing) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }

      const business = await tx.business.create({
        data: {
          userId: req.userId!,
          name: data.name,
          slug,
          industry: data.industry,
          googleReviewUrl: data.googleReviewUrl || null,
          googlePlaceId: data.googlePlaceId || null,
          location: data.location || null,
          phoneNumber: data.phoneNumber || null,
          website: data.website || null,
          promptTopics: data.promptTopics || [],
        },
      });

      await tx.activityLog.create({
        data: {
          userId: req.userId!,
          businessId: business.id,
          action: "business_created",
          details: { name: business.name },
        },
      });

      return business;
    });

    res.status(201).json({ business: result });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    if ((err as any).statusCode === 403) {
      return res.status(403).json({
        error: (err as any).message,
        code: (err as any).code,
        limit: (err as any).limit,
        current: (err as any).current,
      });
    }
    console.error("Create business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.id as string;
    const data = updateBusinessSchema.parse(req.body);

    // Convert empty strings to null for clean DB values
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      let v = value === "" ? null : value;
      // Extract direct image URL from wrapper URLs (Google imgres, etc.)
      if (key === "logoUrl" && typeof v === "string") {
        v = extractImageUrl(v);
      }
      cleaned[key] = v;
    }

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: cleaned,
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

router.delete("/:id", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.id as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const count = await prisma.business.count({ where: { userId: req.userId } });
    if (count <= 1) {
      return res.status(400).json({ error: "Cannot delete your last business. You must have at least one business." });
    }

    await prisma.$transaction([
      prisma.reviewDraft.deleteMany({ where: { businessId } }),
      prisma.feedback.deleteMany({ where: { businessId } }),
      prisma.qrCode.deleteMany({ where: { businessId } }),
      prisma.reviewClick.deleteMany({ where: { businessId } }),
      prisma.generatedReply.deleteMany({ where: { businessId } }),
      prisma.googleReview.deleteMany({ where: { businessId } }),
      prisma.reviewTask.deleteMany({ where: { businessId } }),
      prisma.instagramMention.deleteMany({ where: { businessId } }),
      prisma.crossPlatformMessage.deleteMany({ where: { businessId } }),
      prisma.whatsAppTemplate.deleteMany({ where: { businessId } }),
      prisma.whatsAppFlow.deleteMany({ where: { businessId } }),
      prisma.whatsAppFlowResponse.deleteMany({ where: { businessId } }),
      prisma.activityLog.deleteMany({ where: { businessId } }),
      prisma.aiRequestLog.deleteMany({ where: { businessId } }),
      prisma.googleAccount.deleteMany({ where: { businessId } }),
      prisma.business.delete({ where: { id: businessId } }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error("Delete business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
