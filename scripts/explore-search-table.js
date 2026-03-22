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

async function exploreSearchTable() {
  try {
    // Get column information
    console.log('=== Table Schema ===');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
      AND table_name = 'search'
      ORDER BY ordinal_position;
    `);
    console.log(schemaResult.rows);

    // Get sample data
    console.log('\n=== Sample Data (first 3 rows) ===');
    const sampleResult = await pool.query(`
      SELECT * FROM housing_dashboard.search LIMIT 3;
    `);
    console.log(sampleResult.rows);

    // Count rows
    console.log('\n=== Row Count ===');
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM housing_dashboard.search;
    `);
    console.log('Total rows:', countResult.rows[0].count);

    // Check for region/area/population columns
    console.log('\n=== Key Columns Check ===');
    const keyColumnsResult = await pool.query(`
      SELECT
        lga_name24,
        lga_code24,
        areasqkm,
        sa4_name24,
        sa4_code24
      FROM housing_dashboard.search
      WHERE lga_name24 IS NOT NULL
      LIMIT 5;
    `);
    console.log(keyColumnsResult.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

exploreSearchTable();
