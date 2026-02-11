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

async function exploreLGACitizenship() {
  try {
    console.log('🔍 Exploring 2021 LGA Citizenship Data...\n');

    // Get table structure
    console.log('📊 TABLE STRUCTURE:');
    const structureQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen21_australian_citizenship_lga'
      ORDER BY ordinal_position;
    `;
    const structure = await pool.query(structureQuery);
    console.table(structure.rows);

    // Get sample data
    console.log('\n📋 SAMPLE DATA:');
    const sampleQuery = `
      SELECT * FROM s12_census.cen21_australian_citizenship_lga
      LIMIT 10;
    `;
    const sample = await pool.query(sampleQuery);
    console.table(sample.rows);

    // Get citizenship categories
    console.log('\n🏳️ CITIZENSHIP CATEGORIES:');
    const categoriesQuery = `
      SELECT citp_australian_citizenship, COUNT(*) as lga_count, SUM(value) as total_people
      FROM s12_census.cen21_australian_citizenship_lga
      GROUP BY citp_australian_citizenship
      ORDER BY total_people DESC;
    `;
    const categories = await pool.query(categoriesQuery);
    console.table(categories.rows);

    // Get data for a specific LGA (Sydney)
    console.log('\n📍 EXAMPLE: City of Sydney LGA:');
    const sydneyQuery = `
      SELECT lga_name_2021, citp_australian_citizenship, value
      FROM s12_census.cen21_australian_citizenship_lga
      WHERE lga_name_2021 ILIKE '%Sydney%'
      ORDER BY lga_name_2021, value DESC;
    `;
    const sydney = await pool.query(sydneyQuery);
    console.table(sydney.rows);

    // Count total LGAs
    console.log('\n📈 STATISTICS:');
    const statsQuery = `
      SELECT
        COUNT(DISTINCT lga_name_2021) as unique_lgas,
        COUNT(*) as total_rows
      FROM s12_census.cen21_australian_citizenship_lga;
    `;
    const stats = await pool.query(statsQuery);
    console.table(stats.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

exploreLGACitizenship();
