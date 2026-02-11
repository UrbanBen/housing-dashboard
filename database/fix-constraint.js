#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');

function readPasswordFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Password file not found: ${filePath}`);
      return null;
    }
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
    console.error(`No password found in file: ${filePath}`);
    return null;
  } catch (error) {
    console.error(`Error reading password file ${filePath}:`, error);
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

async function fixConstraint() {
  const client = await pool.connect();

  try {
    console.log('[Migration] Starting constraint fix...\n');

    // Step 1: Drop existing constraint
    console.log('[Step 1/4] Dropping old constraint...');
    await client.query(`
      ALTER TABLE housing_dashboard.da_aggregated
      DROP CONSTRAINT IF EXISTS unique_lga_period;
    `);
    console.log('[Step 1/4] ✓ Old constraint dropped\n');

    // Step 2: Add new constraint using lga_name
    console.log('[Step 2/4] Adding new constraint with lga_name...');
    await client.query(`
      ALTER TABLE housing_dashboard.da_aggregated
      ADD CONSTRAINT unique_lga_period UNIQUE(lga_name, period_type, period_start);
    `);
    console.log('[Step 2/4] ✓ New constraint added\n');

    // Step 3: Drop old index
    console.log('[Step 3/4] Dropping old index...');
    await client.query(`
      DROP INDEX IF EXISTS housing_dashboard.idx_da_agg_lga_period;
    `);
    console.log('[Step 3/4] ✓ Old index dropped\n');

    // Step 4: Create new index
    console.log('[Step 4/4] Creating new index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_da_agg_lga_name_period
      ON housing_dashboard.da_aggregated(lga_name, period_type, period_start);
    `);
    console.log('[Step 4/4] ✓ New index created\n');

    console.log('[Migration] Constraint fix completed successfully!');
    console.log('[Migration] Now you need to:');
    console.log('  1. Update aggregate-da-comprehensive.js to use lga_name in ON CONFLICT');
    console.log('  2. Clear the da_aggregated table');
    console.log('  3. Re-run the aggregation script');

  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixConstraint();
