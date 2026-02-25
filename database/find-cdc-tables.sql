-- Find all tables related to CDC/Complying Development
SELECT
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'housing_dashboard'
  AND (
    table_name ILIKE '%cdc%'
    OR table_name ILIKE '%complying%'
    OR table_name ILIKE '%cc%'
  )
ORDER BY table_name;

-- Also check what tables exist in housing_dashboard schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'housing_dashboard'
ORDER BY table_name;
