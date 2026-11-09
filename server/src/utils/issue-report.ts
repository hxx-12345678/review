/**
 * Owner-facing issue report.
 *
 * Release 1 is restaurant-first, and the differentiator is the loop:
 * feedback -> classified issue -> manager action -> resolution -> recurrence.
 * Dashboards already show volume and star ratings; this module answers the
 * questions an owner actually renews for:
 *
 *   - Which problems keep coming back?
 *   - Are issues being resolved, and how fast?
 *   - What is still waiting on a manager?
 *   - What did we actually do about the last complaints?
 *
 * The aggregation is deliberately pure so it can be unit-tested without a DB.
 */

import { TASK_CATEGORY_LABELS } from "./task-classification";

export interface IssueReportTask {
  id: string;
  title: string;
  category: string | null;
  issueKey: string | null;
  status: string;
  priority: string;
  occurrenceCount: number | null;
  /** Set when this issue came back after a prior task was marked resolved. */
  recurredAfterResolution?: boolean | null;
  previousTaskId?: string | null;
  resolutionNotes: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  escalatedAt: Date | null;
  dueAt: Date | null;
}

export interface RecurringIssueSummary {
  issueKey: string;
  category: string;
  label: string;
  taskCount: number;
  occurrences: number;
  openCount: number;
  resolvedCount: number;
  /** Guest reports that came back after a manager marked the issue resolved. */
  recurredAfterResolutionCount: number;
  lastSeenAt: string;
}

export interface RecentResolution {
  id: string;
  title: string;
  category: string;
  label: string;
  resolutionNotes: string;
  assignedTo: string | null;
  completedAt: string;
}

export interface AttentionIssue {
  id: string;
  title: string;
  category: string;
  label: string;
  status: string;
  priority: string;
  dueAt: string | null;
  occurrenceCount: number;
  recurredAfterResolution: boolean;
}

export interface IssueReport {
  windowDays: number;
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  overdueIssues: number;
  escalatedIssues: number;
  highPriorityOpen: number;
  recurringIssuesOpen: number;
  /** Issues in this window that returned after being marked resolved. */
  postResolutionRecurrences: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
  recurringIssues: RecurringIssueSummary[];
  recentResolutions: RecentResolution[];
  needsAttention: AttentionIssue[];
}

export interface BuildIssueReportInput {
  /** Tasks relevant to the window: created, resolved, or still open. */
  tasks: IssueReportTask[];
  days: number;
  now?: Date;
}

const OPEN_STATUSES = new Set(["pending", "in_progress", "overdue", "escalated"]);

const STATUS_RANK: Record<string, number> = {
  escalated: 0,
  overdue: 1,
  in_progress: 2,
  pending: 3,
  done: 4,
};

