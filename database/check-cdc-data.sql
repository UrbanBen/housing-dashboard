-- Check CDC historic table data
-- Run this to see what LGA names exist and if there's data

-- Check if table exists and has data
SELECT COUNT(*) as total_records
FROM housing_dashboard.cdc_historic;

-- Check distinct LGA names (to see exact formatting)
SELECT DISTINCT lga_name
FROM housing_dashboard.cdc_historic
WHERE lga_name ILIKE '%north sydney%'
ORDER BY lga_name;

-- Check sample data for North Sydney
SELECT
  period_start,
  lga_name,
  total_dwellings
FROM housing_dashboard.cdc_historic
WHERE lga_name ILIKE '%north sydney%'
ORDER BY period_start DESC
LIMIT 10;

-- Check all distinct LGA names
SELECT DISTINCT lga_name
FROM housing_dashboard.cdc_historic
ORDER BY lga_name
LIMIT 20;
