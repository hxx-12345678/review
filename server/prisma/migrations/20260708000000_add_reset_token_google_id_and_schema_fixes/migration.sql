-- Add googleId, resetToken, resetTokenExpiresAt to User
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- Fix Business defaults (pre-existing drifts from schema.ts changes)
ALTER TABLE "Business" ALTER COLUMN "primaryColor" SET DEFAULT '#1c3a35';
ALTER TABLE "Business" ALTER COLUMN "backgroundColor" SET DEFAULT '#ffffff';
ALTER TABLE "Business" ALTER COLUMN "showPoweredBy" DROP NOT NULL;

-- Fix GoogleAccount (pre-existing drifts)
ALTER TABLE "GoogleAccount" ADD COLUMN IF NOT EXISTS "tokenEncrypted" JSONB;
ALTER TABLE "GoogleAccount" ALTER COLUMN "accessToken" SET DEFAULT '';
