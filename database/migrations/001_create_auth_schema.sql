-- ============================================
-- AUTH SCHEMA MIGRATION
-- Database: research&insights
-- Purpose: User authentication and subscription management
-- ============================================

-- Create auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS auth.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified TIMESTAMP,
  password_hash VARCHAR(255), -- NULL if using OAuth only
  name VARCHAR(255),
  image VARCHAR(500), -- Profile picture URL from OAuth providers
  tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'plus', 'pro')),
  stripe_customer_id VARCHAR(255) UNIQUE, -- Stripe customer ID for billing
  stripe_subscription_id VARCHAR(255), -- Current active subscription
  subscription_status VARCHAR(50) DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'cancelled', 'past_due')),
  subscription_current_period_end TIMESTAMP, -- When subscription renews/expires
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON auth.users(stripe_customer_id);

-- ============================================
-- ACCOUNTS TABLE (for OAuth providers)
-- ============================================

CREATE TABLE IF NOT EXISTS auth.accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'oauth' or 'credentials'
  provider VARCHAR(50) NOT NULL, -- 'google', 'microsoft', 'credentials'
  provider_account_id VARCHAR(255) NOT NULL, -- OAuth provider's user ID
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT, -- Unix timestamp
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  session_state VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON auth.accounts(user_id);

-- ============================================
-- SESSIONS TABLE (for session-based auth)
-- ============================================

CREATE TABLE IF NOT EXISTS auth.sessions (
  id SERIAL PRIMARY KEY,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth.sessions(session_token);

-- ============================================
-- VERIFICATION TOKENS TABLE (for email verification)
-- ============================================

CREATE TABLE IF NOT EXISTS auth.verification_tokens (
  identifier VARCHAR(255) NOT NULL, -- Email or user ID
  token VARCHAR(255) NOT NULL,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(identifier, token)
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens ON auth.verification_tokens(token);

-- ============================================
-- USAGE LOGS TABLE (analytics and monitoring)
-- ============================================

CREATE TABLE IF NOT EXISTS auth.usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES auth.users(id) ON DELETE SET NULL,
  card_type VARCHAR(100), -- Which card was accessed
  action VARCHAR(50), -- 'view', 'export', 'configure'
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON auth.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_accessed_at ON auth.usage_logs(accessed_at);

-- ============================================
-- AUDIT LOG TABLE (track subscription changes)
-- ============================================

CREATE TABLE IF NOT EXISTS auth.audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'register', 'login', 'upgrade', 'downgrade', 'cancel'
  details JSONB, -- Additional context (old tier, new tier, etc.)
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON auth.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON auth.audit_log(created_at);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION auth.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON auth.users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.update_updated_at_column();

-- Trigger for accounts table
DROP TRIGGER IF EXISTS update_accounts_updated_at ON auth.accounts;
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON auth.accounts
FOR EACH ROW
EXECUTE FUNCTION auth.update_updated_at_column();

-- ============================================
-- GRANTS (permissions for readonly user)
-- ============================================

-- Grant readonly user access to SELECT from auth schema
GRANT USAGE ON SCHEMA auth TO mosaic_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO mosaic_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA auth TO mosaic_readonly;

-- Note: Writes to auth tables will be done via API routes using admin credentials
-- This ensures readonly user can read user data but not modify it

-- ============================================
-- INITIAL DATA (optional seed data)
-- ============================================

-- Example: Create a test user (password is 'password' hashed with bcrypt)
-- INSERT INTO auth.users (email, password_hash, name, tier, email_verified)
-- VALUES (
--   'test@example.com',
--   '$2a$10$example.hash.here',
--   'Test User',
--   'free',
--   NOW()
-- );

COMMENT ON SCHEMA auth IS 'Authentication and user management schema';
COMMENT ON TABLE auth.users IS 'User accounts with subscription tier information';
COMMENT ON TABLE auth.accounts IS 'OAuth provider accounts linked to users';
COMMENT ON TABLE auth.sessions IS 'Active user sessions';
COMMENT ON TABLE auth.verification_tokens IS 'Email verification and password reset tokens';
COMMENT ON TABLE auth.usage_logs IS 'Analytics tracking for card usage';
COMMENT ON TABLE auth.audit_log IS 'Audit trail for security and compliance';
