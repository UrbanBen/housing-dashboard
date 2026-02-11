-- Development Applications Table
-- Stores monthly DA determination data per LGA from DPHI ePlanning API
-- Data updated weekly via automated script

CREATE TABLE IF NOT EXISTS housing_dashboard.development_applications (
  id SERIAL PRIMARY KEY,
  lga_code VARCHAR(10) NOT NULL,
  lga_name VARCHAR(255) NOT NULL,
  month_year DATE NOT NULL, -- First day of month (e.g., 2024-01-01)
  total_determined INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 0,
  refused INTEGER DEFAULT 0,
  withdrawn INTEGER DEFAULT 0,
  data_updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one record per LGA per month
  CONSTRAINT unique_lga_month UNIQUE(lga_code, month_year)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_da_lga_code ON housing_dashboard.development_applications(lga_code);
CREATE INDEX IF NOT EXISTS idx_da_month_year ON housing_dashboard.development_applications(month_year);
CREATE INDEX IF NOT EXISTS idx_da_lga_month ON housing_dashboard.development_applications(lga_code, month_year);

-- Grant permissions to readonly user
GRANT SELECT ON housing_dashboard.development_applications TO mosaic_readonly;

-- Grant full permissions to admin user
GRANT SELECT, INSERT, UPDATE, DELETE ON housing_dashboard.development_applications TO db_admin;
GRANT USAGE, SELECT ON SEQUENCE housing_dashboard.development_applications_id_seq TO db_admin;

-- Add comment
COMMENT ON TABLE housing_dashboard.development_applications IS 'Monthly Development Application determination data per LGA from DPHI ePlanning API. Updated weekly via automated script.';
