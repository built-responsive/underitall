
-- Migration: Add sync tracking columns + fix id column type
-- Generated: 2025-01-25

-- Convert id column to uuid (if needed)
ALTER TABLE wholesale_registrations 
ALTER COLUMN id TYPE uuid USING id::uuid;

-- Add lastSyncAt column
ALTER TABLE wholesale_registrations 
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP;

-- Add lastSyncDirection column
ALTER TABLE wholesale_registrations 
ADD COLUMN IF NOT EXISTS last_sync_direction TEXT;

-- Add index for faster sync queries
CREATE INDEX IF NOT EXISTS idx_wholesale_registrations_last_sync 
ON wholesale_registrations(last_sync_at DESC);
