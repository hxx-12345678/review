import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { authRequired, AuthRequest } from "../../middleware/auth";
import { sendWhatsAppReviewFlow } from "./whatsapp-flows.service";

const router = Router();

const sendFlowSchema = z.object({
  businessId: z.string().min(1),
  phoneNumber: z.string().min(5).max(20),
  customerName: z.string().max(100).optional(),
});

router.post("/send-flow", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendFlowSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const result = await sendWhatsAppReviewFlow(
      business.id,
      data.phoneNumber,
      data.customerName,
    );

    if (!result.success) {
      return res.status(502).json({ error: result.error || "Failed to send WhatsApp flow" });
    }

    const flow = await prisma.whatsAppFlow.create({
      data: {
        businessId: business.id,
        customerPhone: data.phoneNumber,
        customerName: data.customerName || null,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "whatsapp_flow_sent",
        details: { phoneNumber: data.phoneNumber, flowId: flow.id, messageId: result.messageId },
      },
    });

    res.json({
      success: true,
      flow,
      messageId: result.messageId,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Send WhatsApp flow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/send-direct-flow", authRequired, (_req: AuthRequest, res: Response) => {
  return res.status(410).json({
    error:
      "WhatsApp Flows direct sending is retired. Use the WhatsApp automation page with a Meta-approved template.",
    code: "FLOW_RETIRED",
  });
});

// The old unsigned webhook at /api/v2/whatsapp-flows/webhook was removed.
// Meta webhooks are now handled at /api/v2/whatsapp/webhook with mandatory
// X-Hub-Signature-256 verification.

router.get("/flows/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const flows = await prisma.whatsAppFlow.findMany({
      where: { businessId },
      include: { response: true, template: true },
      orderBy: { sentAt: "desc" },
      take: 50,
    });

    res.json({ flows });
  } catch (err) {
    console.error("List flows error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const totalFlows = await prisma.whatsAppFlow.count({ where: { businessId } });
    const completedFlows = await prisma.whatsAppFlow.count({
      where: { businessId, status: "COMPLETED" },
    });
    const avgRating = await prisma.whatsAppFlowResponse.aggregate({
      where: { businessId },
      _avg: { rating: true },
    });

    res.json({
      totalFlows,
      completedFlows,
      completionRate: totalFlows > 0 ? Math.round((completedFlows / totalFlows) * 100) : 0,
      averageRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : null,
    });
  } catch (err) {
    console.error("WhatsApp stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

