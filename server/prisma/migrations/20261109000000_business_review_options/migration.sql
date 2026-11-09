-- Add per-business review-question configuration.
--
-- enabledCategories: category IDs from the industry taxonomy. Empty array means
--   "use the industry defaults" (for restaurants that excludes Drinks & Bar).
-- customReviewTopics: owner-defined extra options shown to guests.

ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "enabledCategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "customReviewTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
