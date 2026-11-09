-- Payments integrity hardening
-- Adds lifecycle/idempotency fields, GST invoice metadata, safer FK semantics,
-- and the indexes the payment hot paths need. Data-preserving (no drops of data).

-- ── Subscription ──────────────────────────────────────────────────────────
ALTER TABLE "Subscription" ADD COLUMN "autoRechargeLastAttemptAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Subscription_razorpaySubscriptionId_key" ON "Subscription"("razorpaySubscriptionId");
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE INDEX "Subscription_status_createdAt_idx" ON "Subscription"("status", "createdAt");

-- ── SubscriptionPlan ──────────────────────────────────────────────────────
CREATE INDEX "SubscriptionPlan_active_sortOrder_idx" ON "SubscriptionPlan"("active", "sortOrder");

-- ── Invoice (retain financial records when a subscription is deleted) ─────
ALTER TABLE "Invoice" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "taxableAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "taxAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "refundedAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "planId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "customerGstin" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "periodStart" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "periodEnd" TIMESTAMP(3);
ALTER TABLE "Invoice" ALTER COLUMN "subscriptionId" DROP NOT NULL;
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_subscriptionId_fkey";
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_subscriptionId_createdAt_idx" ON "Invoice"("subscriptionId", "createdAt");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- ── CreditTopUp (correlate Razorpay payment links + auto-recharge) ────────
ALTER TABLE "CreditTopUp" ADD COLUMN "razorpayPaymentLinkId" TEXT;
ALTER TABLE "CreditTopUp" ADD COLUMN "referenceId" TEXT;
ALTER TABLE "CreditTopUp" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX "CreditTopUp_razorpayPaymentLinkId_key" ON "CreditTopUp"("razorpayPaymentLinkId");
CREATE INDEX "CreditTopUp_subscriptionId_createdAt_idx" ON "CreditTopUp"("subscriptionId", "createdAt");

-- ── ActivityLog (allow user-scoped audit events) ──────────────────────────
ALTER TABLE "ActivityLog" ALTER COLUMN "businessId" DROP NOT NULL;
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_businessId_fkey";
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");
CREATE INDEX "ActivityLog_businessId_createdAt_idx" ON "ActivityLog"("businessId", "createdAt");

-- ── Invoice numbering counter (atomic, per-financial-year derived) ────────
CREATE TABLE "InvoiceCounter" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("id")
);
