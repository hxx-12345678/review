import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { authRequired, AuthRequest } from "../../middleware/auth";

const router = Router();

const replySchema = z.object({
  messageId: z.string().min(1),
  replyText: z.string().min(1).max(2000),
});

router.get("/messages/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const platform = req.query.platform as string | undefined;
    const status = req.query.status as string | undefined;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const where: any = { businessId };
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const messages = await prisma.crossPlatformMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ messages });
  } catch (err) {
    console.error("List messages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/conversations/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const messages = await prisma.crossPlatformMessage.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });

    // Group by conversationId, then by platform within each group
    const grouped: Record<string, any> = {};
    for (const msg of messages) {
      const convId = msg.conversationId || msg.platform;
      if (!grouped[convId]) {
        grouped[convId] = {
          conversationId: convId,
          platform: msg.platform,
          authorName: msg.authorName || "Unknown",
          messages: [],
          lastMessageAt: msg.createdAt,
          unread: 0,
        };
      }
      if (msg.status === "unread") grouped[convId].unread++;
      if (new Date(msg.createdAt) > new Date(grouped[convId].lastMessageAt)) {
        grouped[convId].lastMessageAt = msg.createdAt;
        grouped[convId].platform = msg.platform;
        grouped[convId].authorName = msg.authorName || grouped[convId].authorName;
      }
      grouped[convId].messages.push(msg);
    }

    const conversations = Object.values(grouped).sort(
      (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );

    res.json({ conversations });
  } catch (err) {
    console.error("List conversations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reply", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = replySchema.parse(req.body);

    const message = await prisma.crossPlatformMessage.findUnique({
      where: { id: data.messageId },
    });
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    const business = await prisma.business.findFirst({
      where: { id: message.businessId, userId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const updated = await prisma.crossPlatformMessage.update({
      where: { id: data.messageId },
      data: {
        replyText: data.replyText,
        repliedAt: new Date(),
        status: "replied",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: business.id,
        action: "cross_platform_reply",
        details: { messageId: data.messageId, platform: message.platform },
      },
    });

    res.json({ success: true, message: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Reply error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/messages/:messageId/read", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const messageId = req.params.messageId as string;
    const message = await prisma.crossPlatformMessage.findUnique({ where: { id: messageId } });
    if (!message) return res.status(404).json({ error: "Message not found" });

    await prisma.crossPlatformMessage.update({
      where: { id: messageId },
      data: { status: "read" },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const total = await prisma.crossPlatformMessage.count({ where: { businessId } });
    const unread = await prisma.crossPlatformMessage.count({
      where: { businessId, status: "unread" },
    });
    const byPlatform = await prisma.crossPlatformMessage.groupBy({
      by: ["platform"],
      where: { businessId },
      _count: true,
    });

    res.json({
      total,
      unread,
      byPlatform: byPlatform.map((p) => ({ platform: p.platform, count: p._count })),
    });
  } catch (err) {
    console.error("Inbox stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


