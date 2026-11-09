-- Restaurant-first Release 1: touchpoint attribution + actionable issue loop.
--
-- Feedback.touchpoint records where the guest scanned/opened the flow
-- (table/bill/packaging/reception/...). It is non-sensitive placement
-- metadata; table numbers/staff names remain in `purchaseInfo` only.
--
-- ReviewTask gains classification, a recurrence key/counter, resolution
-- notes and escalation state so repeated complaints merge and escalate
-- instead of silently piling up as duplicate rows.

ALTER TABLE "Feedback"
  ADD COLUMN IF NOT EXISTS "touchpoint" TEXT;

CREATE INDEX IF NOT EXISTS "Feedback_businessId_touchpoint_idx"
  ON "Feedback"("businessId", "touchpoint");

ALTER TABLE "ReviewTask"
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "issueKey" TEXT,
  ADD COLUMN IF NOT EXISTS "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ReviewTask_businessId_status_dueAt_idx"
  ON "ReviewTask"("businessId", "status", "dueAt");

CREATE INDEX IF NOT EXISTS "ReviewTask_businessId_issueKey_status_idx"
  ON "ReviewTask"("businessId", "issueKey", "status");