const PRIORITY_RANK: Record<string, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function issueCategoryLabel(category: string | null | undefined): string {
  if (!category) return "Other";
  const known = (TASK_CATEGORY_LABELS as Record<string, string>)[category];
  if (known) return known;
  return category
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupKey(task: IssueReportTask): string {
  return task.issueKey || task.category || "other";
}

function categoryFor(task: IssueReportTask, key: string): string {
  return task.category || (key === "low_rating_no_detail" ? "other" : key);
}

function isOpen(task: IssueReportTask): boolean {
  return OPEN_STATUSES.has(task.status);
}

/**
 * An issue is recurring when either:
 *   - separate tasks share the same operational bucket, or
 *   - one merged task records more than one guest report.
 */
function buildRecurringIssues(tasks: IssueReportTask[]): RecurringIssueSummary[] {
  const groups = new Map<
    string,
    {
      category: string;
      label: string;
      taskCount: number;
      occurrences: number;
      openCount: number;
      resolvedCount: number;
      recurredAfterResolutionCount: number;
      lastSeenAt: number;
    }
  >();

  for (const task of tasks) {
    const key = groupKey(task);
    const category = categoryFor(task, key);
    const existing = groups.get(key);
    const occurrenceCount = Math.max(1, task.occurrenceCount || 1);
    const lastSeen = task.updatedAt.getTime();
    const recurred = Boolean(task.recurredAfterResolution);

    if (!existing) {
      groups.set(key, {
        category,
        label: issueCategoryLabel(category),
        taskCount: 1,
        occurrences: occurrenceCount,
        openCount: isOpen(task) ? 1 : 0,
        resolvedCount: task.status === "done" ? 1 : 0,
        recurredAfterResolutionCount: recurred ? 1 : 0,
        lastSeenAt: lastSeen,
      });
      continue;
    }

    existing.taskCount += 1;
    existing.occurrences += occurrenceCount;
    if (isOpen(task)) existing.openCount += 1;
    if (task.status === "done") existing.resolvedCount += 1;
    if (recurred) existing.recurredAfterResolutionCount += 1;
    if (lastSeen > existing.lastSeenAt) existing.lastSeenAt = lastSeen;
  }

  return Array.from(groups.entries())
    .map(([issueKey, group]) => ({
      issueKey,
      category: group.category,
      label: group.label,
      taskCount: group.taskCount,
      occurrences: group.occurrences,
      openCount: group.openCount,
      resolvedCount: group.resolvedCount,
      recurredAfterResolutionCount: group.recurredAfterResolutionCount,
      lastSeenAt: new Date(group.lastSeenAt).toISOString(),
    }))
    .filter((group) => group.occurrences >= 2 || group.taskCount >= 2)
    .sort((a, b) => {
      if (b.recurredAfterResolutionCount !== a.recurredAfterResolutionCount) {
        return b.recurredAfterResolutionCount - a.recurredAfterResolutionCount;
      }
      if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
      if (b.openCount !== a.openCount) return b.openCount - a.openCount;
      return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
    });
}

function buildNeedsAttention(tasks: IssueReportTask[], now: Date): AttentionIssue[] {
  const soon = now.getTime() + ONE_DAY_MS;

  return tasks
    .filter((task) => {
      if (!isOpen(task)) return false;
      if (task.status === "escalated" || task.status === "overdue") return true;
      if (task.priority === "high") return true;
      return Boolean(task.dueAt && task.dueAt.getTime() <= soon);
    })
    .sort((a, b) => {
      const statusRank = (STATUS_RANK[a.status] ?? 5) - (STATUS_RANK[b.status] ?? 5);
      if (statusRank !== 0) return statusRank;
      const priorityRank = (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3);
      if (priorityRank !== 0) return priorityRank;
      const aDue = a.dueAt ? a.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueAt ? b.dueAt.getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .slice(0, 5)
    .map((task) => {
      const key = groupKey(task);
      const category = categoryFor(task, key);
      return {
        id: task.id,
        title: task.title,
        category,
        label: issueCategoryLabel(category),
        status: task.status,
        priority: task.priority,
        dueAt: task.dueAt ? task.dueAt.toISOString() : null,
        occurrenceCount: Math.max(1, task.occurrenceCount || 1),
        recurredAfterResolution: Boolean(task.recurredAfterResolution),
      };
    });
}

function buildRecentResolutions(tasks: IssueReportTask[], windowStart: Date): RecentResolution[] {
  return tasks
    .filter(
      (task) =>
        task.status === "done" &&
        Boolean(task.completedAt) &&
        (task.completedAt as Date).getTime() >= windowStart.getTime() &&
        Boolean(task.resolutionNotes && task.resolutionNotes.trim())
    )
    .sort((a, b) => (b.completedAt as Date).getTime() - (a.completedAt as Date).getTime())
    .slice(0, 5)
    .map((task) => {
      const key = groupKey(task);
      const category = categoryFor(task, key);
      return {
        id: task.id,
        title: task.title,
        category,
        label: issueCategoryLabel(category),
        resolutionNotes: (task.resolutionNotes as string).trim(),
        assignedTo: task.assignedTo,
        completedAt: (task.completedAt as Date).toISOString(),
      };
    });
}

export function buildIssueReport({ tasks, days, now = new Date() }: BuildIssueReportInput): IssueReport {
  const windowDays = Math.max(1, Math.round(days));
  const windowStart = new Date(now.getTime() - windowDays * ONE_DAY_MS);

  const windowTasks = tasks.filter((task) => task.createdAt.getTime() >= windowStart.getTime());
  const openTasks = tasks.filter(isOpen);

  const resolvedFromWindow = windowTasks.filter((task) => task.status === "done");
  const resolutionDurations = resolvedFromWindow
    .filter((task) => task.completedAt)
    .map((task) => Math.max(0, (task.completedAt as Date).getTime() - task.createdAt.getTime()));
  const avgResolutionHours =
    resolutionDurations.length > 0
      ? Math.round((resolutionDurations.reduce((sum, ms) => sum + ms, 0) / resolutionDurations.length / 3_600_000) * 10) / 10
      : null;

  const recurringIssues = buildRecurringIssues(tasks);
  const totalIssues = windowTasks.length;

  return {
    windowDays,
    totalIssues,
    openIssues: windowTasks.filter(isOpen).length,
    resolvedIssues: resolvedFromWindow.length,
    overdueIssues: openTasks.filter((task) => task.status === "overdue").length,
    escalatedIssues: openTasks.filter((task) => task.status === "escalated").length,
    highPriorityOpen: openTasks.filter((task) => task.priority === "high").length,
    recurringIssuesOpen: recurringIssues.filter((issue) => issue.openCount > 0).length,
    postResolutionRecurrences: windowTasks.filter((task) => Boolean(task.recurredAfterResolution)).length,
    resolutionRate: totalIssues > 0 ? Math.round((resolvedFromWindow.length / totalIssues) * 100) : 0,
    avgResolutionHours,
    recurringIssues: recurringIssues.slice(0, 6),
    recentResolutions: buildRecentResolutions(tasks, windowStart),
    needsAttention: buildNeedsAttention(tasks, now),
  };
}
