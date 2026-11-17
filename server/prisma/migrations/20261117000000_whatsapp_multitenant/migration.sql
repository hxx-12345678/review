-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "whatsappConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappConsentAt" TIMESTAMP(3),
ADD COLUMN     "whatsappMarketingConsent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WhatsAppTemplate" ADD COLUMN     "bodyText" TEXT,
ADD COLUMN     "components" JSONB,
ADD COLUMN     "footerText" TEXT,
ADD COLUMN     "headerParameterCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "headerText" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "metaTemplateId" TEXT,
ADD COLUMN     "parameterCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parameterFormat" TEXT NOT NULL DEFAULT 'POSITIONAL',
ADD COLUMN     "qualityScore" JSONB,
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "useCase" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "businessPortfolioId" TEXT,
    "displayPhoneNumber" TEXT,
    "verifiedName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "accessTokenCiphertext" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "accessTokenTag" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "webhookSubscribed" BOOLEAN NOT NULL DEFAULT false,
    "numberRegistered" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethodConfirmedAt" TIMESTAMP(3),
    "qualityRating" TEXT,
    "messagingLimitTier" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "consentStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consentSource" TEXT,
    "consentAt" TIMESTAMP(3),
    "optOutAt" TIMESTAMP(3),
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptInAt" TIMESTAMP(3),
    "marketingOptOut" BOOLEAN NOT NULL DEFAULT false,
    "marketingOptOutAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConsentEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT,
    "metaMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEMPLATE',
    "templateId" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT,
    "templateCategory" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "bodyPreview" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "pricing" JSONB,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutomation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "headerVariables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purpose" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdBy" TEXT,
    "batchId" TEXT,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppAutomationRule" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "variableMap" JSONB,
    "headerVariableMap" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppAutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_businessId_key" ON "WhatsAppConnection"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConnection_phoneNumberId_key" ON "WhatsAppConnection"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_wabaId_idx" ON "WhatsAppConnection"("wabaId");

-- CreateIndex
CREATE INDEX "WhatsAppConnection_status_idx" ON "WhatsAppConnection"("status");

-- CreateIndex
CREATE INDEX "WhatsAppContact_businessId_consentStatus_idx" ON "WhatsAppContact"("businessId", "consentStatus");

-- CreateIndex
CREATE INDEX "WhatsAppContact_businessId_lastInboundAt_idx" ON "WhatsAppContact"("businessId", "lastInboundAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_businessId_phone_key" ON "WhatsAppContact"("businessId", "phone");

-- CreateIndex
CREATE INDEX "WhatsAppConsentEvent_businessId_createdAt_idx" ON "WhatsAppConsentEvent"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppConsentEvent_contactId_createdAt_idx" ON "WhatsAppConsentEvent"("contactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_metaMessageId_key" ON "WhatsAppMessage"("metaMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_businessId_createdAt_idx" ON "WhatsAppMessage"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_businessId_contactId_createdAt_idx" ON "WhatsAppMessage"("businessId", "contactId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_businessId_status_idx" ON "WhatsAppMessage"("businessId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppAutomation_dedupeKey_key" ON "WhatsAppAutomation"("dedupeKey");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_status_scheduledAt_idx" ON "WhatsAppAutomation"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_businessId_scheduledAt_idx" ON "WhatsAppAutomation"("businessId", "scheduledAt");

-- CreateIndex
CREATE INDEX "WhatsAppAutomation_businessId_batchId_idx" ON "WhatsAppAutomation"("businessId", "batchId");

-- CreateIndex
CREATE INDEX "WhatsAppAutomationRule_businessId_trigger_active_idx" ON "WhatsAppAutomationRule"("businessId", "trigger", "active");

-- CreateIndex
CREATE INDEX "WhatsAppAutomationRule_businessId_createdAt_idx" ON "WhatsAppAutomationRule"("businessId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_metaTemplateId_key" ON "WhatsAppTemplate"("metaTemplateId");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_businessId_status_idx" ON "WhatsAppTemplate"("businessId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppTemplate_businessId_name_language_idx" ON "WhatsAppTemplate"("businessId", "name", "language");

-- AddForeignKey
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConsentEvent" ADD CONSTRAINT "WhatsAppConsentEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConsentEvent" ADD CONSTRAINT "WhatsAppConsentEvent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomationRule" ADD CONSTRAINT "WhatsAppAutomationRule_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppAutomationRule" ADD CONSTRAINT "WhatsAppAutomationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsAppTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

