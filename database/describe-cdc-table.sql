-- Get CDC table structure
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'housing_dashboard'
  AND table_name = 'cdc_historic'
ORDER BY ordinal_position;

-- Get sample row to see actual data
SELECT *
FROM housing_dashboard.cdc_historic
LIMIT 1;
