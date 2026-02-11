#!/usr/bin/env node

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

const password = readPasswordFromFile('/users/ben/permissions/.env.admin');
if (!password) {
  console.error('Failed to read database password');
  process.exit(1);
}

const pool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: password,
  ssl: { rejectUnauthorized: false },
});

async function clearTable() {
  const client = await pool.connect();

  try {
    console.log('[Clear Table] Counting existing records...');
    const countResult = await client.query('SELECT COUNT(*) FROM housing_dashboard.da_aggregated');
    console.log(`[Clear Table] Found ${countResult.rows[0].count} existing records\n`);

    console.log('[Clear Table] Deleting all records...');
    const deleteResult = await client.query('DELETE FROM housing_dashboard.da_aggregated');
    console.log(`[Clear Table] ✓ Deleted ${deleteResult.rowCount} records\n`);

    console.log('[Clear Table] Complete!');
    console.log('[Clear Table] Now run: node scripts/aggregate-da-comprehensive.js');

  } catch (error) {
    console.error('[Clear Table] Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearTable();
