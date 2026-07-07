-- ============================================================
-- Migration: Analytics, Audit Trail & User Tracking
-- UC COOP Loan Monitoring System
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- 1. Create audit_logs table for comprehensive activity tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100),
    method VARCHAR(10),
    endpoint VARCHAR(255),
    status_code INT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- 2. Add tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Fix loans status CHECK constraint to include 'rejected'
-- The rejectLoanApplication controller sets status = 'rejected' but the
-- original constraint does not include it.
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE loans ADD CONSTRAINT loans_status_check
  CHECK (status IN ('pending_approval', 'approved', 'disbursed', 'fully_paid', 'defaulted', 'rejected'));

-- ============================================================
-- Migration complete. Verify with:
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs';
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('last_login_at', 'last_activity_at', 'is_active');
-- ============================================================
