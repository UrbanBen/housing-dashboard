const { Pool } = require('pg');
require('dotenv').config({ path: '/users/ben/permissions/.env.admin' });

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function checkCitizenshipData() {
  try {
    // Check for 2021 census LGA citizenship tables
    console.log('🔍 SEARCHING FOR 2021 CITIZENSHIP TABLES:\n');
    const searchQuery = `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name LIKE '%cen21%citizenship%'
         OR table_name LIKE '%2021%citizenship%'
      ORDER BY table_schema, table_name;
    `;
    const search = await pool.query(searchQuery);
    console.table(search.rows);

    // Check all cen21 tables
    console.log('\n📊 ALL 2021 CENSUS TABLES:');
    const cen21Query = `
      SELECT table_name,
             (SELECT COUNT(*) FROM information_schema.columns
              WHERE table_schema = 's12_census' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 's12_census'
        AND table_name LIKE '%cen21%'
      ORDER BY table_name;
    `;
    const cen21 = await pool.query(cen21Query);
    console.table(cen21.rows);

    // Check if there's SA2 to LGA correspondence in the search table
    console.log('\n🗺️ CHECKING HOUSING_DASHBOARD.SEARCH TABLE FOR SA2/LGA MAPPING:');
    const searchTableQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
        AND table_name = 'search'
        AND (column_name LIKE '%sa2%' OR column_name LIKE '%lga%')
      ORDER BY column_name;
    `;
    const searchTable = await pool.query(searchTableQuery);
    console.table(searchTable.rows);

    // Sample data from search table to see SA2/LGA relationship
    console.log('\n📍 SAMPLE SA2/LGA RELATIONSHIP FROM SEARCH TABLE:');
    const sampleQuery = `
      SELECT lga_name24, lga_code24, sa2_name21, sa2_code21
      FROM housing_dashboard.search
      WHERE sa2_code21 IS NOT NULL
      LIMIT 10;
    `;
    const sampleResult = await pool.query(sampleQuery);
    console.table(sampleResult.rows);

    // Count unique SA2s per LGA
    console.log('\n📈 SA2s PER LGA (sample):');
    const countQuery = `
      SELECT lga_name24, COUNT(DISTINCT sa2_code21) as sa2_count
      FROM housing_dashboard.search
      WHERE sa2_code21 IS NOT NULL
      GROUP BY lga_name24
      ORDER BY sa2_count DESC
      LIMIT 10;
    `;
    const countResult = await pool.query(countQuery);
    console.table(countResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCitizenshipData();
