-- Rename aiCalls columns to credits in SubscriptionPlan
ALTER TABLE "SubscriptionPlan" RENAME COLUMN "aiCallsLimit" TO "creditsLimit";
ALTER TABLE "SubscriptionPlan" ADD COLUMN "teamSeats" INTEGER NOT NULL DEFAULT 1;

-- Rename aiCalls columns to credits in Subscription
ALTER TABLE "Subscription" RENAME COLUMN "aiCallsUsed" TO "creditsUsed";
ALTER TABLE "Subscription" RENAME COLUMN "aiCallsLimit" TO "creditsLimit";
ALTER TABLE "Subscription" RENAME COLUMN "aiCallsLastResetAt" TO "creditsLastResetAt";

-- Add new credit system columns to Subscription
ALTER TABLE "Subscription" ADD COLUMN "creditsTopUpBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN "autoRechargeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN "autoRechargeThreshold" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Subscription" ADD COLUMN "autoRechargeAmount" INTEGER NOT NULL DEFAULT 100;

-- Create CreditTopUp table
CREATE TABLE "CreditTopUp" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "razorpayPaymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditTopUp_razorpayPaymentId_key" ON "CreditTopUp"("razorpayPaymentId");

-- AddForeignKey
ALTER TABLE "CreditTopUp" ADD CONSTRAINT "CreditTopUp_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
