#!/usr/bin/env node

/**
 * SQL Migration Runner
 * Executes SQL files against the database
 *
 * Usage: node scripts/run-sql-migration.js <path-to-sql-file>
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read database password
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

// Create database connection
function createDbPool() {
  const password = readPasswordFromFile('/users/ben/permissions/.env.admin');

  if (!password) {
    throw new Error('Failed to read admin database password');
  }

  return new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: password,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Main execution
async function main() {
  const sqlFilePath = process.argv[2];

  if (!sqlFilePath) {
    console.error('Usage: node scripts/run-sql-migration.js <path-to-sql-file>');
    process.exit(1);
  }

  const resolvedPath = path.resolve(sqlFilePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`SQL file not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`[SQL Migration] Running: ${path.basename(resolvedPath)}`);
  console.log(`${'='.repeat(70)}\n`);

  const pool = createDbPool();

  try {
    const sqlContent = fs.readFileSync(resolvedPath, 'utf8');

    console.log(`[DB] Connecting to research&insights database...`);
    const client = await pool.connect();

    console.log(`[DB] Executing SQL migration...`);
    const result = await client.query(sqlContent);

    client.release();

    console.log(`[DB] ✅ Migration completed successfully`);

    if (result.command) {
      console.log(`[DB] Last command: ${result.command}`);
    }
    if (result.rowCount !== null && result.rowCount !== undefined) {
      console.log(`[DB] Rows affected: ${result.rowCount}`);
    }

  } catch (error) {
    console.error(`\n[DB] ❌ Migration failed:`);
    console.error(`[DB] Error: ${error.message}`);

    if (error.position) {
      const lines = error.message.split('\n');
      lines.forEach(line => console.error(`[DB] ${line}`));
    }

    process.exit(1);
  } finally {
    await pool.end();
    console.log(`\n[DB] Database connection closed\n`);
  }
}

// Run
main().catch((error) => {
  console.error('[Fatal]', error);
  process.exit(1);
});
