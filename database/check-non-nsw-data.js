const { Pool } = require('pg');
const fs = require('fs');

// Read admin password
const envContent = fs.readFileSync('/users/ben/permissions/.env.admin', 'utf8');
const passwordMatch = envContent.match(/PASSWORD\s*=\s*(.+)/);
const password = passwordMatch ? passwordMatch[1].replace(/["']/g, '').trim() : null;

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function checkNonNSWData() {
  console.log('========================================');
  console.log('Checking for non-NSW data in cen21_country_of_birth_lga');
  console.log('========================================\n');

  try {
    // Get list of NSW LGAs from housing_dashboard for comparison
    const nswQuery = `
      SELECT DISTINCT lga_name24
      FROM housing_dashboard.search
      WHERE ste_name21 = 'New South Wales'
        AND lga_name24 IS NOT NULL
    `;
    const nswLGAs = await pool.query(nswQuery);
    console.log(`Found ${nswLGAs.rows.length} NSW LGAs in housing_dashboard\n`);

    // Check if there are any LGAs in the census table that are NOT in NSW list
    const nonNSWQuery = `
      SELECT DISTINCT c.lga_name_2021
      FROM s12_census.cen21_country_of_birth_lga c
      WHERE NOT EXISTS (
        SELECT 1 FROM housing_dashboard.search h
        WHERE h.lga_name24 = c.lga_name_2021
          AND h.ste_name21 = 'New South Wales'
      )
      ORDER BY c.lga_name_2021
    `;
    const nonNSWLGAs = await pool.query(nonNSWQuery);

    if (nonNSWLGAs.rows.length > 0) {
      console.log(`Found ${nonNSWLGAs.rows.length} LGAs that are NOT in NSW list:`);
      nonNSWLGAs.rows.forEach(row => console.log(`  - ${row.lga_name_2021}`));
      console.log('\nThese might be Victorian, Queensland, or other state LGAs with real data!\n');

      // Check sample data from one of these LGAs
      if (nonNSWLGAs.rows.length > 0) {
        const sampleLGA = nonNSWLGAs.rows[0].lga_name_2021;
        console.log(`Checking data for ${sampleLGA}:`);

        const sampleQuery = `
          SELECT DISTINCT country_of_birth
          FROM s12_census.cen21_country_of_birth_lga
          WHERE lga_name_2021 = $1
          ORDER BY country_of_birth
          LIMIT 50
        `;
        const countries = await pool.query(sampleQuery, [sampleLGA]);
        console.log(`  Countries (first 50): ${countries.rows.length} found`);
        countries.rows.slice(0, 15).forEach(row => console.log(`    - ${row.country_of_birth}`));

        if (countries.rows.length > 30) {
          console.log(`\n  ✅ This LGA has ${countries.rows.length} countries (more than synthetic 30!)`);
          console.log('  This suggests there IS real census data in the table!');
        }
      }
    } else {
      console.log('No LGAs found outside NSW list.');
      console.log('All data appears to be for NSW only (synthetic data).');
    }

    // Check if Brisbane or Melbourne have more than 30 countries
    console.log('\n--- Checking specific non-NSW LGAs ---');
    for (const testLGA of ['Brisbane', 'Melbourne', 'Gold Coast']) {
      const testQuery = `
        SELECT COUNT(DISTINCT country_of_birth) as country_count
        FROM s12_census.cen21_country_of_birth_lga
        WHERE lga_name_2021 = $1
      `;
      const result = await pool.query(testQuery, [testLGA]);
      if (result.rows[0].country_count > 0) {
        console.log(`  ${testLGA}: ${result.rows[0].country_count} countries`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkNonNSWData();
