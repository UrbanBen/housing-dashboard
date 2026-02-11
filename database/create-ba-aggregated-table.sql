-- Building Approvals Aggregated Table
-- Aggregates data from housing_dashboard.building_approvals_nsw_lga
-- Used by BA comprehensive cards (Daily, Weekly, Monthly, 13-Month, YoY, History)

DROP TABLE IF EXISTS housing_dashboard.ba_aggregated CASCADE;

CREATE TABLE housing_dashboard.ba_aggregated (
  -- Identification
  id SERIAL PRIMARY KEY,
  lga_code VARCHAR(10),
  lga_name VARCHAR(100) NOT NULL,

  -- Period classification
  period_type VARCHAR(10) NOT NULL,  -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Time dimensions
  fiscal_year INTEGER,     -- NSW fiscal year (July 1 - June 30)
  calendar_year INTEGER,
  calendar_month INTEGER,  -- 1-12
  calendar_week INTEGER,   -- 1-53

  -- Approval metrics
  total_approvals INTEGER DEFAULT 0,

  -- Metadata
  record_count INTEGER DEFAULT 0,  -- Raw records aggregated
  aggregated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  CONSTRAINT ba_aggregated_unique UNIQUE (lga_name, period_type, period_start)
);

-- Indexes for fast dashboard queries
CREATE INDEX idx_ba_aggregated_lga ON housing_dashboard.ba_aggregated(lga_name);
CREATE INDEX idx_ba_aggregated_lga_code ON housing_dashboard.ba_aggregated(lga_code);
CREATE INDEX idx_ba_aggregated_period_type ON housing_dashboard.ba_aggregated(period_type);
CREATE INDEX idx_ba_aggregated_period_start ON housing_dashboard.ba_aggregated(period_start);
CREATE INDEX idx_ba_aggregated_fiscal_year ON housing_dashboard.ba_aggregated(fiscal_year);
CREATE INDEX idx_ba_aggregated_calendar_year ON housing_dashboard.ba_aggregated(calendar_year);
CREATE INDEX idx_ba_aggregated_lga_period ON housing_dashboard.ba_aggregated(lga_name, period_type);
CREATE INDEX idx_ba_aggregated_period_date ON housing_dashboard.ba_aggregated(period_type, period_start);

-- Grant permissions
GRANT SELECT ON housing_dashboard.ba_aggregated TO mosaic_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON housing_dashboard.ba_aggregated TO db_admin;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.ba_aggregated_id_seq TO db_admin;

-- Add comment
COMMENT ON TABLE housing_dashboard.ba_aggregated IS 'Aggregated building approvals data for dashboard cards. Updated weekly via cron job.';
