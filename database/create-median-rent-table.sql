-- Median Weekly Rent Table
-- Stores NSW rental bond data by LGA, dwelling type, and bedroom count
-- Data source: NSW Fair Trading Rent and Sales Reports

CREATE TABLE IF NOT EXISTS housing_dashboard.median_weekly_rent (
  id SERIAL PRIMARY KEY,

  -- Time Period
  quarter VARCHAR(50) NOT NULL,           -- e.g., "December 2025 Quarter"
  quarter_date DATE NOT NULL,             -- Normalized date for sorting (first day of quarter)

  -- Geographic Breakdown
  gmr VARCHAR(255),                       -- Greater Metropolitan Region
  greater_sydney VARCHAR(100),            -- Greater Sydney classification
  rings VARCHAR(100),                     -- Sydney ring classification
  lga_name VARCHAR(255) NOT NULL,         -- Local Government Area name

  -- Property Classification
  dwelling_type VARCHAR(100) NOT NULL,    -- Total, Flats/Units, Houses, Townhouses
  num_bedrooms VARCHAR(50) NOT NULL,      -- Total, 1, 2, 3, 4+

  -- Rent Statistics
  first_quartile_rent DECIMAL(10,2),      -- 25th percentile rent ($)
  median_rent DECIMAL(10,2),              -- 50th percentile rent ($)
  third_quartile_rent DECIMAL(10,2),      -- 75th percentile rent ($)

  -- Bond Counts
  new_bonds_lodged INTEGER,               -- Number of new bonds in quarter
  total_bonds_held INTEGER,               -- Total bonds held

  -- Change Metrics (%)
  quarterly_change_median_pct DECIMAL(10,2),  -- Quarter-on-quarter median rent change
  annual_change_median_pct DECIMAL(10,2),     -- Year-on-year median rent change
  quarterly_change_bonds_pct DECIMAL(10,2),   -- Quarter-on-quarter bonds lodged change
  annual_change_bonds_pct DECIMAL(10,2),      -- Year-on-year bonds lodged change

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_median_rent_lga ON housing_dashboard.median_weekly_rent(lga_name);
CREATE INDEX idx_median_rent_quarter_date ON housing_dashboard.median_weekly_rent(quarter_date DESC);
CREATE INDEX idx_median_rent_dwelling_type ON housing_dashboard.median_weekly_rent(dwelling_type);
CREATE INDEX idx_median_rent_bedrooms ON housing_dashboard.median_weekly_rent(num_bedrooms);
CREATE INDEX idx_median_rent_composite ON housing_dashboard.median_weekly_rent(lga_name, quarter_date, dwelling_type, num_bedrooms);

-- Grant permissions
GRANT SELECT ON housing_dashboard.median_weekly_rent TO mosaic_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON housing_dashboard.median_weekly_rent TO db_admin;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.median_weekly_rent_id_seq TO mosaic_readonly;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.median_weekly_rent_id_seq TO db_admin;

-- Comments
COMMENT ON TABLE housing_dashboard.median_weekly_rent IS 'NSW rental bond statistics by LGA, dwelling type, and bedroom count from NSW Fair Trading';
COMMENT ON COLUMN housing_dashboard.median_weekly_rent.quarter IS 'Quarter label (e.g., December 2025 Quarter)';
COMMENT ON COLUMN housing_dashboard.median_weekly_rent.quarter_date IS 'Normalized quarter start date for time series queries';
COMMENT ON COLUMN housing_dashboard.median_weekly_rent.lga_name IS 'Local Government Area name for filtering';
COMMENT ON COLUMN housing_dashboard.median_weekly_rent.dwelling_type IS 'Property type: Total, Flats/Units, Houses, Townhouses';
COMMENT ON COLUMN housing_dashboard.median_weekly_rent.num_bedrooms IS 'Bedroom count: Total, 1, 2, 3, 4+';
