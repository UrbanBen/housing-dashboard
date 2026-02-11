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
  const password = readPasswordFromFile('/users/ben/permissions/.env.readonly');
  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'mosaic_pro',
    user: 'mosaic_readonly',
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(`
      SELECT application_status, COUNT(*) as count
      FROM public.nsw_oc_data
      WHERE application_status IS NOT NULL
      GROUP BY application_status
      ORDER BY count DESC
      LIMIT 20
    `);

    console.log('\nTop 20 Application Statuses:\n');
    result.rows.forEach(row => {
      console.log(`  ${row.application_status}: ${row.count}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
