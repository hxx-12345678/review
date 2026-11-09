-- Touchpoint-specific QR records.
--
-- A placement (table stand, bill/checkout, packaging, reception, takeaway)
-- is a labelled QR record belonging to the existing business — not a new
-- business/account. The URL carries non-sensitive placement metadata only.

ALTER TABLE "QrCode"
  ADD COLUMN IF NOT EXISTS "touchpoint" TEXT,
  ADD COLUMN IF NOT EXISTS "label" TEXT;

CREATE INDEX IF NOT EXISTS "QrCode_businessId_touchpoint_idx"
  ON "QrCode"("businessId", "touchpoint");
