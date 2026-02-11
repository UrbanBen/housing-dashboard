const { Pool } = require('pg');
const fs = require('fs');

function readPasswordFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Z_]*PASSWORD)\s*=\s*(.*)$/);
    if (match) {
      return match[2].replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

async function main() {
  const password = readPasswordFromFile('/users/ben/permissions/.env.admin');
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Altering lga_code column to VARCHAR(20)...');
    await pool.query(`
      ALTER TABLE housing_dashboard.oc_aggregated
      ALTER COLUMN lga_code TYPE VARCHAR(20)
    `);
    console.log('✓ Column altered successfully');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
