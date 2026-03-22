const { Pool } = require('pg');
const fs = require('fs');

// Read password from file
const passwordPath = '/users/ben/permissions/.env.admin';
const envContent = fs.readFileSync(passwordPath, 'utf8');
const passwordMatch = envContent.match(/ADMIN_DATABASE_PASSWORD=(.+)/);
const password = passwordMatch ? passwordMatch[1].trim() : 'MVN0u0LL9rw';

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    // Get all tables in housing_dashboard schema
    console.log('=== Tables in housing_dashboard schema ===');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'housing_dashboard'
      ORDER BY table_name;
    `);
    console.log(tablesResult.rows.map(r => r.table_name));

    // Check if there's SA4 region info in search table
    console.log('\n=== SA4 Region columns in search table ===');
    const sa4Result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
      AND table_name = 'search'
      AND column_name LIKE '%sa4%';
    `);
    console.log(sa4Result.rows);

    // Check ABS population tables
    console.log('\n=== Check for population data in ABS tables ===');
    const absTablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'housing_dashboard'
      AND table_name LIKE '%abs%';
    `);
    console.log(absTablesResult.rows);

    // Sample SA4 data if exists
    console.log('\n=== Sample SA4 data ===');
    const sa4SampleResult = await pool.query(`
      SELECT DISTINCT
        sa4_code24,
        sa4_name24
      FROM housing_dashboard.search
      WHERE sa4_code24 IS NOT NULL
      LIMIT 10;
    `);
    console.log(sa4SampleResult.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
