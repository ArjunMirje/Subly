-- ============================================================
-- Migration: Add coupon fields to subscriptions table
-- File: data/migration_coupons.sql
-- 
-- Safe to run multiple times (IF NOT EXISTS guards).
-- Does NOT drop or recreate any tables.
-- Does NOT touch existing data.
-- ============================================================

-- Stores the ID of the coupon from the coupons table (nullable foreign key)
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS "couponId" BIGINT;

-- Stores the coupon code string (e.g. "NETFLIX20") for denormalised fast display
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS "couponCode" TEXT;

-- Stores the discount string exactly as entered (e.g. "20%", "₹100")
-- Used for display and estimated cost calculation. The original `cost` is never modified.
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS "couponDiscount" TEXT;
