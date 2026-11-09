import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { authRequired, authOptional, AuthRequest } from "../middleware/auth";
import { sendFeedbackNotification } from "../services/email";
import { sendWhatsAppNotification } from "../services/whatsapp";
import { loadEntitledSubscription } from "../services/subscriptions";
import { sanitizeSelectedSubOptions } from "../utils/review-options";
import {
  classifyFeedback,
} from "../utils/task-classification";
import { normalizeTouchpoint, touchpointLabel } from "../utils/review-touchpoints";

const router = Router();

const submitFeedbackSchema = z.object({
  businessSlug: z.string(),
  rating: z.number().int().min(1).max(5),
  purchaseInfo: z.string().max(500).optional().or(z.literal("")),
  liked: z.string().max(2000).optional().or(z.literal("")),
  improvement: z.string().max(2000).optional().or(z.literal("")),
  customerName: z.string().max(100).optional().or(z.literal("")),
  customerEmail: z.string().email().optional().or(z.literal("")),
  privateNote: z.string().max(5000).optional().or(z.literal("")),
  selectedSubOptions: z.array(z.string().max(80)).max(20).optional(),
  // Readable labels for the selected options. Stored inside `liked` is preferred
  // for analytics, but labels are also used for task/notification copy.
  selectedSubOptionLabels: z.array(z.string().max(120)).max(20).optional(),
  /**
   * Where the QR/link was placed: table | bill | packaging | reception |
   * takeaway | whatsapp | sms | email | link | other. Unknown values are dropped.
   */
  touchpoint: z.string().max(30).optional().or(z.literal("")),
});

