-- Row-Level Security Policies for BEYONDVYU
-- Run this after schema migration

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewDraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewClick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedReply" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QrCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;

-- Users can only see their own user record
CREATE POLICY user_isolation ON "User"
  USING (id = current_setting('app.current_user_id')::text);

-- Business isolation: owners see only their own businesses
CREATE POLICY business_owner_access ON "Business"
  USING ("userId" = current_setting('app.current_user_id')::text);

-- Feedback: business owners see feedback for their businesses
CREATE POLICY feedback_business_access ON "Feedback"
  USING ("businessId" IN (
    SELECT id FROM "Business" WHERE "userId" = current_setting('app.current_user_id')::text
  ));

-- ReviewDraft: business owners see drafts for their businesses
CREATE POLICY draft_business_access ON "ReviewDraft"
  USING ("businessId" IN (
    SELECT id FROM "Business" WHERE "userId" = current_setting('app.current_user_id')::text
  ));

-- ReviewClick: business owners see clicks for their businesses
CREATE POLICY click_business_access ON "ReviewClick"
  USING ("businessId" IN (
    SELECT id FROM "Business" WHERE "userId" = current_setting('app.current_user_id')::text
  ));

-- GeneratedReply: business owners see replies for their businesses
CREATE POLICY reply_business_access ON "GeneratedReply"
  USING ("businessId" IN (
    SELECT id FROM "Business" WHERE "userId" = current_setting('app.current_user_id')::text
  ));

-- QrCode: business owners see QR codes for their businesses
CREATE POLICY qr_business_access ON "QrCode"
  USING ("businessId" IN (
    SELECT id FROM "Business" WHERE "userId" = current_setting('app.current_user_id')::text
  ));

-- ActivityLog: business owners see activity for their businesses
CREATE POLICY activity_business_access ON "ActivityLog"
  USING ("businessId" IN (
    SELECT id FROM "Business" WHERE "userId" = current_setting('app.current_user_id')::text
  ));
