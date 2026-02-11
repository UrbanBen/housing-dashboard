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

async function testLGANames() {
  try {
    console.log('\n=== Unique LGA Names with "Sydney" in Raw Table (Recent) ===');
    const rawNames = await pool.query(`
      SELECT DISTINCT lga_name
      FROM housing_dashboard.da_records_raw
      WHERE lga_name ILIKE '%Sydney%'
        AND determined_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY lga_name;
    `);
    console.log('Raw LGA names:', rawNames.rows.map(r => r.lga_name));

    console.log('\n=== Unique LGA Names with "Sydney" in Aggregated Table ===');
    const aggNames = await pool.query(`
      SELECT DISTINCT lga_name
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE '%Sydney%'
      ORDER BY lga_name;
    `);
    console.log('Aggregated LGA names:', aggNames.rows.map(r => r.lga_name));

    console.log('\n=== Check if recent raw records have determined_date ===');
    const recentRaw = await pool.query(`
      SELECT
        lga_name,
        determined_date,
        status,
        determination_type
      FROM housing_dashboard.da_records_raw
      WHERE lga_name ILIKE '%City of Sydney%'
        AND determined_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY determined_date DESC
      LIMIT 10;
    `);
    console.log('Recent raw records:', recentRaw.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLGANames();