router.post("/submit", authOptional, async (req: AuthRequest, res: Response) => {
  try {
    const data = submitFeedbackSchema.parse(req.body);

    const business = await prisma.business.findUnique({
      where: { slug: data.businessSlug },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Only persist options this particular business actually offers. The
    // public client can be stale (or tampered with), so never trust the IDs.
    const selectedIds = sanitizeSelectedSubOptions(
      business.industry,
      business.enabledCategories,
      business.customReviewTopics,
      business.name,
      business.promptTopics,
      data.selectedSubOptions,
    );
    // Align labels to the IDs the client sent, but keep only the IDs that
    // survived validation. This prevents a stale/tampered client from adding
    // readable labels for options the business does not offer.
    const rawIds = data.selectedSubOptions || [];
    const rawLabels = data.selectedSubOptionLabels || [];
    const selectedLabels =
      rawLabels.length === rawIds.length
        ? rawIds
            .map((id, index) => (selectedIds.includes(id) ? rawLabels[index]?.trim() : ""))
            .filter(Boolean)
            .slice(0, 20)
        : [];

    const touchpoint = normalizeTouchpoint(data.touchpoint);
    const touchpointText = touchpoint ? touchpointLabel(touchpoint) : null;

    const feedback = await prisma.feedback.create({
      data: {
        businessId: business.id,
        rating: data.rating,
        purchaseInfo: data.purchaseInfo || null,
        liked: data.liked || null,
        improvement: data.improvement || null,
        customerName: data.customerName || null,
        customerEmail: data.customerEmail || null,
        privateNote: data.privateNote || null,
        selectedSubOptions: selectedIds.length > 0 ? selectedIds : undefined,
        touchpoint,
        status: data.privateNote ? "PRIVATE_FEEDBACK" : "ABANDONED",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: business.userId,
        businessId: business.id,
        action: "feedback_submitted",
        details: { feedbackId: feedback.id, rating: data.rating, touchpoint },
      },
    });

    const commentDetails = data.privateNote || data.improvement || data.liked || undefined;

    const hasComment = !!(commentDetails && commentDetails.trim().length > 0);
    const hasTags = selectedIds.length > 0;
    const tagText = selectedLabels.length > 0 ? selectedLabels.join(", ") : selectedIds.join(", ");
    // Touchpoint (where the QR lived) is placement metadata; purchaseInfo may
    // carry the table number or staff attribution. Never log sensitive data.
    const attributionParts = [touchpointText, data.purchaseInfo].filter(Boolean) as string[];
    const locLabel = attributionParts.length > 0 ? ` [${attributionParts.join(" · ")}]` : "";

    // Critical food safety / allergen keyword detection (applies to ANY rating)
    const CRITICAL_SAFETY_REGEX = /\b(allergen|allergic|allergy|peanut|peanuts|tree\s*nut|gluten|celiac|shellfish|anaphylax|poisoning|food\s*poison|sick|vomit|vomiting|nausea|diarrhea|hospital|er|urgent\s*care|doctor|undercooked|raw\s*chicken|raw\s*pork|blood|bloody|glass|metal|foreign\s*object|plastic\s*in|wire|screw|cockroach|roach|maggot|rat|mouse|rodent|health\s*department|health\s*inspector)\b/i;
    const isCriticalSafety = commentDetails ? CRITICAL_SAFETY_REGEX.test(commentDetails) : false;

    // Multi-signal task triage policy:
    // 1. Critical safety/allergen: always create task with 2h SLA and high priority
    // 2. Rating <= 2 with comments/tags: high priority, 12h SLA
    // 3. Rating <= 2 with NO comments and NO tags: low priority human triage, 48h SLA
    // 4. Rating == 3 with comments/tags: normal priority, 48h SLA
    // 5. Rating == 3 with NO comments and NO tags: NO TASK created (eliminates queue noise)
    // 6. Rating >= 4 with actionable improvement: normal priority suggestion, 72h SLA
    let shouldCreateTask = false;
    let taskTitle = "";
    let taskPriority = "normal";
    let taskSource = "negative_review";
    let taskDueHours = 24;

    if (isCriticalSafety) {
      shouldCreateTask = true;
      taskTitle = `🚨 CRITICAL SAFETY: Guest reported safety/allergen issue${locLabel}`;
      taskPriority = "high";
      taskSource = "food_safety_incident";
      taskDueHours = 2;
    } else if (data.rating <= 2) {
      shouldCreateTask = true;
      if (hasComment || hasTags) {
        taskTitle = `Resolve ${data.rating}★ guest complaint${locLabel}`;
        taskPriority = "high";
        taskSource = "negative_review";
        taskDueHours = 12;
      } else {
        taskTitle = `Triage silent ${data.rating}★ rating${locLabel}`;
        taskPriority = "low";
        taskSource = "uncommented_negative";
        taskDueHours = 48;
      }
    } else if (data.rating === 3) {
      if (hasComment || hasTags) {
        shouldCreateTask = true;
        taskTitle = `Address 3★ guest feedback${locLabel}`;
        taskPriority = "normal";
        taskSource = "neutral_critique";
        taskDueHours = 48;
      } else {
        shouldCreateTask = false; // Do not auto-create tasks on 3-star ratings with no comments
      }
    } else if (data.rating >= 4 && data.improvement && data.improvement.trim().length > 5) {
      shouldCreateTask = true;
      taskTitle = `Review guest suggestion (${data.rating}★)${locLabel}`;
      taskPriority = "normal";
      taskSource = "service_improvement";
      taskDueHours = 72;
    }

    // Classify the issue and merge repeats of the same operational bucket.
    // This is independent of AI credits so free plans still get the loop.
    const classification = classifyFeedback({
      rating: data.rating,
      selectedIds,
      text: [data.improvement, data.liked, data.privateNote, ...selectedLabels]
        .filter(Boolean)
        .join(" "),
      isCriticalSafety,
    });

    if (shouldCreateTask) {
      // Idempotency: a retried request must not double-count the same feedback.
      const existingForFeedback = await prisma.reviewTask.findFirst({
        where: { businessId: business.id, referenceId: feedback.id },
      });

      if (!existingForFeedback) {
        const descParts = [
          isCriticalSafety ? "⚠️ URGENT FOOD SAFETY OR ALLERGEN REPORT" : null,
          `Category: ${classification.label}`,
          data.customerName ? `Guest: ${data.customerName}` : null,
          data.customerEmail ? `Email: ${data.customerEmail}` : null,
          touchpointText ? `Touchpoint: ${touchpointText}` : null,
          data.purchaseInfo ? `Attribution: ${data.purchaseInfo}` : null,
          commentDetails ? `Complaint: "${commentDetails}"` : null,
          hasTags ? `Tags: ${tagText}` : null,
        ].filter(Boolean);

        const description =
          descParts.length > 0
            ? descParts.join(" | ")
            : `Guest submitted ${data.rating}-star feedback needing operational follow-up.`;

        // Only negative/neutral reports and safety incidents represent the same
        // operational issue. A 4–5★ improvement suggestion should not inflate
        // (or escalate) an existing complaint.
        const canMergeRecurring = data.rating <= 3 || isCriticalSafety;
        const existingIssue = canMergeRecurring
          ? await prisma.reviewTask.findFirst({
              where: {
                businessId: business.id,
                issueKey: classification.issueKey,
                status: { in: ["pending", "in_progress", "overdue", "escalated"] },
              },
              orderBy: { updatedAt: "desc" },
            })
          : null;

        if (existingIssue) {
          // Recurring issue: merge instead of creating duplicate queue noise.
          const nextCount = (existingIssue.occurrenceCount || 1) + 1;
          const shouldEscalate = nextCount >= 3;
          const latestLine = [
            new Date().toISOString().slice(0, 10),
            `${data.rating}★`,
            touchpointText ? `via ${touchpointText}` : null,
            commentDetails ? `"${commentDetails}"` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          const mergedDescription =
            `${existingIssue.description ? `${existingIssue.description}\n\n` : ""}Recurring issue (${nextCount}): ${latestLine}`.slice(
              0,
              4000,
            );

          await prisma.reviewTask
            .update({
              where: { id: existingIssue.id },
              data: {
                occurrenceCount: nextCount,
                referenceId: feedback.id,
                description: mergedDescription,
                priority: shouldEscalate ? "high" : existingIssue.priority,
                status: shouldEscalate ? "escalated" : existingIssue.status,
                escalatedAt:
                  shouldEscalate && !existingIssue.escalatedAt
                    ? new Date()
                    : existingIssue.escalatedAt,
                dueAt: shouldEscalate
                  ? new Date(Date.now() + 4 * 60 * 60 * 1000)
                  : existingIssue.dueAt,
                title:
                  shouldEscalate && !existingIssue.title.startsWith("ESCALATED")
                    ? `ESCALATED: ${existingIssue.title}`
                    : existingIssue.title,
              },
            })
            .catch((err) => console.error("Recurring task update failed:", err));

          await prisma.activityLog
            .create({
              data: {
                userId: business.userId,
                businessId: business.id,
                action: "review_task_recurred",
                details: {
                  taskId: existingIssue.id,
                  category: classification.category,
                  issueKey: classification.issueKey,
                  occurrenceCount: nextCount,
                  escalated: shouldEscalate,
                },
              },
            })
            .catch((err) => console.error("Recurring task log failed:", err));
        } else {
          const task = await prisma.reviewTask
            .create({
              data: {
                businessId: business.id,
                title: taskTitle,
                description,
                taskType: "follow_up",
                priority: taskPriority,
                source: taskSource,
                referenceId: feedback.id,
                category: classification.category,
                issueKey: classification.issueKey,
                occurrenceCount: 1,
                dueAt: new Date(Date.now() + taskDueHours * 60 * 60 * 1000),
              },
            })
            .catch((err) => {
              console.error("Auto task creation failed:", err);
              return null;
            });

          if (task) {
            await prisma.activityLog
              .create({
                data: {
                  userId: business.userId,
                  businessId: business.id,
                  action: "review_task_created",
                  details: {
                    taskId: task.id,
                    category: classification.category,
                    issueKey: classification.issueKey,
                  },
                },
              })
              .catch((err) => console.error("Task creation log failed:", err));
          }
        }
      }
    }

    const contextLabel = attributionParts.join(" · ");
    sendFeedbackNotification(business.userId, business.name, data.rating, {
      comment: commentDetails,
      customerName: data.customerName || undefined,
      purchaseInfo: contextLabel || undefined,
    }).catch((err) => {
      console.error("Feedback notification email failure:", err);
    });

    // 🚨 Closed Loop Urgent WhatsApp Alert to Owner
    if ((isCriticalSafety || data.rating <= 2) && business.phoneNumber) {
      const loc = attributionParts.length > 0 ? ` at ${attributionParts.join(" · ")}` : "";
      const prefix = isCriticalSafety ? "🚨 CRITICAL SAFETY ALERT" : "🚨 URGENT BEYONDVYU ALERT";
      const alertMsg = `${prefix}: A customer${loc} left ${data.rating}★ feedback for ${business.name}: "${commentDetails || 'Customer expressed dissatisfaction'}". Immediate operational recovery recommended!`;
      sendWhatsAppNotification(business.phoneNumber, alertMsg).catch((err) => {
        console.warn("Feedback WhatsApp alert error:", err);
      });
    }

    res.status(201).json({ feedback });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error("Submit feedback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/business/:businessId", authRequired, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const business = await prisma.business.findFirst({
      where: { id: businessId, userId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const minRating = req.query.minRating ? parseInt(req.query.minRating as string) : undefined;

    const where: any = { businessId: business.id };
    if (status) where.status = status;
    if (minRating) where.rating = { gte: minRating };
    if (search) {
      where.OR = [
        { liked: { contains: search, mode: "insensitive" } },
        { improvement: { contains: search, mode: "insensitive" } },
        { purchaseInfo: { contains: search, mode: "insensitive" } },
        { touchpoint: { contains: search, mode: "insensitive" } },
      ];
    }

    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          reviewDraft: true,
          generatedReply: true,
          _count: { select: { reviewClicks: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      feedback,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Get feedback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/public/:slug", async (req: AuthRequest, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        userId: true,
        name: true,
        slug: true,
        googleReviewUrl: true,
        googlePlaceId: true,
        industry: true,
        promptTopics: true,
        enabledCategories: true,
        customReviewTopics: true,
        phoneNumber: true,
        logoUrl: true,
        primaryColor: true,
        backgroundColor: true,
        splashTagline: true,
        showPoweredBy: true,
      },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Never expose the owner's internal user id to an unauthenticated caller.
    const { userId, ...publicBusiness } = business;

    // When googlePlaceId is set, always derive the review URL from it
    // so that updating placeId in settings immediately takes effect
    // on the customer-facing QR code and review link.
    const googleReviewUrl = publicBusiness.googlePlaceId
      ? `https://search.google.com/local/writereview?placeid=${publicBusiness.googlePlaceId}`
      : publicBusiness.googleReviewUrl;

    // Only expose the fields the public page needs. The previous version
    // returned the entire subscription row (Razorpay ids, auto-recharge
    // settings, user id) to anyone who knew the QR slug.
    const subRow = await loadEntitledSubscription(userId);
    const subscription = subRow
      ? {
          status: subRow.status,
          creditsLimit: subRow.creditsLimit,
          creditsUsed: subRow.creditsUsed,
          creditsTopUpBalance: subRow.creditsTopUpBalance,
        }
      : null;

    res.json({ business: { ...publicBusiness, googleReviewUrl, subscription } });
  } catch (err) {
    console.error("Get public business error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
