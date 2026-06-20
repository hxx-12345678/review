-- CreateTable
CREATE TABLE "GoogleAccount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleReview" (
    "id" TEXT NOT NULL,
    "googleReviewId" TEXT NOT NULL,
    "googleAccountId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reviewerName" TEXT,
    "reviewerPhotoUrl" TEXT,
    "starRating" INTEGER NOT NULL,
    "comment" TEXT,
    "commentLanguage" TEXT,
    "createTime" TIMESTAMP(3) NOT NULL,
    "reviewReply" TEXT,
    "replyStatus" TEXT NOT NULL DEFAULT 'NEEDS_REPLY',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAccount_businessId_key" ON "GoogleAccount"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleReview_googleReviewId_key" ON "GoogleReview"("googleReviewId");

-- AddForeignKey
ALTER TABLE "GoogleAccount" ADD CONSTRAINT "GoogleAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleReview" ADD CONSTRAINT "GoogleReview_googleAccountId_fkey" FOREIGN KEY ("googleAccountId") REFERENCES "GoogleAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleReview" ADD CONSTRAINT "GoogleReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
