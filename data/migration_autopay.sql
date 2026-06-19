-- Safe migration to add autopayEnabled column to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS "autopayEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow nullable expiryDate in coupons table for "Not Specified" expiry dates
ALTER TABLE coupons
ALTER COLUMN "expiryDate" DROP NOT NULL;

