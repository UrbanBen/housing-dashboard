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

async function testAggregationQuery() {
  try {
    console.log('\n=== Testing Daily Aggregation Query for Sydney (Last 30 Days) ===');

    const result = await pool.query(`
      WITH daily_stats AS (
        SELECT
          COALESCE(lga_code, 'UNKNOWN') as lga_code,
          MAX(lga_name) as lga_name,
          DATE(determined_date) as period_start,
          DATE(determined_date) as period_end,
          EXTRACT(YEAR FROM determined_date) as calendar_year,
          EXTRACT(MONTH FROM determined_date) as calendar_month,
          EXTRACT(WEEK FROM determined_date) as calendar_week,
          COUNT(*) as total_determined,
          COUNT(*) FILTER (WHERE LOWER(status) = 'determined' OR LOWER(status) LIKE '%approved%' OR LOWER(status) LIKE '%consent%issued%') as determined_approved,
          COUNT(*) FILTER (WHERE LOWER(status) LIKE '%refuse%' OR LOWER(status) LIKE '%reject%') as determined_refused
        FROM housing_dashboard.da_records_raw
        WHERE determined_date IS NOT NULL
          AND determined_date >= CURRENT_DATE - INTERVAL '30 days'
          AND lga_name ILIKE '%City of Sydney%'
        GROUP BY lga_code, DATE(determined_date)
      )
      SELECT *
      FROM daily_stats
      ORDER BY period_start DESC;
    `);

    console.log('Sydney daily aggregation result:', result.rows);
    console.log('Total rows:', result.rows.length);

    console.log('\n=== Testing Daily Aggregation Query for Woollahra (Last 30 Days) ===');

    const woollahraResult = await pool.query(`
      WITH daily_stats AS (
        SELECT
          COALESCE(lga_code, 'UNKNOWN') as lga_code,
          MAX(lga_name) as lga_name,
          DATE(determined_date) as period_start,
          DATE(determined_date) as period_end,
          COUNT(*) as total_determined
        FROM housing_dashboard.da_records_raw
        WHERE determined_date IS NOT NULL
          AND determined_date >= CURRENT_DATE - INTERVAL '30 days'
          AND lga_name ILIKE '%Woollahra%'
        GROUP BY lga_code, DATE(determined_date)
      )
      SELECT *
      FROM daily_stats
      ORDER BY period_start DESC;
    `);

    console.log('Woollahra daily aggregation result:', woollahraResult.rows);
    console.log('Total rows:', woollahraResult.rows.length);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAggregationQuery();
