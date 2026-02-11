-- Fix: Change remaining VARCHAR(100) fields that may exceed limits

ALTER TABLE housing_dashboard.da_records_raw
ALTER COLUMN lot_dp TYPE TEXT,
ALTER COLUMN modification_number TYPE TEXT;
