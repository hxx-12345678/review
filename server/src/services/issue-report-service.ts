import { prisma } from "../config/database";
import { buildIssueReport, type IssueReport } from "../utils/issue-report";
import { buildOwnerDigest } from "../utils/owner-digest";
import { sendOwnerDigestEmail } from "./email";

export function clampReportDays(value: unknown, fallback = 30): number {
  const parsed = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 365) : fallback;
}

/**
 * Load the owner's issue window. Includes work created in the window, work
 * resolved in the window, and everything still open so a recurring issue does
 * not disappear when the window moves.
 */
export async function loadIssueReport(
  businessId: string,
  days: number,
  now: Date = new Date(),
): Promise<IssueReport> {
  const windowStart = new Date(now.getTime() - days * 86400000);

  const tasks = await prisma.reviewTask.findMany({
    where: {
      businessId,
      OR: [
        { createdAt: { gte: windowStart } },
        { completedAt: { gte: windowStart } },
        { status: { not: "done" } },
      ],
    },
    select: {
      id: true,
      title: true,
      category: true,
      issueKey: true,
      status: true,
      priority: true,
      occurrenceCount: true,
      recurredAfterResolution: true,
      previousTaskId: true,
      resolutionNotes: true,
      assignedTo: true,
      createdAt: true,
      updatedAt: true,
      completedAt: true,
      escalatedAt: true,
      dueAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 2000,
  });

  return buildIssueReport({ tasks, days, now });
}

export async function sendOwnerDigest(
  businessId: string,
  days: number,
  dashboardUrl: string,
): Promise<{ sent: boolean; subject: string; error?: string }> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true, userId: true },
  });
  if (!business) {
    return { sent: false, subject: "", error: "Business not found" };
  }

  const report = await loadIssueReport(businessId, days);
  const digest = buildOwnerDigest({
    businessName: business.name,
    report,
    dashboardUrl,
  });
  const result = await sendOwnerDigestEmail(business.userId, digest);
  return { sent: result.success, subject: digest.subject, error: result.error };
}
