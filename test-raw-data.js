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

async function testRawData() {
  try {
    console.log('\n=== Raw Records Date Range ===');
    const dateRange = await pool.query(`
      SELECT
        MIN(determined_date) as earliest,
        MAX(determined_date) as latest,
        COUNT(*) as total_records
      FROM housing_dashboard.da_records_raw;
    `);
    console.log('Date range:', dateRange.rows[0]);

    console.log('\n=== Records by Year (Last 5 Years) ===');
    const byYear = await pool.query(`
      SELECT
        EXTRACT(YEAR FROM determined_date) as year,
        COUNT(*) as count
      FROM housing_dashboard.da_records_raw
      WHERE determined_date >= CURRENT_DATE - INTERVAL '5 years'
      GROUP BY EXTRACT(YEAR FROM determined_date)
      ORDER BY year DESC;
    `);
    console.log('By year:', byYear.rows);

    console.log('\n=== Woollahra Raw Records (Last 30 Days) ===');
    const woollahraRecent = await pool.query(`
      SELECT
        determined_date::date as date,
        COUNT(*) as count
      FROM housing_dashboard.da_records_raw
      WHERE lga_name ILIKE '%Woollahra%'
        AND determined_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY determined_date::date
      ORDER BY date DESC
      LIMIT 10;
    `);
    console.log('Woollahra recent:', woollahraRecent.rows);

    console.log('\n=== Sydney Raw Records (Last 30 Days) ===');
    const sydneyRecent = await pool.query(`
      SELECT
        determined_date::date as date,
        COUNT(*) as count
      FROM housing_dashboard.da_records_raw
      WHERE lga_name ILIKE '%City of Sydney%'
        AND determined_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY determined_date::date
      ORDER BY date DESC
      LIMIT 10;
    `);
    console.log('Sydney recent:', sydneyRecent.rows);

    console.log('\n=== LGAs with Data in Last 30 Days ===');
    const lgasRecent = await pool.query(`
      SELECT
        lga_name,
        COUNT(*) as record_count
      FROM housing_dashboard.da_records_raw
      WHERE determined_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY lga_name
      ORDER BY record_count DESC
      LIMIT 20;
    `);
    console.log('LGAs with recent data:', lgasRecent.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testRawData();
