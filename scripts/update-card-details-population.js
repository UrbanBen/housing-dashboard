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

/**
 * Template script for updating population data in card_details table
 *
 * TO USE THIS SCRIPT:
 * 1. Obtain LGA-level population data from ABS or other source
 * 2. Format data as an array of objects with lga_code and population
 * 3. Update the populationData array below
 * 4. Run: node scripts/update-card-details-population.js
 */

// Example format - replace with actual data
const populationData = [
  // { lga_code: '10050', lga_name: 'Albury', population: 51864 },
  // { lga_code: '10180', lga_name: 'Armidale', population: 32157 },
  // ... add all NSW LGAs here
];

async function updatePopulation() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Updating LGA populations...\n');

    if (populationData.length === 0) {
      console.log('⚠️  No population data provided.');
      console.log('Please edit this script and add population data in the populationData array.');
      console.log('\nExample format:');
      console.log('const populationData = [');
      console.log('  { lga_code: \'10050\', lga_name: \'Albury\', population: 51864 },');
      console.log('  { lga_code: \'10180\', lga_name: \'Armidale\', population: 32157 },');
      console.log('  // ... more LGAs');
      console.log('];');
      return;
    }

    let updateCount = 0;
    let errorCount = 0;

    for (const lgaData of populationData) {
      try {
        const result = await client.query(`
          UPDATE housing_dashboard.card_details
          SET
            population = $1,
            last_updated = CURRENT_TIMESTAMP
          WHERE level = 'lga'
          AND lga_code = $2
        `, [lgaData.population, lgaData.lga_code]);

        if (result.rowCount > 0) {
          console.log(`✓ Updated ${lgaData.lga_name || lgaData.lga_code}: ${lgaData.population.toLocaleString()}`);
          updateCount++;
        } else {
          console.log(`⚠️  LGA not found: ${lgaData.lga_code}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error updating ${lgaData.lga_code}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\nUpdating regional populations by aggregating LGAs...\n`);

    // Update region populations by summing LGA populations
    await client.query(`
      UPDATE housing_dashboard.card_details r
      SET
        population = subquery.total_population,
        last_updated = CURRENT_TIMESTAMP
      FROM (
        SELECT
          region_code,
          SUM(population) as total_population
        FROM housing_dashboard.card_details
        WHERE level = 'lga'
        AND population IS NOT NULL
        GROUP BY region_code
      ) subquery
      WHERE r.level = 'region'
      AND r.region_code = subquery.region_code
    `);

    // Get region summary
    const regionResult = await client.query(`
      SELECT region_name, population
      FROM housing_dashboard.card_details
      WHERE level = 'region'
      AND population IS NOT NULL
      ORDER BY population DESC
    `);

    regionResult.rows.forEach(region => {
      console.log(`✓ ${region.region_name}: ${region.population.toLocaleString()}`);
    });

    console.log(`\nUpdating state population...\n`);

    // Update state population by summing region populations
    await client.query(`
      UPDATE housing_dashboard.card_details
      SET
        population = (
          SELECT SUM(population)
          FROM housing_dashboard.card_details
          WHERE level = 'lga'
          AND population IS NOT NULL
        ),
        last_updated = CURRENT_TIMESTAMP
      WHERE level = 'state'
    `);

    // Get state summary
    const stateResult = await client.query(`
      SELECT state_name, population
      FROM housing_dashboard.card_details
      WHERE level = 'state'
    `);

    if (stateResult.rows[0]) {
      console.log(`✓ ${stateResult.rows[0].state_name}: ${stateResult.rows[0].population.toLocaleString()}`);
    }

    await client.query('COMMIT');

    console.log(`\n✅ Population update complete!`);
    console.log(`   LGAs updated: ${updateCount}`);
    console.log(`   Errors: ${errorCount}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updatePopulation();
