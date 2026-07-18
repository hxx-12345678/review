import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { authRequired, AuthRequest } from "../../middleware/auth";

const router = Router();

const replySchema = z.object({
  mentionId: z.string().min(1),
  replyText: z.string().min(1).max(1000),
});

function qs(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0];
  return undefined;
}

function getInstagramBaseUrl(): string {
  return "https://graph.facebook.com/v21.0";
}

async function fetchInstagramMedia(
  igBusinessAccountId: string,
  accessToken: string,
): Promise<any[]> {
  const url = `${getInstagramBaseUrl()}/${igBusinessAccountId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,comments_count,username&access_token=${accessToken}&limit=50`;
  const res = await fetch(url);
  const data: any = await res.json();
  return data.data || [];
}

async function fetchInstagramComments(
  mediaId: string,
  accessToken: string,
): Promise<any[]> {
  const url = `${getInstagramBaseUrl()}/${mediaId}/comments?fields=id,text,username,from,timestamp,parent_id&access_token=${accessToken}&limit=100`;
  const res = await fetch(url);
  const data: any = await res.json();
  return data.data || [];
}

async function postInstagramReply(
  commentId: string,
  mediaId: string,
  replyText: string,
  accessToken: string,
): Promise<boolean> {
  try {
    const env = getEnv();
    const igUserId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    if (!igUserId) return false;
    const url = `${getInstagramBaseUrl()}/${igUserId}/mentions`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment_id: commentId,
        media_id: mediaId,
        message: replyText,
        access_token: accessToken,
      }),
    });
    const data: any = await res.json();
    return !!data.id;
  } catch {
    return false;
  }
}

function extractMentions(text: string): string[] {
  const regex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

router.get("/sync/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const env = getEnv();
    if (!env.INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      return res.status(400).json({ error: "Instagram not configured" });
    }
    if (!env.WHATSAPP_API_TOKEN) {
      return res.status(400).json({ error: "Instagram access token not configured" });
    }

    const accessToken = env.WHATSAPP_API_TOKEN;
    const igAccountId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    const media = await fetchInstagramMedia(igAccountId, accessToken);
    const synced: string[] = [];
    const mentions: any[] = [];

    for (const item of media) {
      const comments = await fetchInstagramComments(item.id, accessToken);

      for (const comment of comments) {
        const foundMentions = extractMentions(comment.text || "");
        if (foundMentions.length === 0) continue;

        const existing = await prisma.instagramMention.findUnique({
          where: { igCommentId: comment.id },
        });
        if (existing) continue;

        const mention = await prisma.instagramMention.create({
          data: {
            businessId,
            igMediaId: item.id,
            igCommentId: comment.id,
            mentionerName: comment.from?.username || comment.username || "unknown",
            mentionerIgId: comment.from?.id || "unknown",
            commentText: comment.text || "",
            mediaType: (item.media_type || "image").toLowerCase(),
            mediaUrl: item.media_url || null,
            permalink: item.permalink || null,
            isReply: !!comment.parent_id,
            parentCommentId: comment.parent_id || null,
          },
        });
        synced.push(mention.id);
        mentions.push(mention);
      }
    }

    res.json({ success: true, synced: synced.length, mentions });
  } catch (err) {
    console.error("Instagram sync error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/mentions/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const replied = qs(req.query.replied);

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const where: Record<string, unknown> = { businessId };
    if (replied === "true") where.replied = true;
    else if (replied === "false") where.replied = false;

    const mentions = await prisma.instagramMention.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ mentions });
  } catch (err) {
    console.error("List mentions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reply", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = replySchema.parse(req.body);

    const mention = await prisma.instagramMention.findUnique({
      where: { id: data.mentionId },
    });
    if (!mention) return res.status(404).json({ error: "Mention not found" });

    const business = await prisma.business.findFirst({
      where: { id: mention.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const env = getEnv();
    if (!env.WHATSAPP_API_TOKEN) {
      return res.status(400).json({ error: "Instagram API not configured" });
    }

    const success = await postInstagramReply(mention.igCommentId!, mention.igMediaId, data.replyText, env.WHATSAPP_API_TOKEN);
    if (!success) {
      return res.status(502).json({ error: "Failed to post reply to Instagram" });
    }

    const updated = await prisma.instagramMention.update({
      where: { id: data.mentionId },
      data: { replied: true, replyText: data.replyText, repliedAt: new Date() },
    });

    res.json({ success: true, mention: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Instagram reply error:", err);
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

    const total = await prisma.instagramMention.count({ where: { businessId } });
    const unreplied = await prisma.instagramMention.count({
      where: { businessId, replied: false },
    });
    const positive = await prisma.instagramMention.count({
      where: { businessId, sentiment: "positive" },
    });
    const negative = await prisma.instagramMention.count({
      where: { businessId, sentiment: "negative" },
    });

    res.json({ total, unreplied, positive, negative });
  } catch (err) {
    console.error("Instagram stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/webhook", (req, res) => {
  const env = getEnv();
  const mode = qs(req.query["hub.mode"]);
  const token = qs(req.query["hub.verify_token"]);
  const challenge = qs(req.query["hub.challenge"]);

  if (mode === "subscribe" && token === env.INSTAGRAM_WEBHOOK_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send("Forbidden");
});

router.post("/webhook", async (req, res) => {
  try {
    const payload: any = req.body;

    if (payload?.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          if (change.field === "mentions") {
            const value = change.value;
            if (value?.media_id && value?.comment_id) {
              const existing = await prisma.instagramMention.findUnique({
                where: { igCommentId: value.comment_id },
              });
              if (!existing) {
                await prisma.instagramMention.create({
                  data: {
                    businessId: "pending_lookup",
                    igMediaId: value.media_id,
                    igCommentId: value.comment_id,
                    mentionerName: value.username || "unknown",
                    mentionerIgId: value.from_id || "unknown",
                    commentText: value.text || "",
                    mediaType: value.media_type || "image",
                    isReply: !!value.parent_id,
                    parentCommentId: value.parent_id || null,
                  },
                });
              }
            }
          }
        }
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error("Instagram webhook error:", err);
    res.json({ status: "error" });
  }
});

export default router;
