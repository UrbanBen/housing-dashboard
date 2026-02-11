-- Feedback System Table
-- Stores user feedback with AI-generated categories and priorities

CREATE TABLE IF NOT EXISTS housing_dashboard.user_feedback (
  id SERIAL PRIMARY KEY,

  -- User Information
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_id VARCHAR(255),

  -- Feedback Content
  feedback_text TEXT NOT NULL,

  -- AI Analysis (from Claude)
  category VARCHAR(100),  -- e.g., 'Bug Report', 'Feature Request', 'UX Improvement', 'Data Issue'
  priority VARCHAR(50),   -- e.g., 'Critical', 'High', 'Medium', 'Low'
  ai_summary TEXT,        -- Claude's summary of the feedback

  -- Context Information
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  browser_location JSONB, -- {city, country, lat, lng}
  selected_lga VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  email_sent_at TIMESTAMP,
  included_in_monthly_summary BOOLEAN DEFAULT FALSE,
  monthly_summary_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'new', -- 'new', 'acknowledged', 'in_progress', 'resolved'
  admin_notes TEXT
);

-- Indexes for fast queries
CREATE INDEX idx_feedback_created_at ON housing_dashboard.user_feedback(created_at DESC);
CREATE INDEX idx_feedback_category ON housing_dashboard.user_feedback(category);
CREATE INDEX idx_feedback_priority ON housing_dashboard.user_feedback(priority);
CREATE INDEX idx_feedback_status ON housing_dashboard.user_feedback(status);
CREATE INDEX idx_feedback_monthly_summary ON housing_dashboard.user_feedback(included_in_monthly_summary, created_at);
CREATE INDEX idx_feedback_user_email ON housing_dashboard.user_feedback(user_email);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON housing_dashboard.user_feedback TO mosaic_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON housing_dashboard.user_feedback TO db_admin;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.user_feedback_id_seq TO mosaic_readonly;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.user_feedback_id_seq TO db_admin;

-- Comments
COMMENT ON TABLE housing_dashboard.user_feedback IS 'Stores user feedback with AI-generated categorization and prioritization';
COMMENT ON COLUMN housing_dashboard.user_feedback.category IS 'AI-generated category: Bug Report, Feature Request, UX Improvement, Data Issue, Performance, Documentation, Other';
COMMENT ON COLUMN housing_dashboard.user_feedback.priority IS 'AI-generated priority: Critical, High, Medium, Low';
COMMENT ON COLUMN housing_dashboard.user_feedback.ai_summary IS 'Claude-generated summary of the feedback for quick review';
