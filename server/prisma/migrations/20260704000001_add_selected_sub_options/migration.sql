-- AlterTable: Add selectedSubOptions JSONB column to Feedback
ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "selectedSubOptions" JSONB;
