const { Pool } = require('pg');
const fs = require('fs');

function readPasswordFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Z_]*PASSWORD)\s*=\s*(.*)$/);
      if (match) {
        let value = match[2];
        value = value.replace(/^["']|["']$/g, '');
        return value;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

const password = readPasswordFromFile('/users/ben/permissions/.env.readonly');
const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'mosaic_readonly',
  password: password,
  ssl: { rejectUnauthorized: false },
});

async function testData() {

  try {
    // Test 1: Check period types for Woollahra
    console.log('\n=== Test 1: Period types for Woollahra ===');
    const woollahra = await pool.query(`
      SELECT
        period_type,
        lga_name,
        COUNT(*) as record_count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Woollahra%'
      GROUP BY period_type, lga_name
      ORDER BY period_type, lga_name;
    `);
    console.log('Woollahra data:', woollahra.rows);

    // Test 2: Check all period type distribution
    console.log('\n=== Test 2: Period type distribution ===');
    const distribution = await pool.query(`
      SELECT
        period_type,
        COUNT(DISTINCT lga_name) as unique_lgas,
        COUNT(*) as total_records
      FROM housing_dashboard.da_aggregated
      GROUP BY period_type
      ORDER BY period_type;
    `);
    console.log('Distribution:', distribution.rows);

    // Test 3: Check Sydney data
    console.log('\n=== Test 3: Sydney data ===');
    const sydney = await pool.query(`
      SELECT
        period_type,
        lga_name,
        COUNT(*) as record_count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Sydney%'
      GROUP BY period_type, lga_name
      ORDER BY period_type, lga_name
      LIMIT 20;
    `);
    console.log('Sydney data:', sydney.rows);

    // Test 4: Sample data from each period type for Woollahra
    console.log('\n=== Test 4: Sample daily data for Woollahra ===');
    const dailySample = await pool.query(`
      SELECT period_type, lga_name, period_start, total_determined
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Woollahra%' AND period_type = 'daily'
      ORDER BY period_start DESC
      LIMIT 5;
    `);
    console.log('Daily sample:', dailySample.rows);

    console.log('\n=== Test 5: Sample weekly data for Woollahra ===');
    const weeklySample = await pool.query(`
      SELECT period_type, lga_name, period_start, total_determined
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Woollahra%' AND period_type = 'weekly'
      ORDER BY period_start DESC
      LIMIT 5;
    `);
    console.log('Weekly sample:', weeklySample.rows);

    console.log('\n=== Test 6: Sample monthly data for Woollahra ===');
    const monthlySample = await pool.query(`
      SELECT period_type, lga_name, period_start, total_determined
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Woollahra%' AND period_type = 'monthly'
      ORDER BY period_start DESC
      LIMIT 5;
    `);
    console.log('Monthly sample:', monthlySample.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testData();
