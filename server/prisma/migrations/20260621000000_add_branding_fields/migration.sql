-- AlterTable
ALTER TABLE "Business" ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "primaryColor" TEXT,
ADD COLUMN "backgroundColor" TEXT,
ADD COLUMN "splashTagline" TEXT,
ADD COLUMN "showPoweredBy" BOOLEAN NOT NULL DEFAULT true;
