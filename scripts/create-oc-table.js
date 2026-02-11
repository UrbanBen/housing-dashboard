#!/usr/bin/env node

/**
 * Create OC Aggregated Table
 *
 * Creates housing_dashboard.oc_aggregated table in research&insights database
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function main() {
  console.log('\n=== Creating OC Aggregated Table ===\n');

  const password = readPasswordFromFile('/users/ben/permissions/.env.admin');

  if (!password) {
    throw new Error('Failed to read admin database password');
  }

  const pool = new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'create-oc-aggregated-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL migration...');
    await pool.query(sql);

    console.log('✓ Table created successfully!');
    console.log('✓ Indexes created');
    console.log('✓ Permissions granted\n');

  } catch (error) {
    console.error('Error creating table:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
