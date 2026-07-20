-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "aiCallsLastResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pendingPlanId" TEXT,
ADD COLUMN     "scheduledChangeAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
