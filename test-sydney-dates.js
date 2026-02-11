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

async function testSydneyDates() {
  try {
    console.log('\n=== Sydney Aggregated Daily Records (All Time) ===');
    const sydney = await pool.query(`
      SELECT
        period_start::date as date,
        total_determined
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%City of Sydney%'
        AND period_type = 'daily'
      ORDER BY period_start DESC
      LIMIT 30;
    `);
    console.log('Sydney daily records:', sydney.rows);
    console.log('Total:', sydney.rowCount);

    console.log('\n=== Current date for reference ===');
    const now = await pool.query('SELECT CURRENT_DATE');
    console.log('Today:', now.rows[0].current_date);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSydneyDates();
