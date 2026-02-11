-- Fix: Change modification_number from INTEGER to VARCHAR
-- API returns strings like "D394/15", "PAN", "DA2021.273"

ALTER TABLE housing_dashboard.da_records_raw
ALTER COLUMN modification_number TYPE VARCHAR(100);
