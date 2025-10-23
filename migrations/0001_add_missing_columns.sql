
-- Add missing columns to calculator_quotes table
ALTER TABLE "calculator_quotes" 
ADD COLUMN IF NOT EXISTS "project_name" text,
ADD COLUMN IF NOT EXISTS "install_location" text,
ADD COLUMN IF NOT EXISTS "po_number" text,
ADD COLUMN IF NOT EXISTS "client_name" text,
ADD COLUMN IF NOT EXISTS "notes" text;
