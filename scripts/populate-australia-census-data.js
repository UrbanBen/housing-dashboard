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

// Australian States and Territories population data
// Source: ABS Census 2011, 2016, 2021 and 2024 estimates
const statesData = [
  {
    code: '1',
    name: 'New South Wales',
    abbreviation: 'NSW',
    pop_2011: 7238819,
    pop_2016: 7732612,
    pop_2021: 8166369,
    pop_2024: 8391900  // ABS estimate June 2024
  },
  {
    code: '2',
    name: 'Victoria',
    abbreviation: 'VIC',
    pop_2011: 5574500,
    pop_2016: 6039740,
    pop_2021: 6613700,
    pop_2024: 6773800
  },
  {
    code: '3',
    name: 'Queensland',
    abbreviation: 'QLD',
    pop_2011: 4516361,
    pop_2016: 4779400,
    pop_2021: 5194847,
    pop_2024: 5482100
  },
  {
    code: '4',
    name: 'South Australia',
    abbreviation: 'SA',
    pop_2011: 1656139,
    pop_2016: 1702800,
    pop_2021: 1770591,
    pop_2024: 1842400
  },
  {
    code: '5',
    name: 'Western Australia',
    abbreviation: 'WA',
    pop_2011: 2353117,
    pop_2016: 2591600,
    pop_2021: 2660026,
    pop_2024: 2903800
  },
  {
    code: '6',
    name: 'Tasmania',
    abbreviation: 'TAS',
    pop_2011: 511700,
    pop_2016: 518000,
    pop_2021: 569825,
    pop_2024: 591800
  },
  {
    code: '7',
    name: 'Northern Territory',
    abbreviation: 'NT',
    pop_2011: 230331,
    pop_2016: 244300,
    pop_2021: 246500,
    pop_2024: 251100
  },
  {
    code: '8',
    name: 'Australian Capital Territory',
    abbreviation: 'ACT',
    pop_2011: 374766,
    pop_2016: 397100,
    pop_2021: 453558,
    pop_2024: 466100
  }
];

// Calculate annual growth rate
function calculateGrowthRate(startPop, endPop, years) {
  if (!startPop || !endPop || years <= 0) return null;
  // Compound annual growth rate: ((endPop/startPop)^(1/years) - 1) * 100
  return ((Math.pow(endPop / startPop, 1 / years) - 1) * 100).toFixed(2);
}

async function populateAustraliaCensusData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Step 1: Altering table schema...\n');
    const alterSQL = fs.readFileSync('database/alter-card-details-add-census.sql', 'utf8');
    await client.query(alterSQL);
    console.log('✓ Table schema updated\n');

    console.log('Step 2: Adding/Updating Australian states and territories...\n');

    for (const state of statesData) {
      // Calculate growth rates
      const growth_2011_2016 = calculateGrowthRate(state.pop_2011, state.pop_2016, 5);
      const growth_2016_2021 = calculateGrowthRate(state.pop_2016, state.pop_2021, 5);
      const growth_2021_2024 = calculateGrowthRate(state.pop_2021, state.pop_2024, 3);
      const growth_avg = calculateGrowthRate(state.pop_2011, state.pop_2024, 13);

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
        'state',
        state.code,
        state.name,
        state.pop_2011,
        state.pop_2016,
        state.pop_2021,
        state.pop_2024,
        growth_2011_2016,
        growth_2016_2021,
        growth_2021_2024,
        growth_avg,
        'ABS Census 2011, 2016, 2021 and 2024 estimates'
      ]);

      console.log(`✓ ${state.name} (${state.abbreviation})`);
      console.log(`  2011: ${state.pop_2011.toLocaleString()} → 2024: ${state.pop_2024.toLocaleString()}`);
      console.log(`  Avg growth: ${growth_avg}% p.a.\n`);
    }

    console.log('Step 3: Calculating Australia total...\n');

    const aus_2011 = statesData.reduce((sum, s) => sum + s.pop_2011, 0);
    const aus_2016 = statesData.reduce((sum, s) => sum + s.pop_2016, 0);
    const aus_2021 = statesData.reduce((sum, s) => sum + s.pop_2021, 0);
    const aus_2024 = statesData.reduce((sum, s) => sum + s.pop_2024, 0);

    const aus_growth_2011_2016 = calculateGrowthRate(aus_2011, aus_2016, 5);
    const aus_growth_2016_2021 = calculateGrowthRate(aus_2016, aus_2021, 5);
    const aus_growth_2021_2024 = calculateGrowthRate(aus_2021, aus_2024, 3);
    const aus_growth_avg = calculateGrowthRate(aus_2011, aus_2024, 13);

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
      aus_2011,
      aus_2016,
      aus_2021,
      aus_2024,
      aus_growth_2011_2016,
      aus_growth_2016_2021,
      aus_growth_2021_2024,
      aus_growth_avg,
      'ABS Census aggregated from states/territories'
    ]);

    console.log(`✓ Australia (Total)`);
    console.log(`  2011: ${aus_2011.toLocaleString()} → 2024: ${aus_2024.toLocaleString()}`);
    console.log(`  Avg growth: ${aus_growth_avg}% p.a.\n`);

    await client.query('COMMIT');

    console.log('=== Summary ===\n');
    const summaryResult = await client.query(`
      SELECT
        level,
        COUNT(*) as count,
        SUM(population_2024) as total_pop_2024
      FROM housing_dashboard.card_details
      WHERE level IN ('country', 'state')
      GROUP BY level
      ORDER BY
        CASE level
          WHEN 'country' THEN 1
          WHEN 'state' THEN 2
        END
    `);

    summaryResult.rows.forEach(row => {
      console.log(`${row.level.toUpperCase()}: ${row.count} records, Total Pop 2024: ${row.total_pop_2024 ? parseInt(row.total_pop_2024).toLocaleString() : 'N/A'}`);
    });

    console.log('\n✅ Australia census data populated successfully!');
    console.log('\nNext steps:');
    console.log('1. Run NSW LGA population update script with census data');
    console.log('2. Regional growth rates will be calculated from LGA aggregations');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

populateAustraliaCensusData();
