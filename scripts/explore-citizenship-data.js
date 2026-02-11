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

async function exploreCitizenshipData() {
  try {
    console.log('🔍 Exploring citizenship data...\n');

    // Get table structure
    console.log('📊 TABLE STRUCTURE:');
    const structureQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen21_aus_citizenship_sa2'
      ORDER BY ordinal_position;
    `;
    const structure = await pool.query(structureQuery);
    console.table(structure.rows);

    // Get sample data
    console.log('\n📋 SAMPLE DATA (first 5 rows):');
    const sampleQuery = `
      SELECT * FROM s12_census.cen21_aus_citizenship_sa2
      LIMIT 5;
    `;
    const sample = await pool.query(sampleQuery);
    console.table(sample.rows);

    // Get total row count
    console.log('\n📈 STATISTICS:');
    const countQuery = `SELECT COUNT(*) as total_rows FROM s12_census.cen21_aus_citizenship_sa2;`;
    const count = await pool.query(countQuery);
    console.log(`Total rows: ${count.rows[0].total_rows}`);

    // Get distinct SA2 regions (if SA2 column exists)
    const distinctQuery = `
      SELECT COUNT(DISTINCT sa2_code_2021) as unique_sa2s
      FROM s12_census.cen21_aus_citizenship_sa2;
    `;
    try {
      const distinct = await pool.query(distinctQuery);
      console.log(`Unique SA2 regions: ${distinct.rows[0].unique_sa2s}`);
    } catch (e) {
      console.log('No sa2_code_2021 column found');
    }

    // Check for citizenship categories
    console.log('\n🏳️ CITIZENSHIP CATEGORIES:');
    const categoriesQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen21_aus_citizenship_sa2'
        AND column_name NOT LIKE '%code%'
        AND column_name NOT LIKE '%name%'
        AND data_type IN ('integer', 'numeric', 'bigint', 'real', 'double precision')
      ORDER BY column_name;
    `;
    const categories = await pool.query(categoriesQuery);
    console.log('Numeric columns (likely citizenship counts):');
    console.log(categories.rows.map(r => r.column_name).join(', '));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

exploreCitizenshipData();
