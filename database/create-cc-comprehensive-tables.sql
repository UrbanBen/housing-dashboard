-- ============================================================================
-- Construction Certificates Comprehensive Tracking System
-- Two-Table Architecture: Raw Records + Pre-Aggregated Views
-- ============================================================================

-- ============================================================================
-- TABLE 1: Raw CC Records
-- Purpose: Store every CC record from NSW ePlanning API for full audit trail
-- Update: Daily (upsert by application_number)
-- Size: ~260K rows (grows over time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS housing_dashboard.cc_records_raw (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- Application Identifiers
  application_number VARCHAR(100) UNIQUE NOT NULL,
  planning_portal_app_number VARCHAR(100),

  -- Council Information
  lga_code VARCHAR(20),
  lga_name VARCHAR(255) NOT NULL,
  council_name VARCHAR(255),

  -- Important Dates
  lodged_date DATE,
  determined_date DATE,
  date_last_updated TIMESTAMP,

  -- Status
  application_status VARCHAR(100),

  -- Builder Information
  builder_legal_name TEXT,
  builder_trading_name TEXT,
  search_business_by VARCHAR(50),

  -- Development Details
  development_purpose TEXT,
  storeys_proposed INTEGER,
  units_proposed INTEGER,
  land_area DECIMAL(15,2),
  existing_gross_floor_area DECIMAL(15,2),
  proposed_gross_floor_area DECIMAL(15,2),
  cost_of_development DECIMAL(15,2),

  -- Building Use
  current_building_use TEXT,
  proposed_building_use TEXT,

  -- Building Code Classification (Array stored as TEXT)
  building_code_class TEXT,
  building_code_description TEXT,

  -- Development Types (Array joined with '; ')
  development_type TEXT,

  -- Location
  address TEXT,
  lot_dp TEXT,

  -- Metadata
  raw_json JSONB NOT NULL,
  api_fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_cc_raw_lga_code ON housing_dashboard.cc_records_raw(lga_code);
CREATE INDEX IF NOT EXISTS idx_cc_raw_council_name ON housing_dashboard.cc_records_raw(council_name);
CREATE INDEX IF NOT EXISTS idx_cc_raw_lga_name ON housing_dashboard.cc_records_raw(lga_name);
CREATE INDEX IF NOT EXISTS idx_cc_raw_determined_date ON housing_dashboard.cc_records_raw(determined_date);
CREATE INDEX IF NOT EXISTS idx_cc_raw_status ON housing_dashboard.cc_records_raw(application_status);
CREATE INDEX IF NOT EXISTS idx_cc_raw_updated ON housing_dashboard.cc_records_raw(date_last_updated);
CREATE INDEX IF NOT EXISTS idx_cc_raw_builder ON housing_dashboard.cc_records_raw(builder_legal_name);

-- ============================================================================
-- TABLE 2: Aggregated CC Views
-- Purpose: Pre-computed daily/weekly/monthly summaries for fast dashboard queries
-- Update: After raw data fetch (via aggregation script)
-- Size: ~50K rows (one per LGA per period)
-- ============================================================================

CREATE TABLE IF NOT EXISTS housing_dashboard.cc_aggregated (
  -- Primary Key
  id SERIAL PRIMARY KEY,

  -- Geographic Information
  lga_code VARCHAR(20),
  lga_name VARCHAR(255) NOT NULL,

  -- Period Information
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  calendar_week INTEGER,
  calendar_month INTEGER,
  calendar_year INTEGER,
  fiscal_year INTEGER, -- NSW fiscal year (July 1 to June 30)

  -- Aggregated Counts
  total_applications INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0,
  total_withdrawn INTEGER DEFAULT 0,
  total_cancelled INTEGER DEFAULT 0,

  -- Financial Metrics
  total_estimated_cost DECIMAL(18,2),
  avg_estimated_cost DECIMAL(15,2),

  -- Building Metrics
  total_proposed_floor_area DECIMAL(18,2),
  avg_proposed_floor_area DECIMAL(15,2),
  total_units_proposed INTEGER,
  avg_storeys DECIMAL(5,2),

  -- Metadata
  record_count INTEGER DEFAULT 0,
  aggregated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint to prevent duplicates
  CONSTRAINT unique_cc_lga_period UNIQUE(lga_code, lga_name, period_type, period_start)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_cc_agg_period ON housing_dashboard.cc_aggregated(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_cc_agg_lga ON housing_dashboard.cc_aggregated(lga_code, lga_name);
CREATE INDEX IF NOT EXISTS idx_cc_agg_fiscal ON housing_dashboard.cc_aggregated(fiscal_year, calendar_month);
CREATE INDEX IF NOT EXISTS idx_cc_agg_composite ON housing_dashboard.cc_aggregated(period_type, lga_name, period_start);

-- ============================================================================
-- Helper View: CC Aggregation Status
-- Purpose: Quick overview of aggregation coverage
-- ============================================================================

CREATE OR REPLACE VIEW housing_dashboard.v_cc_aggregation_status AS
SELECT
  period_type,
  COUNT(DISTINCT lga_name) as unique_lgas,
  MIN(period_start) as earliest_period,
  MAX(period_start) as latest_period,
  SUM(total_applications) as total_applications_aggregated,
  MAX(aggregated_at) as last_aggregated
FROM housing_dashboard.cc_aggregated
GROUP BY period_type
ORDER BY period_type;

-- ============================================================================
-- Permissions
-- ============================================================================

-- Grant read access to readonly role
GRANT SELECT ON housing_dashboard.cc_records_raw TO mosaic_readonly;
GRANT SELECT ON housing_dashboard.cc_aggregated TO mosaic_readonly;
GRANT SELECT ON housing_dashboard.v_cc_aggregation_status TO mosaic_readonly;

-- Grant full access to admin
GRANT ALL PRIVILEGES ON housing_dashboard.cc_records_raw TO db_admin;
GRANT ALL PRIVILEGES ON housing_dashboard.cc_aggregated TO db_admin;
GRANT ALL PRIVILEGES ON SEQUENCE housing_dashboard.cc_records_raw_id_seq TO db_admin;
GRANT ALL PRIVILEGES ON SEQUENCE housing_dashboard.cc_aggregated_id_seq TO db_admin;

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Construction Certificates tables created successfully';
  RAISE NOTICE '   - cc_records_raw: Ready for API data';
  RAISE NOTICE '   - cc_aggregated: Ready for rollups';
  RAISE NOTICE '   - v_cc_aggregation_status: Helper view created';
END $$;
