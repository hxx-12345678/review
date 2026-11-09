-- Remove plan feature claims that are not implemented or are factually wrong.
-- This is a targeted data fix (exact strings only) so it never overwrites
-- admin-authored copy.

-- Team-seat management is not implemented, so remove the "Team roles" claims.
UPDATE "SubscriptionPlan"
SET "features" = array_remove(
  array_remove("features", 'Team roles (5 users)'),
  'Team roles (15 users)'
)
WHERE "features" IS NOT NULL;

-- The Lite yearly price (₹1,200/yr) equals 12 × the monthly price (₹100/mo),
-- so there is no saving. Remove the false savings claim.
UPDATE "SubscriptionPlan"
SET "features" = array_remove("features", 'Save ₹1,200 vs monthly')
WHERE "slug" = 'lite-yearly';

UPDATE "SubscriptionPlan"
SET "description" = 'Billed annually.'
WHERE "slug" = 'lite-yearly'
  AND "description" = 'Billed annually. Save ~₹1,200/yr.';
