const { Pool } = require('pg');
const fs = require('fs');

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

async function examineTable() {
  console.log('========================================');
  console.log('Examining Real Census Data');
  console.log('Table: s12_census.cen21_country_of_birth_lga');
  console.log('========================================\n');

  try {
    // Check table structure
    console.log('1. Table Structure:');
    const structureQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 's12_census'
        AND table_name = 'cen21_country_of_birth_lga'
      ORDER BY ordinal_position
    `;
    const structure = await pool.query(structureQuery);
    console.log(structure.rows);
    console.log('');

    // Count total records
    console.log('2. Total Records:');
    const countQuery = `SELECT COUNT(*) as count FROM s12_census.cen21_country_of_birth_lga`;
    const count = await pool.query(countQuery);
    console.log(`   ${parseInt(count.rows[0].count).toLocaleString()} records\n`);

    // Sample data
    console.log('3. Sample Records:');
    const sampleQuery = `
      SELECT * FROM s12_census.cen21_country_of_birth_lga
      LIMIT 5
    `;
    const sample = await pool.query(sampleQuery);
    console.log(sample.rows);
    console.log('');

    // Count unique LGAs
    console.log('4. Unique LGAs:');
    const lgaCountQuery = `
      SELECT COUNT(DISTINCT lga_name_2021) as count
      FROM s12_census.cen21_country_of_birth_lga
    `;
    const lgaCount = await pool.query(lgaCountQuery);
    console.log(`   ${parseInt(lgaCount.rows[0].count).toLocaleString()} LGAs\n`);

    // Sample LGAs
    console.log('5. Sample LGAs:');
    const lgaListQuery = `
      SELECT DISTINCT lga_name_2021
      FROM s12_census.cen21_country_of_birth_lga
      ORDER BY lga_name_2021
      LIMIT 10
    `;
    const lgaList = await pool.query(lgaListQuery);
    lgaList.rows.forEach(row => console.log(`   - ${row.lga_name_2021}`));
    console.log('');

    // Check column names for country, age, sex
    console.log('6. Distinct Column Values:');

    // Get all columns
    const columns = structure.rows.map(r => r.column_name);

    // Find columns that might contain country
    const countryCol = columns.find(c => c.toLowerCase().includes('country') || c.toLowerCase().includes('bplp'));
    if (countryCol) {
      const countryQuery = `
        SELECT DISTINCT ${countryCol}
        FROM s12_census.cen21_country_of_birth_lga
        ORDER BY ${countryCol}
        LIMIT 20
      `;
      const countries = await pool.query(countryQuery);
      console.log(`   Countries (first 20 from ${countryCol}):`);
      countries.rows.forEach(row => console.log(`      - ${row[countryCol]}`));
      console.log('');
    }

    // Find age column
    const ageCol = columns.find(c => c.toLowerCase().includes('age'));
    if (ageCol) {
      const ageQuery = `
        SELECT DISTINCT ${ageCol}
        FROM s12_census.cen21_country_of_birth_lga
        ORDER BY ${ageCol}
        LIMIT 10
      `;
      const ages = await pool.query(ageQuery);
      console.log(`   Age groups (from ${ageCol}):`);
      ages.rows.forEach(row => console.log(`      - ${row[ageCol]}`));
      console.log('');
    }

    // Find sex column
    const sexCol = columns.find(c => c.toLowerCase().includes('sex'));
    if (sexCol) {
      const sexQuery = `
        SELECT DISTINCT ${sexCol}
        FROM s12_census.cen21_country_of_birth_lga
      `;
      const sexes = await pool.query(sexQuery);
      console.log(`   Sex categories (from ${sexCol}):`);
      sexes.rows.forEach(row => console.log(`      - ${row[sexCol]}`));
      console.log('');
    }

    // Check for a sample LGA
    console.log('7. Sample Data for Sydney:');
    const sydneyQuery = `
      SELECT *
      FROM s12_census.cen21_country_of_birth_lga
      WHERE lga_name_2021 ILIKE '%sydney%'
      LIMIT 5
    `;
    const sydney = await pool.query(sydneyQuery);
    console.log(sydney.rows);
    console.log('');

    console.log('========================================');

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

examineTable();
