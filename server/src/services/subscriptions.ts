import { prisma } from "../config/database";
import { ENTITLED_STATUSES } from "../utils/billing";

export type SubscriptionRow = Awaited<ReturnType<typeof prisma.subscription.findFirst>>;

type EntitledArgs = {
  /** Relational include, e.g. `{ plan: true, invoices: ... }`. */
  include?: any;
  /** Optional transaction/Prisma client. */
  client?: any;
};

/**
 * The subscription that currently grants entitlements, if any.
 *
 * Also performs a cheap lazy reconciliation: if a `subscription.cancelled`
 * webhook is ever missed, a row scheduled to cancel whose period has already
 * ended must stop granting access. Without this the row would stay "active"
 * forever and the customer would keep the paid plan for free.
 */
export async function loadEntitledSubscription(userId: string, args: EntitledArgs = {}) {
  const client = args.client ?? prisma;
  const query = () =>
    client.subscription.findFirst({
      where: { userId, status: { in: [...ENTITLED_STATUSES] } },
      orderBy: { createdAt: "desc" },
      ...(args.include ? { include: args.include } : {}),
    });

  const sub = await query();
  if (!sub) return null;

  if (
    sub.cancelledAt &&
    sub.currentPeriodEnd &&
    new Date(sub.currentPeriodEnd).getTime() <= Date.now()
  ) {
    await client.subscription.update({
      where: { id: sub.id },
      data: { status: "cancelled" },
    });
    return query();
  }

  return sub;
}

/**
 * Reset the monthly credit counter when the 30-day window has elapsed.
 *
 * Conditional on the old `creditsLastResetAt` so two concurrent requests can
 * never clobber a credit consumed just after the first reset. Returns the fresh
 * row (or the input when no reset was due).
 */
export async function resetMonthlyCreditsIfDue(sub: any) {
  const daysSinceReset = sub?.creditsLastResetAt
    ? (Date.now() - new Date(sub.creditsLastResetAt).getTime()) / 86400000
    : 31;
  if (daysSinceReset < 30) return sub;

  await prisma.subscription.updateMany({
    where: {
      id: sub.id,
      creditsLastResetAt: { lt: new Date(Date.now() - 30 * 86400000) },
    },
    data: { creditsUsed: 0, creditsLastResetAt: new Date() },
  });
  return (await prisma.subscription.findUnique({ where: { id: sub.id } })) ?? sub;
}

/** Serialize subscription transitions for one user inside a transaction. */
async function lockUser(tx: any, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
}

/**
 * Zero the prepaid top-up balance on every row for `userId` (optionally
 * excluding one) and return the total, so it can be moved onto the row that is
 * about to become entitled.
 *
 * Prepaid credits are money the customer already spent. They are not tied to a
 * plan and must survive cancellation, pausing, halting and resubscription —
 * previously they were stranded on the downgraded row and silently lost.
 */
async function takeStrandedTopUpBalance(tx: any, userId: string, excludeId?: string) {
  const rows: Array<{ id: string; creditsTopUpBalance: number }> = await tx.subscription.findMany({
    where: {
      userId,
      creditsTopUpBalance: { gt: 0 },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, creditsTopUpBalance: true },
  });
  const carried = rows.reduce((sum, r) => sum + r.creditsTopUpBalance, 0);
  if (carried > 0) {
    await tx.subscription.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { creditsTopUpBalance: 0 },
    });
  }
  return { carried };
}

/**
 * Guarantee the user has an entitled plan, creating Free when nothing else is.
 * Returns the entitled subscription (or null if no free plan is seeded).
 *
 * Idempotent under concurrency: a per-user row lock + re-check prevents two
 * simultaneous requests from creating duplicate Free rows. Top-up credits from
 * every other row are carried onto the new row.
 */
export async function ensureFreeSubscription(userId: string) {
  const existing = await loadEntitledSubscription(userId);
  if (existing) return existing;
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: "free" } });
  if (!freePlan) return null;

  return prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);

    const stillEntitled = await tx.subscription.findFirst({
      where: { userId, status: { in: [...ENTITLED_STATUSES] } },
      orderBy: { createdAt: "desc" },
    });
    if (stillEntitled) return stillEntitled;

    const { carried } = await takeStrandedTopUpBalance(tx, userId);

    return tx.subscription.create({
      data: {
        userId,
        planId: freePlan.id,
        status: "active",
        creditsLimit: freePlan.creditsLimit,
        businessLimit: freePlan.businessLimit,
        creditsTopUpBalance: carried,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });
  });
}

/**
 * Cancel every other entitled subscription for a user so exactly one plan is
 * ever in force. Prevents duplicate Free rows (from repeated cancellation
 * webhooks) and old paid rows from winning the "latest" lookup.
 */
export async function cancelOtherEntitledSubscriptions(userId: string, keepId: string) {
  await prisma.subscription.updateMany({
    where: { userId, id: { not: keepId }, status: { in: [...ENTITLED_STATUSES] } },
    data: { status: "cancelled", cancelledAt: new Date() },
  });
}

/**
 * Mark a subscription `active`/`authenticated` and retire any other entitled
 * row for the same user. Used when a payment is confirmed (webhook or verify).
 *
 * Runs in one transaction with a per-user lock so a webhook racing a Free
 * fallback can never leave two entitled rows (or lose top-up credits).
 */
export async function promoteSubscription(
  subscriptionId: string,
  data: Record<string, unknown> = {},
) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, userId: true },
    });
    if (!target) throw new Error(`Subscription ${subscriptionId} not found`);

    await lockUser(tx, target.userId);
    const { carried } = await takeStrandedTopUpBalance(tx, target.userId, subscriptionId);

    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "active",
        ...data,
        ...(carried > 0 ? { creditsTopUpBalance: { increment: carried } } : {}),
      },
    });

    await tx.subscription.updateMany({
      where: {
        userId: target.userId,
        id: { not: subscriptionId },
        status: { in: [...ENTITLED_STATUSES] },
      },
      data: { status: "cancelled", cancelledAt: new Date() },
    });

    return updated;
  });
}
