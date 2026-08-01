import { Router, Response } from "express";
import { prisma } from "../config/database";
import { adminAuthRequired, AdminRequest } from "../middleware/admin";

const router = Router();
router.use(adminAuthRequired);

const DAY = 86400000;

// Core actions that define "getting value" for BeyondVyu (review management OS)
const CORE_ACTIONS = new Set([
  "feedback_submitted",
  "review_request_email_sent",
  "review_request_sms_sent",
  "qr_generated",
  "draft_generated",
  "reply_generated",
  "insights_generated",
  "google_review_replied",
  "google_click",
  "gbp_reply_posted",
  "cross_platform_reply",
  "whatsapp_flow_sent",
  "multi_platform_sms_sent",
  "multi_platform_email_sent",
  "multi_platform_whatsapp_sent",
  "review_task_created",
]);

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function fmtDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): { day: string; value: number }[] {
  const out: { day: string; value: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push({ day: fmtDay(daysAgo(i)), value: 0 });
  }
  return out;
}

function monthKey(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function lastNMonths(n: number): { month: string; value: number }[] {
  const out: { month: string; value: number }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ month: monthKey(m), value: 0 });
  }
  return out;
}

// ─── Overview ──────────────────────────────────────────────────────────────────
router.get("/analytics/overview", async (_req: AdminRequest, res: Response) => {
  try {
    const now = new Date();

    const [users, sessions, activityLogs, businesses, feedback, qrCodes, subscriptions, invoices] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, createdAt: true, showLitePlan: true } }),
      prisma.session.findMany({ where: { createdAt: { gte: daysAgo(30) } }, select: { userId: true, createdAt: true } }),
      prisma.activityLog.findMany({ where: { createdAt: { gte: daysAgo(30) } }, select: { userId: true, action: true, createdAt: true } }),
      prisma.business.findMany({ select: { id: true, userId: true, createdAt: true } }),
      prisma.feedback.findMany({ select: { id: true, businessId: true, createdAt: true } }),
      prisma.qrCode.findMany({ select: { id: true, businessId: true } }),
      prisma.subscription.findMany({
        where: { status: "active" },
        select: { id: true, userId: true, plan: { select: { price: true, interval: true } }, createdAt: true },
      }),
      prisma.invoice.findMany({ select: { amount: true, status: true, createdAt: true } }),
    ]);

    // ── NSM: weekly active businesses that collected a review ──
    const feedbackByBiz = new Map<string, string>();
    for (const f of feedback) {
      const cur = feedbackByBiz.get(f.businessId);
      if (!cur || f.createdAt > new Date(cur)) feedbackByBiz.set(f.businessId, f.createdAt.toISOString());
    }
    const nsmCutoff = Date.now() - 7 * DAY;
    const nsmThisWeek = [...feedbackByBiz.values()].filter((t) => new Date(t).getTime() >= nsmCutoff).length;
    const nsmLastWeek = [...feedbackByBiz.values()].filter(
      (t) => new Date(t).getTime() < nsmCutoff && new Date(t).getTime() >= nsmCutoff - 7 * DAY,
    ).length;
    const nsmTrend = lastNMonths(12);
    for (const f of feedback) {
      const k = monthKey(f.createdAt);
      const row = nsmTrend.find((r) => r.month === k);
      if (row) row.value += 1;
    }

    // ── MRR (from active subs, annualized to monthly) ──
    let mrr = 0;
    for (const s of subscriptions) {
      const price = s.plan?.price || 0;
      mrr += s.plan?.interval === "year" ? price / 12 : price;
    }
    const mrrTrend = lastNMonths(12);
    for (const inv of invoices) {
      if (inv.status === "captured") {
        const k = monthKey(inv.createdAt);
        const row = mrrTrend.find((r) => r.month === k);
        if (row) row.value += inv.amount / 100;
      }
    }
    const mrrInr = Math.round(mrr) / 100;
    const currentMrr = mrrTrend[mrrTrend.length - 1]?.value ?? 0;
    const mrrValue = currentMrr > 0 ? currentMrr : mrrInr;

    // ── Activation: users with ≥1 business AND ≥1 review collected ──
    const bizByUser = new Map<string, string[]>();
    for (const b of businesses) {
      const arr = bizByUser.get(b.userId) || [];
      arr.push(b.id);
      bizByUser.set(b.userId, arr);
    }
    const fbByBiz = new Set(feedback.map((f) => f.businessId));
    const activated = users.filter((u) => {
      const bizs = bizByUser.get(u.id) || [];
      return bizs.length > 0 && bizs.some((b) => fbByBiz.has(b));
    }).length;
    const activationRate = users.length ? Math.round((activated / users.length) * 100) : 0;

    // ── Stickiness (DAU/MAU) from sessions ──
    const mauSet = new Set(sessions.map((s) => s.userId));
    const mau = mauSet.size;
    const dauSeries = lastNDays(30);
    const sessionByDay = new Map<string, Set<string>>();
    for (const s of sessions) {
      const k = fmtDay(s.createdAt);
      const set = sessionByDay.get(k) || new Set<string>();
      set.add(s.userId);
      sessionByDay.set(k, set);
    }
    for (const row of dauSeries) {
      row.value = sessionByDay.get(row.day)?.size || 0;
    }
    const avgDau = dauSeries.reduce((s, r) => s + r.value, 0) / 30;
    const stickiness = mau ? Math.round((avgDau / mau) * 100) : 0;

    // ── Signups / active users / reviews trends ──
    const signupsTrend = lastNDays(30);
    for (const u of users) {
      const k = fmtDay(u.createdAt);
      const row = signupsTrend.find((r) => r.day === k);
      if (row) row.value += 1;
    }
    const activeUsersTrend = lastNDays(30);
    for (const s of sessions) {
      const k = fmtDay(s.createdAt);
      const row = activeUsersTrend.find((r) => r.day === k);
      if (row) row.value += 1;
    }
    const reviewsTrend = lastNDays(30);
    for (const f of feedback) {
      const k = fmtDay(f.createdAt);
      const row = reviewsTrend.find((r) => r.day === k);
      if (row) row.value += 1;
    }

    // WoW deltas
    const sum = (arr: { value: number }[], from: number, to: number) =>
      arr.slice(-to, -from).reduce((s, r) => s + r.value, 0);
    const signupsThisWeek = sum(signupsTrend, 0, 7);
    const signupsLastWeek = sum(signupsTrend, 7, 14);
    const activeThisWeek = sum(activeUsersTrend, 0, 7);
    const activeLastWeek = sum(activeUsersTrend, 7, 14);
    const reviewsThisWeek = sum(reviewsTrend, 0, 7);
    const reviewsLastWeek = sum(reviewsTrend, 7, 14);
    const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

    res.json({
      nsm: {
        value: nsmThisWeek,
        delta: nsmLastWeek > 0 ? Math.round(((nsmThisWeek - nsmLastWeek) / nsmLastWeek) * 100) : null,
        trend: nsmTrend,
      },
      mrr: {
        value: mrrValue,
        trend: mrrTrend,
      },
      activationRate,
      stickiness,
      mau,
      avgDau: Math.round(avgDau),
      users: { total: users.length, trend: signupsTrend },
      activeUsers: { trend: activeUsersTrend },
      reviews: { trend: reviewsTrend },
      deltas: {
        signups: { current: signupsThisWeek, previous: signupsLastWeek, pct: pct(signupsThisWeek, signupsLastWeek) },
        active: { current: activeThisWeek, previous: activeLastWeek, pct: pct(activeThisWeek, activeLastWeek) },
        reviews: { current: reviewsThisWeek, previous: reviewsLastWeek, pct: pct(reviewsThisWeek, reviewsLastWeek) },
      },
    });
  } catch (err) {
    console.error("Admin analytics overview error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Activation Funnel ─────────────────────────────────────────────────────────
router.get("/analytics/funnel", async (_req: AdminRequest, res: Response) => {
  try {
    const [users, businesses, qrCodes, feedback, reviewClicks] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, createdAt: true } }),
      prisma.business.findMany({ select: { id: true, userId: true } }),
      prisma.qrCode.findMany({ select: { id: true, businessId: true } }),
      prisma.feedback.findMany({ select: { id: true, businessId: true } }),
      prisma.reviewClick.findMany({ select: { id: true, businessId: true } }),
    ]);

    const bizByUser = new Map<string, string[]>();
    for (const b of businesses) {
      const arr = bizByUser.get(b.userId) || [];
      arr.push(b.id);
      bizByUser.set(b.userId, arr);
    }
    const userOfBiz = new Map(businesses.map((b) => [b.id, b.userId]));
    const qrBizs = new Set(qrCodes.map((q) => q.businessId));
    const fbBizs = new Set(feedback.map((f) => f.businessId));
    const clickBizs = new Set(reviewClicks.map((c) => c.businessId));

    const withBusiness = users.filter((u) => (bizByUser.get(u.id) || []).length > 0);
    const withQr = users.filter((u) => (bizByUser.get(u.id) || []).some((b) => qrBizs.has(b)));
    const withFeedback = users.filter((u) => (bizByUser.get(u.id) || []).some((b) => fbBizs.has(b)));
    const withClick = users.filter((u) => (bizByUser.get(u.id) || []).some((b) => clickBizs.has(b)));

    const steps = [
      { key: "signup", label: "Signed up", value: users.length, pctOfPrev: null as number | null },
      { key: "business", label: "Created a business", value: withBusiness.length, pctOfPrev: users.length ? Math.round((withBusiness.length / users.length) * 100) : 0 },
      { key: "qr", label: "Generated a QR code", value: withQr.length, pctOfPrev: withBusiness.length ? Math.round((withQr.length / withBusiness.length) * 100) : 0 },
      { key: "feedback", label: "Collected a review", value: withFeedback.length, pctOfPrev: withQr.length ? Math.round((withFeedback.length / withQr.length) * 100) : 0 },
      { key: "click", label: "Customer clicked to Google", value: withClick.length, pctOfPrev: withFeedback.length ? Math.round((withClick.length / withFeedback.length) * 100) : 0 },
    ];

    res.json({ steps, activationRate: users.length ? Math.round((withFeedback.length / users.length) * 100) : 0 });
  } catch (err) {
    console.error("Admin analytics funnel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Engagement ────────────────────────────────────────────────────────────────
router.get("/analytics/engagement", async (_req: AdminRequest, res: Response) => {
  try {
    const [sessions30, sessions7, activity30, users] = await Promise.all([
      prisma.session.findMany({ where: { createdAt: { gte: daysAgo(30) } }, select: { userId: true, createdAt: true } }),
      prisma.session.findMany({ where: { createdAt: { gte: daysAgo(7) } }, select: { userId: true } }),
      prisma.activityLog.findMany({ where: { createdAt: { gte: daysAgo(30) } }, select: { userId: true, action: true, createdAt: true } }),
      prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, email: true, name: true } }),
    ]);

    const mau = new Set(sessions30.map((s) => s.userId));
    const wau = new Set(sessions7.map((s) => s.userId));
    const dauSeries = lastNDays(30);
    const byDay = new Map<string, Set<string>>();
    for (const s of sessions30) {
      const k = fmtDay(s.createdAt);
      const set = byDay.get(k) || new Set<string>();
      set.add(s.userId);
      byDay.set(k, set);
    }
    for (const row of dauSeries) row.value = byDay.get(row.day)?.size || 0;
    const avgDau = dauSeries.reduce((s, r) => s + r.value, 0) / 30;
    const stickiness = mau.size ? Math.round((avgDau / mau.size) * 100) : 0;
    const weeklyStickiness = mau.size ? Math.round((wau.size / mau.size) * 100) : 0;

    // Actions per active user
    const activeUsers = mau.size;
    const actionsPerUser = activeUsers ? Math.round((activity30.length / activeUsers) * 10) / 10 : 0;

    // Feature adoption by action type
    const actionCount = new Map<string, number>();
    const actionUsers = new Map<string, Set<string>>();
    for (const a of activity30) {
      actionCount.set(a.action, (actionCount.get(a.action) || 0) + 1);
      const set = actionUsers.get(a.action) || new Set<string>();
      set.add(a.userId);
      actionUsers.set(a.action, set);
    }
    const featureAdoption = [...actionCount.entries()]
      .map(([action, count]) => ({
        action,
        count,
        users: actionUsers.get(action)?.size || 0,
        adoptionRate: mau.size ? Math.round(((actionUsers.get(action)?.size || 0) / mau.size) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Power users (by activity volume, last 30 days)
    const userActivity = new Map<string, number>();
    for (const a of activity30) userActivity.set(a.userId, (userActivity.get(a.userId) || 0) + 1);
    const powerUsers = [...userActivity.entries()]
      .map(([userId, count]) => {
        const u = users.find((x) => x.id === userId);
        return { userId, email: u?.email || "unknown", name: u?.name, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Actions trend: total activity per day over 30 days
    const actionsTrend = lastNDays(30);
    const activityByDay = new Map<string, number>();
    for (const a of activity30) {
      const k = fmtDay(a.createdAt);
      activityByDay.set(k, (activityByDay.get(k) || 0) + 1);
    }
    for (const row of actionsTrend) row.value = activityByDay.get(row.day) || 0;

    // Weekly stickiness trend: rolling WAU/MAU per week over last 8 weeks
    const sessions45 = await prisma.session.findMany({ where: { createdAt: { gte: daysAgo(45) } }, select: { userId: true, createdAt: true } });
    const weeklyStickinessTrend: { week: string; value: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekEnd = Date.now() - w * 7 * DAY;
      const weekStart = weekEnd - 7 * DAY;
      const wauSet = new Set(sessions45.filter((s) => s.createdAt.getTime() >= weekStart && s.createdAt.getTime() < weekEnd).map((s) => s.userId));
      const mauSet = new Set(sessions45.filter((s) => s.createdAt.getTime() >= weekStart - 23 * DAY && s.createdAt.getTime() < weekEnd).map((s) => s.userId));
      const value = mauSet.size ? Math.round((wauSet.size / mauSet.size) * 100) : 0;
      const label = new Date(weekStart);
      weeklyStickinessTrend.push({ week: `${label.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, value });
    }

    res.json({
      dau: dauSeries,
      mau: mau.size,
      wau: wau.size,
      avgDau: Math.round(avgDau),
      stickiness,
      weeklyStickiness,
      weeklyStickinessTrend,
      actionsPerUser,
      actionsTrend,
      featureAdoption,
      powerUsers,
    });
  } catch (err) {
    console.error("Admin analytics engagement error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Cohort Retention ──────────────────────────────────────────────────────────
router.get("/analytics/cohorts", async (_req: AdminRequest, res: Response) => {
  try {
    const [users, sessions, activityLogs, businesses, feedback] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, createdAt: true } }),
      prisma.session.findMany({ select: { userId: true, createdAt: true } }),
      prisma.activityLog.findMany({ select: { userId: true, createdAt: true } }),
      prisma.business.findMany({ select: { id: true, userId: true } }),
      prisma.feedback.findMany({ select: { businessId: true } }),
    ]);

    // "Active" in a month = had a session or an activity log that month
    const activeMonths = new Map<string, Set<string>>();
    const mark = (userId: string, d: Date) => {
      const k = monthKey(d);
      const set = activeMonths.get(userId) || new Set<string>();
      set.add(k);
      activeMonths.set(userId, set);
    };
    for (const s of sessions) mark(s.userId, s.createdAt);
    for (const a of activityLogs) mark(a.userId, a.createdAt);

    const fbBizs = new Set(feedback.map((f) => f.businessId));
    const bizByUser = new Map<string, string[]>();
    for (const b of businesses) {
      const arr = bizByUser.get(b.userId) || [];
      arr.push(b.id);
      bizByUser.set(b.userId, arr);
    }
    const activatedUsers = new Set(
      users.filter((u) => (bizByUser.get(u.id) || []).some((b) => fbBizs.has(b))).map((u) => u.id),
    );

    // Build cohort rows (last 12 cohort months), all in UTC to match monthKey()
    const now = new Date();
    const nowUTC = new Date();
    const nowKey = monthKey(now);
    const cohortRows: { cohort: string; size: number; activated: number; retention: (number | null)[] }[] = [];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth() - i, 1));
      const key = monthKey(m);
      const cohortUsers = users.filter((u) => monthKey(u.createdAt) === key);
      if (!cohortUsers.length) continue;
      const retention: (number | null)[] = [];
      for (let off = 0; off < 12; off++) {
        const period = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + off, 1));
        const pkey = monthKey(period);
        if (pkey > nowKey) {
          retention.push(null);
          continue;
        }
        const count = cohortUsers.filter((u) => activeMonths.get(u.id)?.has(pkey)).length;
        retention.push(Math.round((count / cohortUsers.length) * 100));
      }
      cohortRows.push({
        cohort: key,
        size: cohortUsers.length,
        activated: cohortUsers.filter((u) => activatedUsers.has(u.id)).length,
        retention,
      });
    }

    // Retention over absolute calendar months since cohort signup, averaged
    const allRetention = (isActivated: boolean) => {
      const eligible = users.filter((u) => activatedUsers.has(u.id) === isActivated);
      const out: (number | null)[] = [];
      for (let off = 0; off <= 11; off++) {
        const numerators: number[] = [];
        let denominator = 0;
        for (const u of eligible) {
          const cohort = new Date(Date.UTC(u.createdAt.getUTCFullYear(), u.createdAt.getUTCMonth(), 1));
          const target = new Date(Date.UTC(cohort.getUTCFullYear(), cohort.getUTCMonth() + off, 1));
          if (target > now) continue;
          denominator += 1;
          if (activeMonths.get(u.id)?.has(monthKey(target))) numerators.push(1);
        }
        if (denominator === 0) out.push(null);
        else out.push(Math.round((numerators.length / denominator) * 100));
      }
      return out;
    };

    res.json({
      cohorts: cohortRows,
      activatedRetention: allRetention(true),
      nonActivatedRetention: allRetention(false),
    });
  } catch (err) {
    console.error("Admin analytics cohorts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Churn Risk ────────────────────────────────────────────────────────────────
router.get("/analytics/churn", async (_req: AdminRequest, res: Response) => {
  try {
    const [users, sessions90, activity90, subscriptions, invoices] = await Promise.all([
      prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, email: true, name: true, createdAt: true, showLitePlan: true } }),
      prisma.session.findMany({ where: { createdAt: { gte: daysAgo(90) } }, select: { userId: true, createdAt: true } }),
      prisma.activityLog.findMany({ where: { createdAt: { gte: daysAgo(90) } }, select: { userId: true, action: true, createdAt: true } }),
      prisma.subscription.findMany({ select: { id: true, userId: true, status: true, cancelledAt: true, plan: { select: { name: true } } } }),
      prisma.invoice.findMany({ select: { subscriptionId: true, status: true } }),
    ]);

    const subIdToUserId = new Map(subscriptions.map((s) => [s.id, s.userId]));
    const failedPaymentsByUser = new Map<string, number>();
    for (const inv of invoices) {
      if (inv.status === "failed" || inv.status === "refunded") {
        const uid = subIdToUserId.get(inv.subscriptionId);
        if (uid) failedPaymentsByUser.set(uid, (failedPaymentsByUser.get(uid) || 0) + 1);
      }
    }

    const sessionByUser = new Map<string, Date[]>();
    for (const s of sessions90) {
      const arr = sessionByUser.get(s.userId) || [];
      arr.push(s.createdAt);
      sessionByUser.set(s.userId, arr);
    }
    const activityByUser = new Map<string, { action: string; createdAt: Date }[]>();
    for (const a of activity90) {
      const arr = activityByUser.get(a.userId) || [];
      arr.push({ action: a.action, createdAt: a.createdAt });
      activityByUser.set(a.userId, arr);
    }
    const subsByUser = new Map<string, { status: string; cancelledAt: Date | null; planName: string | null }[]>();
    for (const s of subscriptions) {
      const arr = subsByUser.get(s.userId) || [];
      arr.push({ status: s.status, cancelledAt: s.cancelledAt, planName: s.plan?.name || null });
      subsByUser.set(s.userId, arr);
    }

    const usersResult = users.map((u) => {
      const sessions = sessionByUser.get(u.id) || [];
      const acts = activityByUser.get(u.id) || [];
      const subs = subsByUser.get(u.id) || [];
      const now = Date.now();

      // 1. Login frequency drop (0-25): 7d avg vs 30d baseline
      const s7 = sessions.filter((s) => s.getTime() >= now - 7 * DAY).length;
      const s30 = sessions.filter((s) => s.getTime() >= now - 30 * DAY).length;
      const rate7 = s7 / 7;
      const rate30 = s30 / 30;
      let loginScore = 0;
      if (rate30 > 0) {
        const ratio = rate7 / rate30;
        if (ratio < 0.5) loginScore = 25;
        else if (ratio < 0.7) loginScore = 15;
        else if (ratio < 0.9) loginScore = 5;
      } else if (s30 === 0 && sessions.length > 0) {
        loginScore = 25; // full drop from historical baseline
      }

      // 2. Core action decline (0-20): core actions this week vs prior 28d baseline
      const core7 = acts.filter((a) => CORE_ACTIONS.has(a.action) && a.createdAt.getTime() >= now - 7 * DAY).length;
      const corePrior = acts.filter((a) => CORE_ACTIONS.has(a.action) && a.createdAt.getTime() >= now - 28 * DAY && a.createdAt.getTime() < now - 7 * DAY).length;
      const coreWeeklyBaseline = corePrior / 4;
      let coreScore = 0;
      if (coreWeeklyBaseline > 0) {
        const decline = 1 - core7 / coreWeeklyBaseline;
        if (decline >= 0.6) coreScore = 20;
        else if (decline >= 0.4) coreScore = 12;
        else if (decline >= 0.2) coreScore = 5;
      } else if (core7 === 0 && corePrior > 0) {
        coreScore = 20;
      }

      // 3. Feature breadth contraction (0-15): distinct actions 30d vs prior 30d
      const actions30 = new Set(acts.filter((a) => a.createdAt.getTime() >= now - 30 * DAY).map((a) => a.action));
      const actionsPrior30 = new Set(
        acts.filter((a) => a.createdAt.getTime() >= now - 60 * DAY && a.createdAt.getTime() < now - 30 * DAY).map((a) => a.action),
      );
      let breadthScore = 0;
      if (actionsPrior30.size > 0) {
        const contraction = 1 - actions30.size / actionsPrior30.size;
        if (contraction >= 0.5) breadthScore = 15;
        else if (contraction >= 0.3) breadthScore = 8;
      }

      // 4. Silence signal (0-15): no sessions + no activity for 14+ days
      const lastSession = sessions.length ? Math.max(...sessions.map((s) => s.getTime())) : 0;
      const lastActivity = acts.length ? Math.max(...acts.map((a) => a.createdAt.getTime())) : 0;
      const lastSeen = Math.max(lastSession, lastActivity, u.createdAt.getTime());
      const daysSilent = (now - lastSeen) / DAY;
      const silenceScore = daysSilent >= 30 ? 15 : daysSilent >= 14 ? 10 : daysSilent >= 7 ? 5 : 0;

      // 5. Engagement trend (0-10): 3 consecutive declining weeks of activity
      let trendScore = 0;
      const weeklyCounts: number[] = [];
      for (let w = 0; w < 4; w++) {
        const start = now - (w + 1) * 7 * DAY;
        const end = now - w * 7 * DAY;
        weeklyCounts.push(acts.filter((a) => a.createdAt.getTime() >= start && a.createdAt.getTime() < end).length);
      }
      if (weeklyCounts[2] > 0 && weeklyCounts[3] > weeklyCounts[2] && weeklyCounts[2] >= weeklyCounts[1] && weeklyCounts[1] >= weeklyCounts[0]) {
        trendScore = 10;
      }

      // 6. Billing health (0-15)
      let billingScore = 0;
      const hasCancelled = subs.some((s) => s.status === "cancelled" || s.status === "completed" || s.status === "expired");
      if (hasCancelled) billingScore += 8;
      const anyFailed = [...failedPaymentsByUser.values()].some((c) => c > 0);
      if (anyFailed) billingScore += 7;
      billingScore = Math.min(15, billingScore);

      let score = loginScore + coreScore + breadthScore + silenceScore + trendScore + billingScore;

      const drivers: { key: string; label: string; points: number }[] = [];
      if (loginScore > 0) drivers.push({ key: "login", label: "Login frequency dropped", points: loginScore });
      if (coreScore > 0) drivers.push({ key: "core", label: "Core actions declined", points: coreScore });
      if (breadthScore > 0) drivers.push({ key: "breadth", label: "Feature usage narrowed", points: breadthScore });
      if (silenceScore > 0) drivers.push({ key: "silence", label: "Inactive for long stretch", points: silenceScore });
      if (trendScore > 0) drivers.push({ key: "trend", label: "Usage declining 3+ weeks", points: trendScore });
      if (billingScore > 0) drivers.push({ key: "billing", label: "Billing / plan friction", points: billingScore });
      drivers.sort((a, b) => b.points - a.points);

      const tier = score >= 71 ? "critical" : score >= 46 ? "red" : score >= 21 ? "yellow" : "green";

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        showLitePlan: u.showLitePlan,
        createdAt: u.createdAt,
        score,
        tier,
        drivers: drivers.slice(0, 3),
        lastSeen: new Date(lastSeen).toISOString(),
        daysSilent: Math.round(daysSilent),
        planName: subs.find((s) => s.status === "active")?.planName || subs[0]?.planName || "Free",
        sessions30: s30,
        coreActions30: acts.filter((a) => CORE_ACTIONS.has(a.action)).length,
      };
    });

    // Activation override applied after fetch (need business/feedback data)
    const [businesses, feedback] = await Promise.all([
      prisma.business.findMany({ select: { id: true, userId: true } }),
      prisma.feedback.findMany({ select: { businessId: true } }),
    ]);
    const fbBizs = new Set(feedback.map((f) => f.businessId));
    const bizByUser = new Map<string, string[]>();
    for (const b of businesses) {
      const arr = bizByUser.get(b.userId) || [];
      arr.push(b.id);
      bizByUser.set(b.userId, arr);
    }
    for (const u of usersResult) {
      const hasReview = (bizByUser.get(u.id) || []).some((b) => fbBizs.has(b));
      const daysSinceSignup = (Date.now() - new Date(u.createdAt).getTime()) / DAY;
      if (!hasReview && daysSinceSignup > 30) {
        u.score = Math.min(100, u.score + 20);
        u.tier = u.score >= 71 ? "critical" : u.score >= 46 ? "red" : u.score >= 21 ? "yellow" : "green";
        u.drivers.unshift({ key: "activation", label: "Never collected a review", points: 20 });
        u.drivers = u.drivers.slice(0, 3);
      }
    }

    const counts = { green: 0, yellow: 0, red: 0, critical: 0 };
    for (const u of usersResult) counts[u.tier as keyof typeof counts] += 1;

    res.json({
      users: usersResult.sort((a, b) => b.score - a.score),
      counts,
      total: usersResult.length,
      atRisk: counts.yellow + counts.red + counts.critical,
    });
  } catch (err) {
    console.error("Admin analytics churn error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
