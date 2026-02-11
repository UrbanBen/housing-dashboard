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
    console.log('\nChecking lga_code lengths and types...\n');
    
    const result = await pool.query(`
      SELECT 
        lga_code,
        lga_code::TEXT as lga_code_text,
        LENGTH(lga_code::TEXT) as code_length,
        lga_name,
        COUNT(*) as record_count
      FROM public.nsw_oc_data
      WHERE lga_code IS NOT NULL
      GROUP BY lga_code, lga_name
      HAVING LENGTH(lga_code::TEXT) > 10
      ORDER BY LENGTH(lga_code::TEXT) DESC
      LIMIT 10
    `);

    console.log('LGA codes longer than 10 characters:');
    result.rows.forEach(row => {
      console.log(`  ${row.lga_name}: "${row.lga_code_text}" (length: ${row.code_length}, count: ${row.record_count})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
