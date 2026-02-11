const { Pool } = require('pg');
const fs = require('fs');

function readPasswordFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
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

async function testDateRanges() {
  try {
    // Test 1: Date range for each period type (all LGAs)
    console.log('\n=== Date Ranges by Period Type (All LGAs) ===');
    const ranges = await pool.query(`
      SELECT
        period_type,
        MIN(period_start) as earliest,
        MAX(period_start) as latest,
        COUNT(*) as total_records
      FROM housing_dashboard.da_aggregated
      GROUP BY period_type
      ORDER BY period_type;
    `);
    console.log('Date Ranges:', ranges.rows);

    // Test 2: Records within query windows
    console.log('\n=== Records Within Query Windows (Woollahra) ===');

    const daily = await pool.query(`
      SELECT COUNT(*) as count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Woollahra%'
        AND period_type = 'daily'
        AND period_start >= CURRENT_DATE - INTERVAL '30 days';
    `);
    console.log('Daily (last 30 days):', daily.rows[0]);

    const weekly = await pool.query(`
      SELECT COUNT(*) as count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Woollahra%'
        AND period_type = 'weekly'
        AND period_start >= CURRENT_DATE - INTERVAL '12 weeks';
    `);
    console.log('Weekly (last 12 weeks):', weekly.rows[0]);

    const monthly = await pool.query(`
      SELECT COUNT(*) as count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Woollahra%'
        AND period_type = 'monthly'
        AND period_start >= CURRENT_DATE - INTERVAL '12 months';
    `);
    console.log('Monthly (last 12 months):', monthly.rows[0]);

    // Test 3: Same for Sydney
    console.log('\n=== Records Within Query Windows (Sydney) ===');

    const sydneyDaily = await pool.query(`
      SELECT COUNT(*) as count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%City of Sydney%'
        AND period_type = 'daily'
        AND period_start >= CURRENT_DATE - INTERVAL '30 days';
    `);
    console.log('Daily (last 30 days):', sydneyDaily.rows[0]);

    const sydneyWeekly = await pool.query(`
      SELECT COUNT(*) as count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%City of Sydney%'
        AND period_type = 'weekly'
        AND period_start >= CURRENT_DATE - INTERVAL '12 weeks';
    `);
    console.log('Weekly (last 12 weeks):', sydneyWeekly.rows[0]);

    const sydneyMonthly = await pool.query(`
      SELECT COUNT(*) as count
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%City of Sydney%'
        AND period_type = 'monthly'
        AND period_start >= CURRENT_DATE - INTERVAL '12 months';
    `);
    console.log('Monthly (last 12 months):', sydneyMonthly.rows[0]);

    // Test 4: All LGAs with recent monthly data
    console.log('\n=== LGAs with Monthly Data in Last 12 Months ===');
    const recentMonthly = await pool.query(`
      SELECT DISTINCT lga_name
      FROM housing_dashboard.da_aggregated
      WHERE period_type = 'monthly'
        AND period_start >= CURRENT_DATE - INTERVAL '12 months'
      ORDER BY lga_name;
    `);
    console.log('LGAs with recent monthly data:', recentMonthly.rows.length);
    console.log('First 10:', recentMonthly.rows.slice(0, 10).map(r => r.lga_name));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDateRanges();
