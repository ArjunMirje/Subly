-- ============================================================
-- Migration: Add usageStatus column to coupons table
-- File: data/migration_lifecycle.sql
-- 
-- Safe to run multiple times (IF NOT EXISTS guards).
-- Does NOT drop or recreate any tables.
-- Does NOT touch existing data.
-- ============================================================

-- Add usageStatus to coupons table
ALTER TABLE coupons
ADD COLUMN IF NOT EXISTS "usageStatus" TEXT NOT NULL DEFAULT 'Available';
