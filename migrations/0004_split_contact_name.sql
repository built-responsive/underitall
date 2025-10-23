
-- Add new columns
ALTER TABLE wholesale_registrations 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN title TEXT;

-- Migrate existing data (split contact_name by space - first word = first_name, rest = last_name)
UPDATE wholesale_registrations 
SET 
  first_name = SPLIT_PART(contact_name, ' ', 1),
  last_name = SUBSTRING(contact_name FROM POSITION(' ' IN contact_name) + 1)
WHERE contact_name IS NOT NULL;

-- Make first_name and last_name NOT NULL after migration
ALTER TABLE wholesale_registrations 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Drop old contact_name column
ALTER TABLE wholesale_registrations 
DROP COLUMN contact_name;
