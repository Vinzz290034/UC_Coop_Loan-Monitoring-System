-- Migration: Add age column to members table if not exists and populate age from date_of_birth
ALTER TABLE members ADD COLUMN IF NOT EXISTS age INT;

-- Update age based on date_of_birth where date_of_birth is available and age is null
UPDATE members
SET age = EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))
WHERE date_of_birth IS NOT NULL AND age IS NULL;
