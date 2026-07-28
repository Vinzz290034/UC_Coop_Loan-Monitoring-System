-- Migration: Add gender and civil_status columns to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('Male', 'Female') OR gender IS NULL);
ALTER TABLE members ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50) CHECK (civil_status IN ('Single', 'Married', 'Widowed', 'Separated', 'Divorced') OR civil_status IS NULL);
