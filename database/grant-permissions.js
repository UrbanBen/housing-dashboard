const { Pool } = require('pg');
const fs = require('fs');

async function grantPermissions() {
  // Read admin password
  const envContent = fs.readFileSync('/users/ben/permissions/.env.admin', 'utf8');
  const passwordMatch = envContent.match(/PASSWORD\s*=\s*(.+)/);
  const password = passwordMatch ? passwordMatch[1].replace(/["']/g, '').trim() : null;

  if (!password) {
    console.error('Could not find password in .env.admin file');
    process.exit(1);
  }

  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Granting permissions to mosaic_readonly for s12_census schema...\n');

    // Grant USAGE on schema
    await pool.query('GRANT USAGE ON SCHEMA s12_census TO mosaic_readonly');
    console.log('✓ Granted USAGE on schema s12_census');

    // Grant SELECT on all existing tables
    await pool.query('GRANT SELECT ON ALL TABLES IN SCHEMA s12_census TO mosaic_readonly');
    console.log('✓ Granted SELECT on all existing tables in s12_census');

    // Grant SELECT on future tables
    await pool.query('ALTER DEFAULT PRIVILEGES IN SCHEMA s12_census GRANT SELECT ON TABLES TO mosaic_readonly');
    console.log('✓ Granted SELECT on future tables in s12_census');

    // Verify permissions
    const result = await pool.query(`
      SELECT
        schemaname,
        tablename,
        has_table_privilege('mosaic_readonly', schemaname||'.'||tablename, 'SELECT') as can_select
      FROM pg_tables
      WHERE schemaname = 's12_census'
      ORDER BY tablename
      LIMIT 10
    `);

    console.log('\n✓ Permissions granted successfully!');
    console.log('\nVerification (first 10 tables):');
    console.table(result.rows);

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

grantPermissions();
