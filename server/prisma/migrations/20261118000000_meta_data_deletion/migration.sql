-- Meta Platform Terms: record data-deletion callbacks and expose a status page.
CREATE TABLE "MetaDataDeletionRequest" (
    "id" TEXT NOT NULL,
    "confirmationCode" TEXT NOT NULL,
    "facebookUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'meta_data_deletion_callback',
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaDataDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaDataDeletionRequest_confirmationCode_key" ON "MetaDataDeletionRequest"("confirmationCode");
CREATE INDEX "MetaDataDeletionRequest_facebookUserId_idx" ON "MetaDataDeletionRequest"("facebookUserId");
CREATE INDEX "MetaDataDeletionRequest_status_idx" ON "MetaDataDeletionRequest"("status");
