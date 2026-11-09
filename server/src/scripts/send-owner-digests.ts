/**
 * Weekly owner digest runner.
 *
 * Run from a Render cron job (or any scheduler) from the `server` directory:
 *   npm run digest:send
 *
 * Optional env:
 *   DIGEST_BUSINESS_ID  — send only to one business (useful for testing)
 *   DIGEST_DAYS         — window length, default 7
 *   DIGEST_DRY_RUN=1    — build and print, do not send email
 */

import { prisma } from "../config/database";
import { getEnv } from "../config/env";
import { buildOwnerDigest } from "../utils/owner-digest";
import { loadIssueReport, sendOwnerDigest } from "../services/issue-report-service";

const TEST_EMAIL_PATTERN = /@(test-beyondvyu\.internal|example\.com)$/i;

async function main() {
  const days = Math.max(1, Math.min(365, parseInt(process.env.DIGEST_DAYS || "7", 10) || 7));
  const onlyBusinessId = process.env.DIGEST_BUSINESS_ID;
  const dryRun = process.env.DIGEST_DRY_RUN === "1";
  const dashboardUrl = `${getEnv().FRONTEND_URL.split(",")[0].trim()}/v2/tasks`;

  const businesses = await prisma.business.findMany({
    where: onlyBusinessId ? { id: onlyBusinessId } : undefined,
    select: { id: true, name: true, user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const business of businesses) {
    if (!onlyBusinessId && TEST_EMAIL_PATTERN.test(business.user?.email || "")) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      const report = await loadIssueReport(business.id, days);
      const digest = buildOwnerDigest({ businessName: business.name, report, dashboardUrl });
      console.log(`\n--- ${digest.subject} ---\n${digest.text}`);
      skipped += 1;
      continue;
    }

    const result = await sendOwnerDigest(business.id, days, dashboardUrl);
    if (result.sent) {
      sent += 1;
      console.log(`sent: ${business.name}`);
    } else {
      failed += 1;
      console.warn(`failed: ${business.name} — ${result.error}`);
    }
  }

  console.log(`\nOwner digest complete: ${sent} sent, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("Owner digest runner failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
