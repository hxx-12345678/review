import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/database";
import { getEnv } from "../../config/env";
import { authRequired, AuthRequest } from "../../middleware/auth";
import { classifyFeedback, TASK_CATEGORIES } from "../../utils/task-classification";
import { clampReportDays, loadIssueReport, sendOwnerDigest } from "../../services/issue-report-service";
import { postResolutionCutoff } from "../../utils/recurrence";

const router = Router();

const taskCategorySchema = z.enum(TASK_CATEGORIES);

const createTaskSchema = z.object({
  businessId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  taskType: z.enum(["follow_up", "reply", "review_request"]).default("follow_up"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  source: z.string().optional(),
  referenceId: z.string().optional(),
  category: taskCategorySchema.optional(),
  dueAt: z.string().datetime().optional(),
  assignedTo: z.string().max(100).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "overdue", "escalated", "done"]).optional(),
  category: taskCategorySchema.optional(),
  assignedTo: z.string().max(100).nullable().optional(),
  resolutionNotes: z.string().max(2000).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

const STATUS_RANK: Record<string, number> = {
  escalated: 0,
  overdue: 1,
  in_progress: 2,
  pending: 3,
  done: 4,
};

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

    const tasks = await prisma.reviewTask.findMany({ where });

    // Surface the operational context the owner needs to act, not just the
    // task title. Reference IDs are feedback IDs for auto-created tasks.
    const referenceIds = tasks
      .map((task) => task.referenceId)
      .filter((id): id is string => Boolean(id));
    const feedbackRows = referenceIds.length
      ? await prisma.feedback.findMany({
          where: { id: { in: referenceIds } },
          select: {
            id: true,
            rating: true,
            liked: true,
            improvement: true,
            privateNote: true,
            customerName: true,
            purchaseInfo: true,
            touchpoint: true,
            createdAt: true,
          },
        })
      : [];
    const feedbackById = new Map(feedbackRows.map((row) => [row.id, row]));

    const enriched = tasks
      .map((task) => ({
        ...task,
        feedback: task.referenceId ? feedbackById.get(task.referenceId) || null : null,
      }))
      .sort((a, b) => {
        const rank = (STATUS_RANK[a.status] ?? 5) - (STATUS_RANK[b.status] ?? 5);
        if (rank !== 0) return rank;
        if (a.priority !== b.priority) {
          const priorityRank: Record<string, number> = { high: 0, normal: 1, low: 2 };
          return (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
        }
        const aDue = a.dueAt ? a.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueAt ? b.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      });

    res.json({ tasks: enriched });
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
        category: data.category || null,
        issueKey: data.category || null,
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

    // The differentiator is an auditable loop, not a checkbox. Closing a
    // classified operational issue requires some record of what was done.
    if (
      data.status === "done" &&
      task.category &&
      !data.resolutionNotes?.trim() &&
      !task.resolutionNotes?.trim()
    ) {
      return res
        .status(400)
        .json({ error: "Add resolution notes before closing this issue" });
    }

    const updateData: any = { ...data };
    if (data.dueAt !== undefined) {
      updateData.dueAt = data.dueAt ? new Date(data.dueAt) : null;
    }
    if (data.status === "done") {
      updateData.completedAt = new Date();
    } else if (data.status) {
      // Reopening or moving to in-progress/escalated clears the completion stamp.
      updateData.completedAt = null;
    }
    if (data.status === "escalated") {
      updateData.escalatedAt = task.escalatedAt || new Date();
      updateData.priority = data.priority || "high";
    }
    if (data.category !== undefined) {
      updateData.issueKey = data.category || null;
    }

    const updated = await prisma.reviewTask.update({
      where: { id: taskId },
      data: updateData,
    });

    await prisma.activityLog
      .create({
        data: {
          userId: req.userId!,
          businessId: task.businessId,
          action: "review_task_updated",
          details: {
            taskId: task.id,
            status: updated.status,
            priority: updated.priority,
            resolvedWithNotes: Boolean(updated.resolutionNotes),
          },
        },
      })
      .catch((err) => console.error("Task update log failed:", err));

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

    // First, age any open task whose SLA has passed. This keeps the queue
    // honest even if nobody opens the dashboard for a few days.
    await prisma.reviewTask
      .updateMany({
        where: {
          businessId,
          status: { in: ["pending", "in_progress"] },
          dueAt: { lt: now },
        },
        data: { status: "overdue" },
      })
      .catch((err) => console.error("Overdue task sweep failed:", err));

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
        const selectedIds = Array.isArray(fb.selectedSubOptions)
          ? (fb.selectedSubOptions as string[])
          : [];
        const classification = classifyFeedback({
          rating: fb.rating,
          selectedIds,
          text: [fb.improvement, fb.liked, fb.privateNote].filter(Boolean).join(" "),
        });

        // If an open task already covers this operational bucket, don't add
        // duplicate queue noise. Live submissions merge recurrences; this
        // backfill only creates the first task per bucket.
        const existingIssue = await prisma.reviewTask.findFirst({
          where: {
            businessId,
            issueKey: classification.issueKey,
            status: { in: ["pending", "in_progress", "overdue", "escalated"] },
          },
        });
        if (existingIssue) continue;

        const priorResolved = await prisma.reviewTask.findFirst({
          where: {
            businessId,
            issueKey: classification.issueKey,
            status: "done",
            completedAt: { gte: postResolutionCutoff() },
          },
          orderBy: { completedAt: "desc" },
          select: { id: true },
        });

        const task = await prisma.reviewTask.create({
          data: {
            businessId,
            title: `Follow up on negative feedback (${fb.rating}★)`,
            description: `Customer rated ${fb.rating}/5. ${fb.improvement ? `Suggestion: ${fb.improvement}` : ""}`,
            taskType: "follow_up",
            priority: "high",
            source: "negative_review",
            referenceId: fb.id,
            category: classification.category,
            issueKey: classification.issueKey,
            recurredAfterResolution: Boolean(priorResolved),
            previousTaskId: priorResolved?.id || null,
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
    const inProgress = await prisma.reviewTask.count({ where: { businessId, status: "in_progress" } });
    const overdue = await prisma.reviewTask.count({ where: { businessId, status: "overdue" } });
    const escalated = await prisma.reviewTask.count({ where: { businessId, status: "escalated" } });
    const done = await prisma.reviewTask.count({ where: { businessId, status: "done" } });
    const highPriority = await prisma.reviewTask.count({
      where: { businessId, priority: "high", status: { not: "done" } },
    });
    const recurring = await prisma.reviewTask.count({
      where: { businessId, occurrenceCount: { gte: 2 }, status: { not: "done" } },
    });

    res.json({ total, pending, inProgress, overdue, escalated, done, highPriority, recurring });
  } catch (err) {
    console.error("Task stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Owner report: recurring problems, resolution performance, and what still
 * needs a manager. This is the recurring-value surface — the queue itself
 * lives at /tasks/:businessId.
 */
router.get("/report/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const days = clampReportDays(req.query.days, 30);
    const report = await loadIssueReport(businessId, days);
    res.json({ report });
  } catch (err) {
    console.error("Issue report error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Email the same owner summary. On-demand today; a weekly cron can call the
 * same service for every active business.
 */
router.post("/digest/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const days = clampReportDays(req.body?.days ?? req.query.days, 7);
    const dashboardUrl = `${getEnv().FRONTEND_URL.split(",")[0].trim()}/v2/tasks`;
    const result = await sendOwnerDigest(businessId, days, dashboardUrl);

    if (!result.sent) {
      const status = result.error === "SMTP not configured" ? 503 : 500;
      return res.status(status).json({ error: result.error || "Could not send digest" });
    }

    res.json({ sent: true, subject: result.subject });
  } catch (err) {
    console.error("Owner digest error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;


