-- Grant SELECT permission on cdc_historic table to readonly user
-- Run this with admin credentials

-- Grant permission on the table
GRANT SELECT ON housing_dashboard.cdc_historic TO mosaic_readonly;

-- Verify the grant was successful
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'housing_dashboard'
  AND table_name = 'cdc_historic'
  AND grantee = 'mosaic_readonly';
