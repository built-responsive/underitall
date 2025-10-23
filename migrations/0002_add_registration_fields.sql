
-- Add new columns to wholesale_registrations table
ALTER TABLE wholesale_registrations 
ADD COLUMN instagram_handle TEXT,
ADD COLUMN is_tax_exempt BOOLEAN DEFAULT false,
ADD COLUMN tax_id TEXT,
ADD COLUMN tax_id_proof_url TEXT,
ADD COLUMN how_did_you_hear TEXT,
ADD COLUMN received_sample_set BOOLEAN DEFAULT false;
