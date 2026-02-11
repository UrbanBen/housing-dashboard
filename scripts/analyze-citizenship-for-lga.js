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

async function analyzeCitizenship() {
  try {
    console.log('🔍 Analyzing citizenship data for LGA aggregation...\n');

    // Check citizenship categories
    console.log('📊 CITIZENSHIP CATEGORIES:');
    const categoriesQuery = `
      SELECT aus_citizenship, COUNT(*) as regions, SUM(value) as total_people
      FROM s12_census.cen21_aus_citizenship_sa2
      GROUP BY aus_citizenship
      ORDER BY total_people DESC;
    `;
    const categories = await pool.query(categoriesQuery);
    console.table(categories.rows);

    // Check if we have SA2 to LGA mapping
    console.log('\n🗺️ CHECKING SA2 TO LGA MAPPING:');
    const mappingQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 's12_census'
        AND (table_name LIKE '%sa2%lga%' OR table_name LIKE '%lga%sa2%' OR table_name LIKE '%correspondence%')
      LIMIT 10;
    `;
    const mapping = await pool.query(mappingQuery);
    console.table(mapping.rows);

    // Search for any LGA mapping tables
    console.log('\n🔎 SEARCHING FOR LGA TABLES:');
    const lgaTablesQuery = `
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name LIKE '%lga%'
        AND table_schema IN ('s12_census', 'housing_dashboard', 'public')
      ORDER BY table_schema, table_name
      LIMIT 20;
    `;
    const lgaTables = await pool.query(lgaTablesQuery);
    console.table(lgaTables.rows);

    // Sample a specific SA2 to see full data
    console.log('\n📍 EXAMPLE: NSW SA2 Data (Sydney CBD region):');
    const exampleQuery = `
      SELECT sa2_code_2021, aus_citizenship, value
      FROM s12_census.cen21_aus_citizenship_sa2
      WHERE sa2_code_2021 = '116021551'
      ORDER BY aus_citizenship;
    `;
    const example = await pool.query(exampleQuery);
    console.table(example.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeCitizenship();
