-- Fix: Increase VARCHAR lengths for fields that may exceed 255 characters
-- development_type: joins multiple types with "; "
-- development_description: can be long text

ALTER TABLE housing_dashboard.da_records_raw
ALTER COLUMN development_type TYPE TEXT,
ALTER COLUMN consent_authority TYPE TEXT,
ALTER COLUMN applicant_name TYPE TEXT;
