-- ============================================================================
-- User Preferences Table
-- Purpose: Store user-specific dashboard settings (theme, card layout, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS housing_dashboard.user_preferences (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- User Identification (email from NextAuth session)
  user_email VARCHAR(255) UNIQUE NOT NULL,

  -- Dashboard Settings
  theme VARCHAR(20) DEFAULT 'system', -- 'light', 'dark', 'system'
  max_columns INTEGER DEFAULT 6,

  -- Card Layout (stored as JSONB array)
  dashboard_layout JSONB DEFAULT '[]'::jsonb,

  -- Last Selected Geography
  last_selected_lga JSONB, -- { id, name, region, population }

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_prefs_email ON housing_dashboard.user_preferences(user_email);

-- Permissions
GRANT SELECT, INSERT, UPDATE ON housing_dashboard.user_preferences TO db_admin;
GRANT SELECT ON housing_dashboard.user_preferences TO mosaic_readonly;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.user_preferences_id_seq TO db_admin;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ User preferences table created successfully';
END $$;
