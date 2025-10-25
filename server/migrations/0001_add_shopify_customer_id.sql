
-- Migration: Add shopify_customer_id column to wholesale_registrations
-- Generated: 2025-01-24

ALTER TABLE wholesale_registrations 
ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT;

-- Add index for faster customer lookups
CREATE INDEX IF NOT EXISTS idx_wholesale_registrations_shopify_customer_id 
ON wholesale_registrations(shopify_customer_id);
