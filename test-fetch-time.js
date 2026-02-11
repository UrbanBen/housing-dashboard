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

async function testFetchTime() {
  try {
    console.log('\n=== When were recent Sydney records fetched? ===');
    const fetchTime = await pool.query(`
      SELECT
        determined_date::date,
        api_fetched_at::timestamp,
        created_at::timestamp
      FROM housing_dashboard.da_records_raw
      WHERE lga_name ILIKE '%City of Sydney%'
        AND determined_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY api_fetched_at DESC
      LIMIT 10;
    `);
    console.log('Fetch times:', fetchTime.rows);

    console.log('\n=== When was the last aggregation run? ===');
    const aggTime = await pool.query(`
      SELECT MAX(aggregated_at)::timestamp as last_aggregation
      FROM housing_dashboard.da_aggregated;
    `);
    console.log('Last aggregation:', aggTime.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testFetchTime();
