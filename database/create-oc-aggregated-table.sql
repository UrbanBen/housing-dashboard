-- ============================================================================
-- Occupation Certificate Aggregated Data Table
-- ============================================================================
-- Purpose: Store pre-aggregated OC statistics for fast dashboard queries
-- Database: research&insights
-- Schema: housing_dashboard
--
-- This table aggregates data from mosaic_pro.public.nsw_oc_data
-- Run this script ONCE to create the table structure
-- ============================================================================

-- Create table
CREATE TABLE IF NOT EXISTS housing_dashboard.oc_aggregated (
  -- Primary identification
  id SERIAL PRIMARY KEY,
  lga_code VARCHAR(10),
  lga_name VARCHAR(100) NOT NULL,

  -- Period classification
  period_type VARCHAR(10) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Time dimensions
  fiscal_year INTEGER, -- NSW fiscal year (July 1 - June 30)
  calendar_year INTEGER,
  calendar_month INTEGER, -- 1-12
  calendar_week INTEGER, -- 1-53

  -- Determination metrics
  total_determined INTEGER DEFAULT 0,
  determined_approved INTEGER DEFAULT 0,
  determined_withdrawn INTEGER DEFAULT 0,

  -- Metadata
  record_count INTEGER DEFAULT 0, -- Raw records aggregated
  aggregated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint to prevent duplicates
  CONSTRAINT oc_aggregated_unique UNIQUE (lga_name, period_type, period_start)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_oc_aggregated_lga ON housing_dashboard.oc_aggregated(lga_name);
CREATE INDEX IF NOT EXISTS idx_oc_aggregated_lga_code ON housing_dashboard.oc_aggregated(lga_code);
CREATE INDEX IF NOT EXISTS idx_oc_aggregated_period_type ON housing_dashboard.oc_aggregated(period_type);
CREATE INDEX IF NOT EXISTS idx_oc_aggregated_period_start ON housing_dashboard.oc_aggregated(period_start);
CREATE INDEX IF NOT EXISTS idx_oc_aggregated_fiscal_year ON housing_dashboard.oc_aggregated(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_oc_aggregated_calendar_year ON housing_dashboard.oc_aggregated(calendar_year);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_oc_aggregated_lga_period
  ON housing_dashboard.oc_aggregated(lga_name, period_type, period_start);

CREATE INDEX IF NOT EXISTS idx_oc_aggregated_period_date
  ON housing_dashboard.oc_aggregated(period_type, period_start);

-- Grant permissions
GRANT SELECT ON housing_dashboard.oc_aggregated TO mosaic_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON housing_dashboard.oc_aggregated TO db_admin;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.oc_aggregated_id_seq TO db_admin;

-- Table comment
COMMENT ON TABLE housing_dashboard.oc_aggregated IS 'Pre-aggregated occupation certificate statistics for dashboard queries. Aggregated from mosaic_pro.public.nsw_oc_data.';
