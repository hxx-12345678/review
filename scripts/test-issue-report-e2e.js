/**
 * Live verification for the owner issue-resolution report.
 *
 * Flow:
 *   1. Register a synthetic restaurant owner and business.
 *   2. Submit three negative food-quality reports; the third must merge and
 *      escalate the same issue instead of creating queue noise.
 *   3. GET /v2/tasks/report/:businessId and verify recurrence + attention.
 *   4. Refuse to close the issue without notes, then close it with notes.
 *   5. Re-fetch the report: resolution rate, average time, recent resolution.
 *   6. Submit the same issue again and verify it is flagged as recurring
 *      after a resolved fix — the strategy's core "did the fix hold?" signal.
 *   7. Verify the feedback inbox filters by touchpoint and rating.
 *   8. Verify a second tenant cannot read the report.
 *
 * All synthetic data is removed at the end. No real retention data is touched.
 */

const path = require("path");
const { PrismaClient } = require(
  require.resolve("@prisma/client", { paths: [path.join(__dirname, "..", "server")] })
);

const API_BASE = process.env.API_BASE || "http://localhost:4000/api";
const prisma = new PrismaClient();

async function request(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body: json };
}

let passed = 0;
function assert(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
  console.log(`  OK  ${message}`);
}

async function main() {
  const stamp = Date.now();
  const password = `IssueReport#${stamp}!`;
  const ownerEmail = `issue-report-owner-${stamp}@test-beyondvyu.internal`;
  const outsiderEmail = `issue-report-outsider-${stamp}@test-beyondvyu.internal`;

  const owner = await request("POST", "/auth/signup", {
    body: { email: ownerEmail, password, name: "Report Owner" },
  });
  assert(owner.status === 201, "registered synthetic owner");
  const ownerToken = owner.body.token;

  const outsider = await request("POST", "/auth/signup", {
    body: { email: outsiderEmail, password, name: "Report Outsider" },
  });
  assert(outsider.status === 201, "registered second tenant");
  const outsiderToken = outsider.body.token;

  const business = await request("POST", "/businesses", {
    token: ownerToken,
    body: {
      name: `Report Kitchen ${stamp}`,
      industry: "RESTAURANT",
      promptTopics: ["Paneer Tikka"],
    },
  });
  assert(business.status === 201, "created synthetic restaurant");
  const businessId = business.body.business.id;
  const slug = business.body.business.slug;

  for (let i = 1; i <= 3; i += 1) {
    const submission = await request("POST", "/feedback/submit", {
      body: {
        businessSlug: slug,
        rating: 2,
        improvement: `The paneer was cold and bland on visit ${i}.`,
        selectedSubOptions: ["fd_taste", "fd_temp"],
        touchpoint: "table",
      },
    });
    assert(submission.status === 201, `submitted negative report ${i} (table touchpoint)`);
  }

  const inboxAtTable = await request("GET", `/feedback/business/${businessId}?touchpoint=table&maxRating=2`, {
    token: ownerToken,
  });
  assert(
    inboxAtTable.status === 200 && inboxAtTable.body.feedback.length === 3,
    "feedback inbox filters by touchpoint and rating"
  );

  const inboxAtPackaging = await request("GET", `/feedback/business/${businessId}?touchpoint=packaging`, {
    token: ownerToken,
  });
  assert(
    inboxAtPackaging.status === 200 && inboxAtPackaging.body.feedback.length === 0,
    "feedback inbox excludes a different touchpoint"
  );

  const queue = await request("GET", `/v2/tasks/tasks/${businessId}`, { token: ownerToken });
  assert(queue.status === 200, "loaded manager queue");
  const issueTask = (queue.body.tasks || []).find((task) => task.category === "food_quality");
  assert(Boolean(issueTask), "negative reports produced a classified food-quality issue");
  assert(issueTask.occurrenceCount === 3, `three reports merged into one issue (count=${issueTask.occurrenceCount})`);
  assert(issueTask.status === "escalated", "third recurrence escalated the issue");
  assert(issueTask.priority === "high", "escalated issue is high priority");

  let reportRes = await request("GET", `/v2/tasks/report/${businessId}?days=30`, { token: ownerToken });
  assert(reportRes.status === 200, "owner can load the issue report");
  let report = reportRes.body.report;
  assert(report.totalIssues === 1, `one recurring issue, not three duplicate tickets (total=${report.totalIssues})`);
  assert(report.openIssues === 1, "the recurring issue is open");
  assert(report.resolutionRate === 0, "nothing resolved yet");
  assert(report.escalatedIssues === 1, "report surfaces the escalation");
  assert(report.recurringIssues.length === 1, "report surfaces one recurring problem");
  assert(report.recurringIssues[0].label === "Food quality", "recurring problem uses the operational label");
  assert(report.recurringIssues[0].occurrences === 3, "recurring problem shows three guest reports");
  assert(report.avgResolutionHours === null, "no average resolution time before closure");
  assert(
    report.needsAttention.some((item) => item.id === issueTask.id),
    "escalated issue appears in needs-attention"
  );

  const closeWithoutNotes = await request("PATCH", `/v2/tasks/tasks/${issueTask.id}`, {
    token: ownerToken,
    body: { status: "done" },
  });
  assert(closeWithoutNotes.status === 400, "closing a classified issue without notes is rejected");

  const notes = "Floor manager checked holding temperatures and re-briefed the kitchen on hot-pass timing.";
  const closed = await request("PATCH", `/v2/tasks/tasks/${issueTask.id}`, {
    token: ownerToken,
    body: { status: "done", resolutionNotes: notes, assignedTo: "Floor manager" },
  });
  assert(closed.status === 200, "issue closed with a resolution note");

  reportRes = await request("GET", `/v2/tasks/report/${businessId}?days=30`, { token: ownerToken });
  report = reportRes.body.report;
  assert(report.resolvedIssues === 1, "resolved issue counted in the window");
  assert(report.resolutionRate === 100, "resolution rate reflects the closure");
  assert(report.escalatedIssues === 0, "escalation cleared after resolution");
  assert(report.recentResolutions.length === 1, "recent resolution is reported");
  assert(report.recentResolutions[0].resolutionNotes === notes, "owner sees what was actually done");
  assert(report.recentResolutions[0].assignedTo === "Floor manager", "resolution keeps accountability");
  assert(
    typeof report.avgResolutionHours === "number" && report.avgResolutionHours >= 0,
    "average resolution time is computed"
  );

  // The manager said the issue was fixed. A guest reports the same problem
  // again — this must become visible as a failed fix, not as a brand-new issue.
  const repeat = await request("POST", "/feedback/submit", {
    body: {
      businessSlug: slug,
      rating: 2,
      improvement: "The paneer was cold and bland again after the fix.",
      selectedSubOptions: ["fd_taste", "fd_temp"],
      touchpoint: "table",
    },
  });
  assert(repeat.status === 201, "submitted a repeat report after resolution");

  const queueAfterFix = await request("GET", `/v2/tasks/tasks/${businessId}`, { token: ownerToken });
  const reopened = (queueAfterFix.body.tasks || []).find(
    (task) => task.status !== "done" && task.category === "food_quality"
  );
  assert(Boolean(reopened), "repeat report created a new open issue after closure");
  assert(reopened.recurredAfterResolution === true, "new issue is flagged as recurring after resolution");
  assert(reopened.previousTaskId === issueTask.id, "new issue points at the resolved task it recurred from");

  reportRes = await request("GET", `/v2/tasks/report/${businessId}?days=30`, { token: ownerToken });
  report = reportRes.body.report;
  assert(report.postResolutionRecurrences === 1, "owner report counts the failed fix");
  assert(
    report.recurringIssues[0].recurredAfterResolutionCount === 1,
    "recurring issue shows it returned after a fix"
  );
  assert(
    report.needsAttention.some((item) => item.recurredAfterResolution === true),
    "needs-attention flags the recurrence after resolution"
  );

  const foreign = await request("GET", `/v2/tasks/report/${businessId}?days=30`, { token: outsiderToken });
  assert(foreign.status === 404, "another tenant cannot read this business report");

  const badDays = await request("GET", `/v2/tasks/report/${businessId}?days=9999`, { token: ownerToken });
  assert(badDays.status === 200 && badDays.body.report.windowDays === 365, "report window is clamped to 365 days");

  // DPDP trust control: the owner must be able to take their data with them.
  const exportRes = await fetch(`${API_BASE}/businesses/${businessId}/export`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert(exportRes.ok, "owner can export the business data");
  assert(
    (exportRes.headers.get("content-type") || "").includes("application/json"),
    "export is delivered as a JSON download"
  );
  assert(
    (exportRes.headers.get("content-disposition") || "").includes("attachment"),
    "export sets a download filename"
  );
  const exported = await exportRes.json();
  assert(exported.business.id === businessId, "export contains the right business");
  assert(exported.counts.feedback === 4, "export contains every guest report");
  assert(exported.counts.reviewTasks === 2, "export contains resolved and open issues");
  assert(
    !JSON.stringify(exported).toLowerCase().includes("accesstoken"),
    "export excludes Google OAuth credentials"
  );

  const digest = await request("POST", `/v2/tasks/digest/${businessId}`, {
    token: ownerToken,
    body: { days: 7 },
  });
  assert(
    digest.status === 200 || digest.status === 503,
    "owner digest endpoint is wired (sends or reports SMTP not configured)"
  );
  const foreignDigest = await request("POST", `/v2/tasks/digest/${businessId}`, {
    token: outsiderToken,
    body: { days: 7 },
  });
  assert(foreignDigest.status === 404, "another tenant cannot email this business's digest");

  console.log(`\n${passed} assertions passed.`);
}

main()
  .catch((err) => {
    console.error(`\nFAILED: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.user
      .deleteMany({ where: { email: { startsWith: "issue-report-" } } })
      .catch((err) => console.error("cleanup failed:", err.message));
    await prisma.$disconnect();
  });
