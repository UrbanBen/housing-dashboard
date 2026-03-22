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

async function checkDemographicsAndRegions() {
  try {
    // Check demographics table structure
    console.log('=== Demographics table structure ===');
    const demogSchemaResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
      AND table_name = 'demographics'
      ORDER BY ordinal_position;
    `);
    console.log(demogSchemaResult.rows);

    // Sample demographics data
    console.log('\n=== Sample demographics data ===');
    const demogSampleResult = await pool.query(`
      SELECT * FROM housing_dashboard.demographics LIMIT 3;
    `);
    console.log(demogSampleResult.rows);

    // Check region_boundaries table
    console.log('\n=== Region boundaries table structure ===');
    const regionSchemaResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
      AND table_name = 'region_boundaries'
      ORDER BY ordinal_position;
    `);
    console.log(regionSchemaResult.rows);

    // Sample region boundaries data
    console.log('\n=== Sample region boundaries data ===');
    const regionSampleResult = await pool.query(`
      SELECT * FROM housing_dashboard.region_boundaries LIMIT 5;
    `);
    console.log(regionSampleResult.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDemographicsAndRegions();
