-- Grant permissions for mosaic_readonly user to access s12_census schema
-- This script should be run by db_admin or a user with GRANT privileges

-- Grant USAGE on the schema (required to access schema objects)
GRANT USAGE ON SCHEMA s12_census TO mosaic_readonly;

-- Grant SELECT on all existing tables in s12_census
GRANT SELECT ON ALL TABLES IN SCHEMA s12_census TO mosaic_readonly;

-- Grant SELECT on all future tables in s12_census (auto-grant)
ALTER DEFAULT PRIVILEGES IN SCHEMA s12_census
GRANT SELECT ON TABLES TO mosaic_readonly;

-- Verify permissions were granted
SELECT
    schemaname,
    tablename,
    has_table_privilege('mosaic_readonly', schemaname||'.'||tablename, 'SELECT') as can_select
FROM pg_tables
WHERE schemaname = 's12_census'
ORDER BY tablename
LIMIT 10;
