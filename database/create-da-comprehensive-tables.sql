-- ============================================================================
-- Development Applications Comprehensive Tracking System
-- Two-Table Architecture: Raw Records + Pre-Aggregated Views
-- ============================================================================

-- ============================================================================
-- TABLE 1: Raw DA Records
-- Purpose: Store every DA record as-is from DPHI API for full audit trail
-- Update: Daily (upsert by application_number)
-- Size: ~100K-500K rows (grows over time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS housing_dashboard.da_records_raw (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- Application Identifiers
  application_number VARCHAR(100) UNIQUE NOT NULL,
  planning_portal_app_number VARCHAR(100),

  -- Geographic Information
  lga_code VARCHAR(20) NOT NULL,
  lga_name VARCHAR(255) NOT NULL,
  consent_authority VARCHAR(255),
  address TEXT,
  lot_dp VARCHAR(100),

  -- Important Dates
  lodged_date DATE,
  determined_date DATE,
  notification_start_date DATE,
  notification_end_date DATE,

  -- Application Details
  determination_type VARCHAR(100),
  status VARCHAR(50),
  development_type VARCHAR(255),
  development_description TEXT,
  number_of_new_dwellings INTEGER,
  number_of_existing_dwellings INTEGER,
  estimated_cost DECIMAL(15,2),

  -- Categorization
  development_category VARCHAR(100),
  development_class VARCHAR(100),
  modification_number INTEGER,
  is_modification BOOLEAN DEFAULT FALSE,

  -- Applicant Information
  applicant_name VARCHAR(255),
  applicant_type VARCHAR(100),

  -- Assessment Details
  days_to_determination INTEGER,
  assessment_officer VARCHAR(255),

  -- Full API Response (for future flexibility)
  raw_json JSONB,

  -- Metadata
  api_fetched_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for raw table (performance optimization)
CREATE INDEX IF NOT EXISTS idx_da_raw_lga_code ON housing_dashboard.da_records_raw(lga_code);
CREATE INDEX IF NOT EXISTS idx_da_raw_determined_date ON housing_dashboard.da_records_raw(determined_date);
CREATE INDEX IF NOT EXISTS idx_da_raw_lodged_date ON housing_dashboard.da_records_raw(lodged_date);
CREATE INDEX IF NOT EXISTS idx_da_raw_status ON housing_dashboard.da_records_raw(status);
CREATE INDEX IF NOT EXISTS idx_da_raw_determination_type ON housing_dashboard.da_records_raw(determination_type);
CREATE INDEX IF NOT EXISTS idx_da_raw_lga_determined ON housing_dashboard.da_records_raw(lga_code, determined_date);
CREATE INDEX IF NOT EXISTS idx_da_raw_json ON housing_dashboard.da_records_raw USING gin(raw_json);

-- ============================================================================
-- TABLE 2: Aggregated DA Data
-- Purpose: Pre-computed aggregations for fast dashboard queries
-- Update: Daily after raw table is updated
-- Periods: Daily, Weekly, Monthly
-- Size: ~5K-20K rows
-- ============================================================================

CREATE TABLE IF NOT EXISTS housing_dashboard.da_aggregated (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- Geographic Dimension
  lga_code VARCHAR(20) NOT NULL,
  lga_name VARCHAR(255) NOT NULL,

  -- Time Dimension
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fiscal_year INTEGER, -- e.g., 2024 for FY2023-2024
  calendar_year INTEGER,
  calendar_month INTEGER, -- 1-12
  calendar_week INTEGER, -- 1-53

  -- Determination Metrics (by determined_date)
  total_determined INTEGER DEFAULT 0,
  determined_approved INTEGER DEFAULT 0,
  determined_refused INTEGER DEFAULT 0,
  determined_withdrawn INTEGER DEFAULT 0,
  determined_deferred INTEGER DEFAULT 0,
  determined_other INTEGER DEFAULT 0,

  -- Lodgement Metrics (by lodged_date)
  total_lodged INTEGER DEFAULT 0,

  -- Financial Metrics
  total_estimated_cost DECIMAL(18,2) DEFAULT 0,
  avg_estimated_cost DECIMAL(18,2) DEFAULT 0,

  -- Dwelling Metrics
  total_new_dwellings INTEGER DEFAULT 0,
  avg_new_dwellings_per_da DECIMAL(10,2) DEFAULT 0,

  -- Efficiency Metrics
  avg_days_to_determination DECIMAL(10,2) DEFAULT 0,
  median_days_to_determination DECIMAL(10,2) DEFAULT 0,

  -- Modification Metrics
  total_modifications INTEGER DEFAULT 0,
  modification_percentage DECIMAL(5,2) DEFAULT 0,

  -- Development Type Breakdown (JSON for flexibility)
  development_types_breakdown JSONB,

  -- Applicant Type Breakdown
  applicant_types_breakdown JSONB,

  -- Metadata
  record_count INTEGER DEFAULT 0, -- Number of raw records aggregated
  aggregated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint: one record per LGA per period
  CONSTRAINT unique_lga_period UNIQUE(lga_code, period_type, period_start)
);

-- Indexes for aggregated table
CREATE INDEX IF NOT EXISTS idx_da_agg_lga_code ON housing_dashboard.da_aggregated(lga_code);
CREATE INDEX IF NOT EXISTS idx_da_agg_period_type ON housing_dashboard.da_aggregated(period_type);
CREATE INDEX IF NOT EXISTS idx_da_agg_period_start ON housing_dashboard.da_aggregated(period_start);
CREATE INDEX IF NOT EXISTS idx_da_agg_lga_period ON housing_dashboard.da_aggregated(lga_code, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_da_agg_fiscal_year ON housing_dashboard.da_aggregated(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_da_agg_calendar_year_month ON housing_dashboard.da_aggregated(calendar_year, calendar_month);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant SELECT to readonly user
GRANT SELECT ON housing_dashboard.da_records_raw TO mosaic_readonly;
GRANT SELECT ON housing_dashboard.da_aggregated TO mosaic_readonly;

-- Grant full permissions to admin user
GRANT SELECT, INSERT, UPDATE, DELETE ON housing_dashboard.da_records_raw TO db_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON housing_dashboard.da_aggregated TO db_admin;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.da_records_raw_id_seq TO db_admin;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.da_aggregated_id_seq TO db_admin;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE housing_dashboard.da_records_raw IS
'Raw Development Application records from DPHI ePlanning API. Updated daily. Contains full audit trail with original API responses.';

COMMENT ON TABLE housing_dashboard.da_aggregated IS
'Pre-aggregated DA statistics by LGA and time period (daily/weekly/monthly). Updated daily after raw records are refreshed. Optimized for fast dashboard queries.';

-- ============================================================================
-- HELPER VIEW: Latest Aggregation Status
-- ============================================================================

CREATE OR REPLACE VIEW housing_dashboard.v_da_aggregation_status AS
SELECT
  period_type,
  MAX(period_end) as latest_period_end,
  MAX(aggregated_at) as last_aggregated_at,
  COUNT(DISTINCT lga_code) as lga_count,
  COUNT(*) as total_records
FROM housing_dashboard.da_aggregated
GROUP BY period_type
ORDER BY period_type;

GRANT SELECT ON housing_dashboard.v_da_aggregation_status TO mosaic_readonly;
GRANT SELECT ON housing_dashboard.v_da_aggregation_status TO db_admin;

COMMENT ON VIEW housing_dashboard.v_da_aggregation_status IS
'Quick status view showing when each aggregation type was last updated.';
