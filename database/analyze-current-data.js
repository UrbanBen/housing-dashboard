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

async function analyzeData() {
  try {
    // Check if we have non-NSW LGAs (real data would have all of Australia)
    const lgaQuery = `
      SELECT DISTINCT lga_name_2021
      FROM s12_census.cen21_country_of_birth_lga
      ORDER BY lga_name_2021
      LIMIT 200
    `;
    const lgas = await pool.query(lgaQuery);
    console.log(`Total LGAs shown: ${lgas.rows.length}`);
    console.log('\nFirst 20 LGAs:');
    lgas.rows.slice(0, 20).forEach(row => console.log(`  - ${row.lga_name_2021}`));

    // Check for Victorian or Queensland LGAs (would indicate real national data)
    const vicLgas = lgas.rows.filter(r => r.lga_name_2021.includes('Victoria') ||
                                          ['Melbourne', 'Ballarat', 'Geelong', 'Bendigo'].includes(r.lga_name_2021));
    const qldLgas = lgas.rows.filter(r => r.lga_name_2021.includes('Queensland') ||
                                          ['Brisbane', 'Gold Coast', 'Cairns'].includes(r.lga_name_2021));

    console.log(`\nVictorian LGAs found: ${vicLgas.length}`);
    console.log(`Queensland LGAs found: ${qldLgas.length}`);

    // List all countries to see if it's my synthetic list or real census categories
    const countryQuery = `
      SELECT DISTINCT country_of_birth
      FROM s12_census.cen21_country_of_birth_lga
      ORDER BY country_of_birth
    `;
    const countries = await pool.query(countryQuery);
    console.log(`\nTotal countries: ${countries.rows.length}`);
    console.log('All countries:');
    countries.rows.forEach(row => console.log(`  - ${row.country_of_birth}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

analyzeData();
