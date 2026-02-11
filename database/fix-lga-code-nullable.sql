-- Fix: Make lga_code nullable since API doesn't always provide it
-- We rely on lga_name (council name) instead

ALTER TABLE housing_dashboard.da_records_raw
ALTER COLUMN lga_code DROP NOT NULL;

ALTER TABLE housing_dashboard.da_aggregated
ALTER COLUMN lga_code DROP NOT NULL;
