const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

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

// Calculate annual growth rate using CAGR formula
function calculateGrowthRate(startPop, endPop, years) {
  if (!startPop || !endPop || years <= 0 || startPop <= 0 || endPop <= 0) return null;
  return parseFloat(((Math.pow(endPop / startPop, 1 / years) - 1) * 100).toFixed(2));
}

// Project population using growth rate
function projectPopulation(basePop, growthRate, years) {
  if (!basePop || !growthRate) return null;
  const growthFactor = Math.pow(1 + (growthRate / 100), years);
  return Math.round(basePop * growthFactor);
}

// Parse TSP CSV file for LGA census data
async function parseTSPFile(filePath) {
  return new Promise((resolve, reject) => {
    const lgaData = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const lgaCode = row.LGA_CODE_2021;
        const pop2011 = parseInt(row.Tot_persons_C11_P);
        const pop2016 = parseInt(row.Tot_persons_C16_P);
        const pop2021 = parseInt(row.Tot_persons_C21_P);

        if (lgaCode && pop2011 && pop2016 && pop2021) {
          lgaData.push({
            lgaCode,
            pop2011,
            pop2016,
            pop2021
          });
        }
      })
      .on('end', () => resolve(lgaData))
      .on('error', (error) => reject(error));
  });
}

// Parse TSP CSV file for State census data
async function parseStateTSPFile(filePath) {
  return new Promise((resolve, reject) => {
    const stateData = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const stateCode = row.STE_CODE_2021;
        const pop2011 = parseInt(row.Tot_persons_C11_P);
        const pop2016 = parseInt(row.Tot_persons_C16_P);
        const pop2021 = parseInt(row.Tot_persons_C21_P);

        if (stateCode && pop2011 && pop2016 && pop2021) {
          stateData.push({
            stateCode,
            pop2011,
            pop2016,
            pop2021
          });
        }
      })
      .on('end', () => resolve(stateData))
      .on('error', (error) => reject(error));
  });
}

