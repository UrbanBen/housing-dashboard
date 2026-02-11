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
    database: 'research&insights',
    user: 'mosaic_readonly',
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const result = await pool.query(`
      SELECT period_type, COUNT(*) as count
      FROM housing_dashboard.oc_aggregated
      GROUP BY period_type
      ORDER BY period_type
    `);

    console.log('\nOC Aggregated Data Summary:\n');
    result.rows.forEach(row => {
      console.log(`  ${row.period_type}: ${row.count} records`);
    });

    const sample = await pool.query(`
      SELECT * FROM housing_dashboard.oc_aggregated 
      WHERE period_type = 'daily' 
      ORDER BY period_start DESC 
      LIMIT 3
    `);

    console.log('\n\nSample daily records:');
    sample.rows.forEach(row => {
      console.log(`  ${row.lga_name}: ${row.period_start} - ${row.total_determined} total, ${row.determined_approved} approved`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
