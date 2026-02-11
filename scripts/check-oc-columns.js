#!/usr/bin/env node

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
      let value = match[2];
      return value.replace(/^["']|["']$/g, '');
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
    // Get column names
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'nsw_oc_data'
      ORDER BY ordinal_position
    `);

    console.log('\nColumns in mosaic_pro.public.nsw_oc_data:\n');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });

    // Get sample data
    console.log('\n\nSample data (first row):');
    const sample = await pool.query('SELECT * FROM public.nsw_oc_data LIMIT 1');
    if (sample.rows.length > 0) {
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
