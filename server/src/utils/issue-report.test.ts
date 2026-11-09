import assert from "node:assert/strict";
import test from "node:test";
import { buildIssueReport, issueCategoryLabel, type IssueReportTask } from "./issue-report";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function task(overrides: Partial<IssueReportTask> = {}): IssueReportTask {
  const createdAt = overrides.createdAt ?? new Date(NOW.getTime() - 2 * DAY);
  return {
    id: "task_1",
    title: "Follow up",
    category: "service",
    issueKey: "service",
    status: "pending",
    priority: "normal",
    occurrenceCount: 1,
    recurredAfterResolution: false,
    previousTaskId: null,
    resolutionNotes: null,
    assignedTo: null,
    createdAt,
    updatedAt: overrides.updatedAt ?? createdAt,
    completedAt: null,
    escalatedAt: null,
    dueAt: null,
    ...overrides,
  };
}

test("empty input returns a zeroed report, not NaN", () => {
  const report = buildIssueReport({ tasks: [], days: 30, now: NOW });
  assert.equal(report.windowDays, 30);
  assert.equal(report.totalIssues, 0);
  assert.equal(report.resolutionRate, 0);
  assert.equal(report.avgResolutionHours, null);
  assert.deepEqual(report.recurringIssues, []);
  assert.deepEqual(report.recentResolutions, []);
  assert.deepEqual(report.needsAttention, []);
});

test("resolution rate is based on issues created inside the window", () => {
  const report = buildIssueReport({
    tasks: [
      task({ id: "a", status: "done", completedAt: new Date(NOW.getTime() - 12 * HOUR) }),
      task({ id: "b", status: "pending" }),
      // Created before the window: must not inflate this period's rate.
      task({ id: "c", status: "done", createdAt: new Date(NOW.getTime() - 40 * DAY), completedAt: new Date(NOW.getTime() - 1 * DAY) }),
    ],
    days: 30,
    now: NOW,
  });

  assert.equal(report.totalIssues, 2);
  assert.equal(report.resolvedIssues, 1);
  assert.equal(report.openIssues, 1);
  assert.equal(report.resolutionRate, 50);
  // 2 days old, resolved 12h ago = 36h.
  assert.equal(report.avgResolutionHours, 36);
});

test("recurring issues merge by issueKey and sum guest reports", () => {
  const report = buildIssueReport({
    tasks: [
      task({ id: "a", issueKey: "food_quality", category: "food_quality", occurrenceCount: 3, status: "escalated", priority: "high" }),
      task({ id: "b", issueKey: "food_quality", category: "food_quality", occurrenceCount: 2, status: "done", completedAt: new Date(NOW.getTime() - HOUR) }),
      task({ id: "c", issueKey: "speed", category: "speed", occurrenceCount: 1, status: "pending" }),
    ],
    days: 30,
    now: NOW,
  });

  assert.equal(report.recurringIssues.length, 1);
  const food = report.recurringIssues[0];
  assert.equal(food.issueKey, "food_quality");
  assert.equal(food.label, "Food quality");
  assert.equal(food.taskCount, 2);
  assert.equal(food.occurrences, 5);
  assert.equal(food.openCount, 1);
  assert.equal(food.resolvedCount, 1);
});

test("separate tasks in the same bucket count as recurrence even at occurrence 1", () => {
  const report = buildIssueReport({
    tasks: [
      task({ id: "a", issueKey: "cleanliness", category: "cleanliness" }),
      task({ id: "b", issueKey: "cleanliness", category: "cleanliness" }),
    ],
    days: 30,
    now: NOW,
  });

  assert.equal(report.recurringIssues.length, 1);
  assert.equal(report.recurringIssues[0].taskCount, 2);
  assert.equal(report.recurringIssues[0].occurrences, 2);
});

test("a single low-occurrence issue is not reported as recurring", () => {
  const report = buildIssueReport({
    tasks: [task({ id: "a", issueKey: "value", category: "value" })],
    days: 30,
    now: NOW,
  });
  assert.deepEqual(report.recurringIssues, []);
});

