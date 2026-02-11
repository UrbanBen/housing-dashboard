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

async function exploreAllYears() {
  try {
    console.log('🔍 Exploring citizenship data across all census years...\n');

    // 2011 Census
    console.log('📊 2011 CENSUS TABLE STRUCTURE:');
    const structure2011 = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen11_australian_citizenship_lga'
      ORDER BY ordinal_position;
    `);
    console.table(structure2011.rows);

    console.log('\n📋 2011 SAMPLE DATA:');
    const sample2011 = await pool.query(`
      SELECT * FROM s12_census.cen11_australian_citizenship_lga LIMIT 5;
    `);
    console.table(sample2011.rows);

    // 2016 Census
    console.log('\n📊 2016 CENSUS TABLE STRUCTURE:');
    const structure2016 = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen16_australian_citizenship_lga'
      ORDER BY ordinal_position;
    `);
    console.table(structure2016.rows);

    console.log('\n📋 2016 SAMPLE DATA:');
    const sample2016 = await pool.query(`
      SELECT * FROM s12_census.cen16_australian_citizenship_lga LIMIT 5;
    `);
    console.table(sample2016.rows);

    // 2021 Census categories
    console.log('\n📊 2021 CATEGORIES:');
    const cats2021 = await pool.query(`
      SELECT DISTINCT citp_australian_citizenship
      FROM s12_census.cen21_australian_citizenship_lga
      ORDER BY citp_australian_citizenship;
    `);
    console.table(cats2021.rows);

    // Test query for a specific LGA across all years
    console.log('\n🗺️ TESTING: Sydney LGA across all years:');

    console.log('\n2011:');
    const sydney2011 = await pool.query(`
      SELECT * FROM s12_census.cen11_australian_citizenship_lga
      WHERE lga_name_2021 ILIKE '%Sydney%' AND lga_name_2021 NOT ILIKE '%North%'
      LIMIT 5;
    `);
    console.table(sydney2011.rows);

    console.log('\n2016:');
    const sydney2016 = await pool.query(`
      SELECT * FROM s12_census.cen16_australian_citizenship_lga
      WHERE lga_name_2021 ILIKE '%Sydney%' AND lga_name_2021 NOT ILIKE '%North%'
      LIMIT 5;
    `);
    console.table(sydney2016.rows);

    console.log('\n2021:');
    const sydney2021 = await pool.query(`
      SELECT * FROM s12_census.cen21_australian_citizenship_lga
      WHERE lga_name_2021 ILIKE '%Sydney%' AND lga_name_2021 NOT ILIKE '%North%'
      LIMIT 5;
    `);
    console.table(sydney2021.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

exploreAllYears();
