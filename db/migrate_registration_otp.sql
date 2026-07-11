-- ============================================================
-- Migration: OTP Verifications for Registration
-- UC COOP Loan Monitoring System
-- Safe to re-run (uses IF NOT EXISTS guards)
-- ============================================================

-- OTP Verifications table for email-based registration verification
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'registration'
        CHECK (purpose IN ('registration', 'password_reset')),
    registration_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for OTP query performance
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_purpose ON otp_verifications(purpose);

-- ============================================================
-- Migration complete. Verify with:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'otp_verifications';
-- ============================================================