test("needs attention prioritises escalated and overdue open work", () => {
  const report = buildIssueReport({
    tasks: [
      task({ id: "done", status: "done", priority: "high", completedAt: new Date(NOW.getTime() - HOUR) }),
      task({ id: "pending", status: "pending", priority: "normal", dueAt: new Date(NOW.getTime() + 10 * DAY) }),
      task({ id: "overdue", status: "overdue", priority: "normal", dueAt: new Date(NOW.getTime() - DAY) }),
      task({ id: "escalated", status: "escalated", priority: "high" }),
      task({ id: "due-soon", status: "pending", priority: "low", dueAt: new Date(NOW.getTime() + 2 * HOUR) }),
    ],
    days: 30,
    now: NOW,
  });

  const ids = report.needsAttention.map((item) => item.id);
  assert.deepEqual(ids, ["escalated", "overdue", "due-soon"]);
  assert.equal(report.overdueIssues, 1);
  assert.equal(report.escalatedIssues, 1);
  assert.equal(report.highPriorityOpen, 1);
});

test("needs attention caps at five items", () => {
  const tasks = Array.from({ length: 8 }, (_, index) =>
    task({ id: `t${index}`, status: "escalated", priority: "high", dueAt: new Date(NOW.getTime() - index * HOUR) })
  );
  const report = buildIssueReport({ tasks, days: 30, now: NOW });
  assert.equal(report.needsAttention.length, 5);
});

test("recent resolutions require notes, stay inside the window, and newest first", () => {
  const report = buildIssueReport({
    tasks: [
      task({
        id: "older",
        status: "done",
        resolutionNotes: "  Coached the kitchen team.  ",
        completedAt: new Date(NOW.getTime() - 2 * DAY),
      }),
      task({
        id: "newer",
        status: "done",
        resolutionNotes: "Replaced the dish and apologised.",
        assignedTo: "Floor manager",
        completedAt: new Date(NOW.getTime() - HOUR),
      }),
      task({ id: "no-notes", status: "done", resolutionNotes: null, completedAt: new Date(NOW.getTime() - HOUR) }),
      task({
        id: "outside",
        status: "done",
        resolutionNotes: "Old fix",
        completedAt: new Date(NOW.getTime() - 40 * DAY),
      }),
    ],
    days: 30,
    now: NOW,
  });

  assert.deepEqual(
    report.recentResolutions.map((item) => item.id),
    ["newer", "older"]
  );
  assert.equal(report.recentResolutions[1].resolutionNotes, "Coached the kitchen team.");
});

test("post-resolution recurrence is counted and surfaced", () => {
  const report = buildIssueReport({
    tasks: [
      task({
        id: "fixed",
        issueKey: "food_quality",
        category: "food_quality",
        status: "done",
        occurrenceCount: 3,
        completedAt: new Date(NOW.getTime() - 2 * DAY),
      }),
      task({
        id: "back",
        issueKey: "food_quality",
        category: "food_quality",
        status: "pending",
        priority: "high",
        recurredAfterResolution: true,
        previousTaskId: "fixed",
      }),
    ],
    days: 30,
    now: NOW,
  });

  assert.equal(report.postResolutionRecurrences, 1);
  assert.equal(report.recurringIssues[0].recurredAfterResolutionCount, 1);
  assert.equal(report.needsAttention[0].recurredAfterResolution, true);
});

test("unknown categories get a readable label", () => {
  assert.equal(issueCategoryLabel("food_quality"), "Food quality");
  assert.equal(issueCategoryLabel("delivery_temperature"), "Delivery Temperature");
  assert.equal(issueCategoryLabel(null), "Other");
});

test("days are clamped to at least one", () => {
  const report = buildIssueReport({ tasks: [], days: 0, now: NOW });
  assert.equal(report.windowDays, 1);
});
