const { Pool } = require('pg');
const fs = require('fs');

// Read readonly password
const envContent = fs.readFileSync('/users/ben/permissions/.env.readonly', 'utf8');
const passwordMatch = envContent.match(/PASSWORD\s*=\s*(.+)/);
const password = passwordMatch ? passwordMatch[1].replace(/["']/g, '').trim() : null;

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'mosaic_readonly',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function testAPI() {
  console.log('========================================');
  console.log('Testing Country of Birth API with Real Data');
  console.log('========================================\n');

  const testLGAs = ['Sydney', 'Newcastle', 'Wollongong'];

  for (const lgaName of testLGAs) {
    console.log(`\n--- Testing: ${lgaName} ---\n`);

    try {
      // Simulate what the API does
      const countryColumn = 'country_of_birth_of_person';
      const valueColumn = 'value';
      const lgaColumn = 'lga_name_2021';

      // Get top countries
      const query = `
        SELECT
          ${countryColumn} as country_of_birth,
          SUM(${valueColumn}) as total
        FROM s12_census.cen21_country_of_birth_person_lga
        WHERE ${lgaColumn} = $1
        GROUP BY ${countryColumn}
        ORDER BY total DESC
        LIMIT 10
      `;

      const result = await pool.query(query, [lgaName]);

      if (result.rows.length === 0) {
        console.log(`  ❌ No data found for ${lgaName}`);
        continue;
      }

      // Get total population
      const totalQuery = `
        SELECT SUM(${valueColumn}) as total_population
        FROM s12_census.cen21_country_of_birth_person_lga
        WHERE ${lgaColumn} = $1
      `;

      const totalResult = await pool.query(totalQuery, [lgaName]);
      const totalPopulation = parseInt(totalResult.rows[0]?.total_population || 0);

      // Get Australia-born count
      const australiaBornQuery = `
        SELECT SUM(${valueColumn}) as australia_born
        FROM s12_census.cen21_country_of_birth_person_lga
        WHERE ${lgaColumn} = $1
          AND ${countryColumn} = 'Australia'
      `;

      const australiaBornResult = await pool.query(australiaBornQuery, [lgaName]);
      const australiaBorn = parseInt(australiaBornResult.rows[0]?.australia_born || 0);
      const overseasBorn = totalPopulation - australiaBorn;

      console.log(`  Total Population: ${totalPopulation.toLocaleString()}`);
      console.log(`  Australia-born: ${australiaBorn.toLocaleString()} (${((australiaBorn / totalPopulation) * 100).toFixed(1)}%)`);
      console.log(`  Overseas-born: ${overseasBorn.toLocaleString()} (${((overseasBorn / totalPopulation) * 100).toFixed(1)}%)`);
      console.log(`\n  Top 10 Countries:`);

      result.rows.forEach((row, index) => {
        const percentage = ((parseInt(row.total) / totalPopulation) * 100).toFixed(1);
        console.log(`    ${index + 1}. ${row.country_of_birth}: ${parseInt(row.total).toLocaleString()} (${percentage}%)`);
      });

      console.log(`\n  ✅ Data successfully retrieved for ${lgaName}`);

    } catch (error) {
      console.error(`  ❌ Error for ${lgaName}:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('✅ API Test Complete');
  console.log('========================================\n');
}

testAPI()
  .then(() => pool.end())
  .catch(error => {
    console.error('Fatal error:', error);
    pool.end();
  });
