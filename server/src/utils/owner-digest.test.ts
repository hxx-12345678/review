import assert from "node:assert/strict";
import test from "node:test";
import { buildOwnerDigest } from "./owner-digest";
import type { IssueReport } from "./issue-report";

const NOW = new Date("2026-11-10T10:00:00.000Z");

function report(overrides: Partial<IssueReport> = {}): IssueReport {
  return {
    windowDays: 7,
    totalIssues: 4,
    openIssues: 1,
    resolvedIssues: 3,
    overdueIssues: 0,
    escalatedIssues: 1,
    highPriorityOpen: 1,
    recurringIssuesOpen: 1,
    postResolutionRecurrences: 1,
    resolutionRate: 75,
    avgResolutionHours: 30,
    recurringIssues: [
      {
        issueKey: "food_quality",
        category: "food_quality",
        label: "Food quality",
        taskCount: 2,
        occurrences: 4,
        openCount: 1,
        resolvedCount: 1,
        recurredAfterResolutionCount: 1,
        lastSeenAt: NOW.toISOString(),
      },
    ],
    recentResolutions: [
      {
        id: "task-1",
        title: "Resolve 2★ guest complaint",
        category: "food_quality",
        label: "Food quality",
        resolutionNotes: "Re-briefed kitchen on hot-pass timing.",
        assignedTo: "Floor manager",
        completedAt: NOW.toISOString(),
      },
    ],
    needsAttention: [
      {
        id: "task-2",
        title: "Resolve 2★ guest complaint",
        category: "food_quality",
        label: "Food quality",
        status: "pending",
        priority: "high",
        dueAt: NOW.toISOString(),
        occurrenceCount: 1,
        recurredAfterResolution: true,
      },
    ],
    ...overrides,
  };
}

test("weekly digest includes the loop metrics and the failed-fix signal", () => {
  const digest = buildOwnerDigest({
    businessName: "Gallery Cafe",
    report: report(),
    dashboardUrl: "https://beyondvyu.com/v2/tasks",
  });

  assert.match(digest.subject, /7-day guest-experience summary/);
  assert.match(digest.subject, /Gallery Cafe/);
  assert.match(digest.text, /Resolution rate: 75%/);
  assert.match(digest.text, /Average resolution time: 1\.3d/);
  assert.match(digest.text, /Came back after being marked resolved: 1/);
  assert.match(digest.text, /Food quality: 4 guest reports, 1 after a fix/);
  assert.match(digest.text, /recurred after a fix/);
  assert.match(digest.text, /https:\/\/beyondvyu\.com\/v2\/tasks/);
  assert.match(digest.html, /came back after being marked resolved/);
});

test("weekly digest escapes owner-controlled text", () => {
  const digest = buildOwnerDigest({
    businessName: "<script>alert(1)</script>",
    report: report({
      recentResolutions: [
        {
          id: "task-1",
          title: "t",
          category: "food_quality",
          label: "Food quality",
          resolutionNotes: "<img src=x onerror=alert(1)>",
          assignedTo: null,
          completedAt: NOW.toISOString(),
        },
      ],
    }),
    dashboardUrl: "https://beyondvyu.com/v2/tasks",
  });

  assert.doesNotMatch(digest.html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(digest.html, /<img src=x onerror=alert\(1\)>/);
  assert.match(digest.html, /&lt;script&gt;/);
});

test("an empty week still produces a useful, finite summary", () => {
  const digest = buildOwnerDigest({
    businessName: "  ",
    report: report({
      totalIssues: 0,
      openIssues: 0,
      resolvedIssues: 0,
      escalatedIssues: 0,
      highPriorityOpen: 0,
      recurringIssuesOpen: 0,
      postResolutionRecurrences: 0,
      resolutionRate: 0,
      avgResolutionHours: null,
      recurringIssues: [],
      recentResolutions: [],
      needsAttention: [],
    }),
    dashboardUrl: "https://beyondvyu.com/v2/tasks",
  });

  assert.match(digest.text, /Your restaurant/);
  assert.match(digest.text, /Average resolution time: —/);
  assert.doesNotMatch(digest.text, /undefined/);
  assert.doesNotMatch(digest.html, /undefined/);
});
