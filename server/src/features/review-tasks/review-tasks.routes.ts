import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { authRequired, AuthRequest } from "../../middleware/auth";

const router = Router();

const createTaskSchema = z.object({
  businessId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  taskType: z.enum(["follow_up", "reply", "review_request"]).default("follow_up"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  source: z.string().optional(),
  referenceId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  assignedTo: z.string().max(100).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["pending", "done", "overdue"]).optional(),
  assignedTo: z.string().max(100).optional(),
  dueAt: z.string().datetime().optional(),
});

router.get("/tasks/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const status = req.query.status as string | undefined;
    const taskType = req.query.taskType as string | undefined;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const where: any = { businessId };
    if (status) where.status = status;
    if (taskType) where.taskType = taskType;

    const tasks = await prisma.reviewTask.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
    });

    res.json({ tasks });
  } catch (err) {
    console.error("List tasks error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const data = createTaskSchema.parse(req.body);

    const business = await prisma.business.findFirst({
      where: { id: data.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const task = await prisma.reviewTask.create({
      data: {
        businessId: data.businessId,
        title: data.title,
        description: data.description || null,
        taskType: data.taskType,
        priority: data.priority,
        source: data.source || null,
        referenceId: data.referenceId || null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        assignedTo: data.assignedTo || null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.userId!,
        businessId: data.businessId,
        action: "review_task_created",
        details: { taskId: task.id, title: data.title },
      },
    });

    res.json({ success: true, task });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Create task error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:taskId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const data = updateTaskSchema.parse(req.body);

    const task = await prisma.reviewTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const business = await prisma.business.findFirst({
      where: { id: task.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const updateData: any = { ...data };
    if (data.dueAt) updateData.dueAt = new Date(data.dueAt);
    if (data.status === "done") updateData.completedAt = new Date();

    const updated = await prisma.reviewTask.update({
      where: { id: taskId },
      data: updateData,
    });

    res.json({ success: true, task: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Update task error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:taskId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const task = await prisma.reviewTask.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const business = await prisma.business.findFirst({
      where: { id: task.businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    await prisma.reviewTask.delete({ where: { id: taskId } });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auto-generate/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;

    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    // Auto-generate tasks from:
    // 1. Negative feedback without replies
    // 2. Google reviews needing reply
    // 3. Overdue WhatsApp flows

    const created: any[] = [];
    const now = new Date();

    // Check for negative feedback (rating <= 3) needing follow-up
    const negativeFeedback = await prisma.feedback.findMany({
      where: {
        businessId,
        rating: { lte: 3 },
        status: "PRIVATE_FEEDBACK",
      },
      take: 20,
    });

    for (const fb of negativeFeedback) {
      const existing = await prisma.reviewTask.findFirst({
        where: { businessId, referenceId: fb.id, taskType: "follow_up" },
      });
      if (!existing) {
        const task = await prisma.reviewTask.create({
          data: {
            businessId,
            title: `Follow up on negative feedback (${fb.rating}★)`,
            description: `Customer rated ${fb.rating}/5. ${fb.improvement ? `Suggestion: ${fb.improvement}` : ""}`,
            taskType: "follow_up",
            priority: "high",
            source: "negative_review",
            referenceId: fb.id,
            dueAt: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48h
          },
        });
        created.push(task);
      }
    }

    // Check for Google reviews needing reply
    const pendingReplies = await prisma.googleReview.findMany({
      where: {
        businessId,
        replyStatus: "NEEDS_REPLY",
        comment: { not: null },
      },
      take: 20,
    });

    for (const gr of pendingReplies) {
      const existing = await prisma.reviewTask.findFirst({
        where: { businessId, referenceId: gr.id, taskType: "reply" },
      });
      if (!existing) {
        const task = await prisma.reviewTask.create({
          data: {
            businessId,
            title: `Reply to ${gr.reviewerName || "Google user"}'s review`,
            description: `Rating: ${gr.starRating}★. "${gr.comment?.substring(0, 100)}"`,
            taskType: "reply",
            priority: gr.starRating <= 3 ? "high" : "normal",
            source: "google_review",
            referenceId: gr.id,
            dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24h
          },
        });
        created.push(task);
      }
    }

    res.json({ success: true, created: created.length, tasks: created });
  } catch (err) {
    console.error("Auto-generate tasks error:", err);
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

    const total = await prisma.reviewTask.count({ where: { businessId } });
    const pending = await prisma.reviewTask.count({ where: { businessId, status: "pending" } });
    const overdue = await prisma.reviewTask.count({ where: { businessId, status: "overdue" } });
    const done = await prisma.reviewTask.count({ where: { businessId, status: "done" } });
    const highPriority = await prisma.reviewTask.count({
      where: { businessId, priority: "high", status: { not: "done" } },
    });

    res.json({ total, pending, overdue, done, highPriority });
  } catch (err) {
    console.error("Task stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