async function populateCensusData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('===== POPULATING CENSUS DATA FROM ABS TSP FILES =====\n');

    // Parse LGA TSP file
    const lgaTSPPath = '/Users/ben/Desktop/2021_TSP_all_for_AUS_short-header/2021 Census TSP All Geographies for AUS/LGA/AUS/2021Census_T01_AUST_LGA.csv';
    console.log('Step 1: Parsing LGA census data...\n');
    const lgaData = await parseTSPFile(lgaTSPPath);
    console.log(`✓ Parsed ${lgaData.length} LGAs from TSP file\n`);

    // Parse State TSP file
    const stateTSPPath = '/Users/ben/Desktop/2021_TSP_all_for_AUS_short-header/2021 Census TSP All Geographies for AUS/STE/AUS/2021Census_T01_AUST_STE.csv';
    console.log('Step 2: Parsing State census data...\n');
    const stateData = await parseStateTSPFile(stateTSPPath);
    console.log(`✓ Parsed ${stateData.length} States/Territories from TSP file\n`);

    console.log('Step 3: Updating States/Territories with census data...\n');

    let stateCount = 0;
    for (const state of stateData) {
      // Calculate growth rates
      const growth_2011_2016 = calculateGrowthRate(state.pop2011, state.pop2016, 5);
      const growth_2016_2021 = calculateGrowthRate(state.pop2016, state.pop2021, 5);

      // Project to 2026 using 2016-2021 growth rate (5 more years)
      const pop2026 = projectPopulation(state.pop2021, growth_2016_2021, 5);

      // Calculate 2021-2026 growth rate
      const growth_2021_2026 = calculateGrowthRate(state.pop2021, pop2026, 5);

      // Calculate overall average growth rate 2011-2026
      const growth_avg = calculateGrowthRate(state.pop2011, pop2026, 15);

      const result = await client.query(`
        UPDATE housing_dashboard.card_details
        SET
          population_2011 = $1,
          population_2016 = $2,
          population_2021 = $3,
          population_2024 = $4,
          growth_rate_2011_2016 = $5,
          growth_rate_2016_2021 = $6,
          growth_rate_2021_2024 = $7,
          growth_rate_annual_avg = $8,
          data_source = 'ABS Census 2011, 2016, 2021 (TSP); 2026 projected',
          last_updated = CURRENT_TIMESTAMP
        WHERE level = 'state'
        AND state_code = $9
      `, [
        state.pop2011,
        state.pop2016,
        state.pop2021,
        pop2026,
        growth_2011_2016,
        growth_2016_2021,
        growth_2021_2026,
        growth_avg,
        state.stateCode
      ]);

      if (result.rowCount > 0) {
        stateCount++;
        console.log(`✓ State ${state.stateCode}: ${state.pop2011.toLocaleString()} (2011) → ${pop2026.toLocaleString()} (2026 proj)`);
      }
    }

    console.log(`\n✓ Updated ${stateCount} states/territories\n`);

    console.log('Step 4: Updating LGAs with census data...\n');
    console.log('This will take a few moments...\n');

    let lgaCount = 0;
    let lgaSkipped = 0;

    for (const lga of lgaData) {
      // Calculate growth rates
      const growth_2011_2016 = calculateGrowthRate(lga.pop2011, lga.pop2016, 5);
      const growth_2016_2021 = calculateGrowthRate(lga.pop2016, lga.pop2021, 5);

      // Project to 2026 using 2016-2021 growth rate (5 more years)
      const pop2026 = projectPopulation(lga.pop2021, growth_2016_2021, 5);

      // Calculate 2021-2026 growth rate
      const growth_2021_2026 = calculateGrowthRate(lga.pop2021, pop2026, 5);

      // Calculate overall average growth rate 2011-2026
      const growth_avg = calculateGrowthRate(lga.pop2011, pop2026, 15);

      // Remove 'LGA' prefix from code if present (e.g., LGA10050 -> 10050)
      const lgaCodeClean = lga.lgaCode.replace(/^LGA/, '');

      const result = await client.query(`
        UPDATE housing_dashboard.card_details
        SET
          population_2011 = $1,
          population_2016 = $2,
          population_2021 = $3,
          population_2024 = $4,
          growth_rate_2011_2016 = $5,
          growth_rate_2016_2021 = $6,
          growth_rate_2021_2024 = $7,
          growth_rate_annual_avg = $8,
          data_source = 'ABS Census 2011, 2016, 2021 (TSP); 2026 projected',
          last_updated = CURRENT_TIMESTAMP
        WHERE level = 'lga'
        AND lga_code = $9
      `, [
        lga.pop2011,
        lga.pop2016,
        lga.pop2021,
        pop2026,
        growth_2011_2016,
        growth_2016_2021,
        growth_2021_2026,
        growth_avg,
        lgaCodeClean
      ]);

      if (result.rowCount > 0) {
        lgaCount++;
        if (lgaCount % 50 === 0) {
          console.log(`  Progress: ${lgaCount} LGAs updated...`);
        }
      } else {
        lgaSkipped++;
      }
    }

    console.log(`\n✓ Updated ${lgaCount} LGAs`);
    if (lgaSkipped > 0) {
      console.log(`⚠️  Skipped ${lgaSkipped} LGAs (not found in card_details table)`);
    }

    console.log('\nStep 5: Aggregating regional populations...\n');

    // Update region populations by summing LGA populations
    const regionResult = await client.query(`
      UPDATE housing_dashboard.card_details r
      SET
        population_2011 = subquery.pop_2011,
        population_2016 = subquery.pop_2016,
        population_2021 = subquery.pop_2021,
        population_2024 = subquery.pop_2024,
        data_source = 'Aggregated from LGAs (ABS Census)',
        last_updated = CURRENT_TIMESTAMP
      FROM (
        SELECT
          region_code,
          SUM(population_2011) as pop_2011,
          SUM(population_2016) as pop_2016,
          SUM(population_2021) as pop_2021,
          SUM(population_2024) as pop_2024
        FROM housing_dashboard.card_details
        WHERE level = 'lga'
        AND population_2021 IS NOT NULL
        GROUP BY region_code
      ) subquery
      WHERE r.level = 'region'
      AND r.region_code = subquery.region_code
    `);

    console.log(`✓ Updated ${regionResult.rowCount} regions\n`);

    // Calculate region growth rates
    await client.query(`
      UPDATE housing_dashboard.card_details
      SET
        growth_rate_2011_2016 = ROUND(
          ((POWER(CAST(population_2016 AS NUMERIC) / NULLIF(population_2011, 0), 1.0/5) - 1) * 100)::numeric,
          2
        ),
        growth_rate_2016_2021 = ROUND(
          ((POWER(CAST(population_2021 AS NUMERIC) / NULLIF(population_2016, 0), 1.0/5) - 1) * 100)::numeric,
          2
        ),
        growth_rate_2021_2024 = ROUND(
          ((POWER(CAST(population_2024 AS NUMERIC) / NULLIF(population_2021, 0), 1.0/5) - 1) * 100)::numeric,
          2
        ),
        growth_rate_annual_avg = ROUND(
          ((POWER(CAST(population_2024 AS NUMERIC) / NULLIF(population_2011, 0), 1.0/15) - 1) * 100)::numeric,
          2
        )
      WHERE level = 'region'
      AND population_2011 IS NOT NULL
      AND population_2024 IS NOT NULL
    `);

    console.log('✓ Regional growth rates calculated\n');

    console.log('Step 6: Calculating Australia total...\n');

    // Calculate Australia total from states
    const ausResult = await client.query(`
      SELECT
        SUM(population_2011) as pop_2011,
        SUM(population_2016) as pop_2016,
        SUM(population_2021) as pop_2021,
        SUM(population_2024) as pop_2026
      FROM housing_dashboard.card_details
      WHERE level = 'state'
      AND population_2021 IS NOT NULL
    `);

    if (ausResult.rows.length > 0) {
      const ausData = ausResult.rows[0];
      const aus_growth_2011_2016 = calculateGrowthRate(ausData.pop_2011, ausData.pop_2016, 5);
      const aus_growth_2016_2021 = calculateGrowthRate(ausData.pop_2016, ausData.pop_2021, 5);
      const aus_growth_2021_2026 = calculateGrowthRate(ausData.pop_2021, ausData.pop_2026, 5);
      const aus_growth_avg = calculateGrowthRate(ausData.pop_2011, ausData.pop_2026, 15);

      await client.query(`
        INSERT INTO housing_dashboard.card_details (
          level,
          state_code,
          state_name,
          population_2011,
          population_2016,
          population_2021,
          population_2024,
          growth_rate_2011_2016,
          growth_rate_2016_2021,
          growth_rate_2021_2024,
          growth_rate_annual_avg,
          data_source,
          last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
        ON CONFLICT ON CONSTRAINT unique_geographic_entity
        DO UPDATE SET
          population_2011 = EXCLUDED.population_2011,
          population_2016 = EXCLUDED.population_2016,
          population_2021 = EXCLUDED.population_2021,
          population_2024 = EXCLUDED.population_2024,
          growth_rate_2011_2016 = EXCLUDED.growth_rate_2011_2016,
          growth_rate_2016_2021 = EXCLUDED.growth_rate_2016_2021,
          growth_rate_2021_2024 = EXCLUDED.growth_rate_2021_2024,
          growth_rate_annual_avg = EXCLUDED.growth_rate_annual_avg,
          last_updated = CURRENT_TIMESTAMP
      `, [
        'country',
        'AUS',
        'Australia',
        ausData.pop_2011,
        ausData.pop_2016,
        ausData.pop_2021,
        ausData.pop_2026,
        aus_growth_2011_2016,
        aus_growth_2016_2021,
        aus_growth_2021_2026,
        aus_growth_avg,
        'ABS Census aggregated from states; 2026 projected'
      ]);

      console.log(`✓ Australia Total: ${parseInt(ausData.pop_2011).toLocaleString()} (2011) → ${parseInt(ausData.pop_2026).toLocaleString()} (2026 proj)`);
      console.log(`  Average growth: ${aus_growth_avg}% p.a.\n`);
    }

    await client.query('COMMIT');

    console.log('===== SUMMARY =====\n');

    const summaryResult = await client.query(`
      SELECT
        level,
        COUNT(*) as count,
        SUM(population_2024) as total_pop_2026,
        AVG(growth_rate_annual_avg) as avg_growth
      FROM housing_dashboard.card_details
      WHERE population_2024 IS NOT NULL
      GROUP BY level
      ORDER BY
        CASE level
          WHEN 'country' THEN 1
          WHEN 'state' THEN 2
          WHEN 'region' THEN 3
          WHEN 'lga' THEN 4
        END
    `);

    summaryResult.rows.forEach(row => {
      console.log(`${row.level.toUpperCase().padEnd(10)}: ${row.count.toString().padStart(3)} records, ` +
        `Total Pop 2026: ${parseInt(row.total_pop_2026).toLocaleString().padStart(12)}, ` +
        `Avg Growth: ${parseFloat(row.avg_growth).toFixed(2)}% p.a.`);
    });

    console.log('\n✅ Census data population completed successfully!');
    console.log('\n📊 Data Quality:');
    console.log('   - 2011, 2016, 2021: 100% real ABS Census data');
    console.log('   - 2026: Projected using 2016-2021 growth rates');
    console.log('   - Growth rates: Calculated using CAGR formula');
    console.log('   - Regional totals: Aggregated from LGA data');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

populateCensusData();
