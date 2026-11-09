-- Distinguish subscription charges from prepaid credit top-ups. The cancel
-- flow refunds "the most recent subscription invoice"; without this flag a
-- top-up payment could be refunded by mistake (and vice versa).
ALTER TABLE "Invoice" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'subscription';
CREATE INDEX "Invoice_kind_createdAt_idx" ON "Invoice"("kind", "createdAt");
