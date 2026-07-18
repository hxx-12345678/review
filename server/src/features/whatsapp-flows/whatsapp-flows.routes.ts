import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { authRequired, AuthRequest } from "../../middleware/auth";
import {
  sendWhatsAppReviewFlow,
  sendWhatsAppDirectReviewFlow,
  parseFlowResponse,
  extractReviewFromFlowResponse,
} from "./whatsapp-flows.service";

const router = Router();

const sendFlowSchema = z.object({
  businessId: z.string().min(1),
  phoneNumber: z.string().min(5).max(20),
  customerName: z.string().max(100).optional(),
});

const sendDirectFlowSchema = z.object({
  businessId: z.string().min(1),
  phoneNumber: z.string().min(5).max(20),
  customerName: z.string().max(100).optional(),
  flowToken: z.string().min(1),
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
      data.phoneNumber,
      business.name,
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

router.post("/send-direct-flow", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = sendDirectFlowSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const result = await sendWhatsAppDirectReviewFlow(
      data.phoneNumber,
      business.name,
      data.flowToken,
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
        flowSessionId: data.flowToken,
        status: "SENT",
        sentAt: new Date(),
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
    console.error("Send direct flow error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/webhook", (req, res) => {
  const challenge = req.query["hub.challenge"];
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const env = getEnv();
  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send("Forbidden");
});

router.post("/webhook", async (req, res) => {
  try {
    const payload = req.body;

    // WhatsApp verification challenge
    if (payload["hub.challenge"]) {
      return res.status(200).send(payload["hub.challenge"]);
    }

    // Status update
    if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
      return res.json({ status: "ok" });
    }

    // Flow response
    const flowResponse = parseFlowResponse(payload);
    if (!flowResponse) {
      return res.json({ status: "skipped" });
    }

    const flow = await prisma.whatsAppFlow.findFirst({
      where: { flowSessionId: flowResponse.flowToken },
    });
    if (!flow) {
      return res.json({ status: "flow_not_found" });
    }

    const reviewData = extractReviewFromFlowResponse(flowResponse.responseData);

    const response_ = await prisma.whatsAppFlowResponse.upsert({
      where: { flowId: flow.id },
      create: {
        flowId: flow.id,
        businessId: flow.businessId,
        rating: reviewData.rating,
        liked: reviewData.liked,
        improvement: reviewData.improvement,
        customerName: reviewData.customerName,
        customerEmail: reviewData.customerEmail,
        privateNote: reviewData.privateNote,
        rawResponse: flowResponse.responseData,
      },
      update: {
        rating: reviewData.rating,
        liked: reviewData.liked,
        improvement: reviewData.improvement,
        customerName: reviewData.customerName,
        customerEmail: reviewData.customerEmail,
        privateNote: reviewData.privateNote,
        rawResponse: flowResponse.responseData,
      },
    });

    await prisma.whatsAppFlow.update({
      where: { id: flow.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Also create a feedback entry so it appears in the existing review inbox
    await prisma.feedback.create({
      data: {
        businessId: flow.businessId,
        rating: reviewData.rating,
        liked: reviewData.liked,
        improvement: reviewData.improvement,
        customerName: reviewData.customerName,
        customerEmail: reviewData.customerEmail,
        privateNote: reviewData.privateNote,
        status: reviewData.rating >= 4 ? "REDIRECTED_TO_GOOGLE" : "PRIVATE_FEEDBACK",
      },
    });

    res.json({ status: "ok", response: response_ });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    res.json({ status: "error" });
  }
});

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

