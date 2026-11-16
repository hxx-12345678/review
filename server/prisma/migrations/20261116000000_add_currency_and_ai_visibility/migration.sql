-- Add currency to SubscriptionPlan for multi-region pricing (INR / USD)
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';

-- Update USD plans if any already exist with default INR
UPDATE "SubscriptionPlan" SET "currency" = 'USD' WHERE "slug" LIKE '%-usd';

-- Add country and currency to Business for multi-region localization
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'IN';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR';

-- Create AiVisibilityCheck table if not exists (AI Customer Check / AI Reputation)
CREATE TABLE IF NOT EXISTS "AiVisibilityCheck" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "shareSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "score" INTEGER NOT NULL,
    "subScores" JSONB NOT NULL,
    "customerReputation" INTEGER NOT NULL,
    "gap" INTEGER NOT NULL,
    "queries" JSONB NOT NULL,
    "engineResults" JSONB NOT NULL,
    "competitors" JSONB NOT NULL,
    "customerTruth" JSONB NOT NULL,
    "alignmentTable" JSONB NOT NULL,
    "fixes" JSONB,
    "reportHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiVisibilityCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiVisibilityCheck_shareSlug_key" ON "AiVisibilityCheck"("shareSlug");
CREATE INDEX IF NOT EXISTS "AiVisibilityCheck_businessId_createdAt_idx" ON "AiVisibilityCheck"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiVisibilityCheck_shareSlug_idx" ON "AiVisibilityCheck"("shareSlug");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AiVisibilityCheck_businessId_fkey'
    ) THEN
        ALTER TABLE "AiVisibilityCheck"
            ADD CONSTRAINT "AiVisibilityCheck_businessId_fkey"
            FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
