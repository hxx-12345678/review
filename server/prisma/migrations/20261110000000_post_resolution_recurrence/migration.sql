-- Measure whether an issue came back after a manager marked it resolved.
ALTER TABLE "ReviewTask"
  ADD COLUMN "recurredAfterResolution" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "previousTaskId" TEXT;

CREATE INDEX "ReviewTask_businessId_issueKey_completedAt_idx"
  ON "ReviewTask"("businessId", "issueKey", "completedAt");
