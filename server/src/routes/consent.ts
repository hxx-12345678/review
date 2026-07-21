import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

const consentSchema = z.object({
  type: z.enum(["data_processing", "privacy_terms", "marketing"]),
  granted: z.boolean(),
  context: z.string().optional(),
});

const saveConsentsSchema = z.object({
  consents: z.array(consentSchema),
});

router.post("/consent", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const { consents } = saveConsentsSchema.parse(req.body);
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;

    const records = await prisma.$transaction(
      consents.map((c) =>
        prisma.consent.upsert({
          where: { userId_type: { userId: req.userId!, type: c.type } },
          create: {
            userId: req.userId!,
            type: c.type,
            granted: c.granted,
            context: c.context || null,
            ipAddress,
            userAgent,
          },
          update: {
            granted: c.granted,
            context: c.context || null,
            ipAddress,
            userAgent,
          },
        })
      )
    );

    res.json({ consents: records });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Save consent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/consent-status", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const consents = await prisma.consent.findMany({
      where: { userId: req.userId! },
    });

    res.json({ consents });
  } catch (err) {
    console.error("Consent status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
