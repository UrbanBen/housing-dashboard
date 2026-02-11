const { Pool } = require('pg');
const fs = require('fs');

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

// Initialize database connection
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

async function main() {
  const pool = createDbPool();

  try {
    console.log('[DB] Database connection established\n');

    // Check determination_type
    console.log('Querying determination_type values...\n');
    const typeQuery = `
      SELECT
        determination_type,
        COUNT(*) as count
      FROM housing_dashboard.da_records_raw
      WHERE determination_type IS NOT NULL
      GROUP BY determination_type
      ORDER BY count DESC
      LIMIT 30
    `;
    const typeResult = await pool.query(typeQuery);
    console.log('Top determination_type values:');
    console.log('=====================================');
    typeResult.rows.forEach(row => {
      console.log(`${row.determination_type.padEnd(50)} | ${row.count.toLocaleString()}`);
    });

    // Check status field
    console.log('\n\nQuerying status values...\n');
    const statusQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM housing_dashboard.da_records_raw
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
      LIMIT 30
    `;
    const statusResult = await pool.query(statusQuery);
    console.log('Top status values:');
    console.log('=====================================');
    statusResult.rows.forEach(row => {
      console.log(`${row.status.padEnd(50)} | ${row.count.toLocaleString()}`);
    });

    // Check a sample raw_json for "Determined" records
    console.log('\n\nSample raw_json for "Determined" status (first 5 records):\n');
    const sampleQuery = `
      SELECT application_number, status, raw_json
      FROM housing_dashboard.da_records_raw
      WHERE status = 'Determined'
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    sampleResult.rows.forEach((row, idx) => {
      console.log(`\n--- Record ${idx + 1}: ${row.application_number} ---`);
      const json = row.raw_json;
      console.log('Fields containing approval/decision keywords:');
      Object.keys(json).sort().forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('approv') || lowerKey.includes('refus') || lowerKey.includes('consent') ||
            lowerKey.includes('decision') || lowerKey.includes('outcome') || lowerKey.includes('determin')) {
          const value = json[key];
          const preview = typeof value === 'object' ? JSON.stringify(value).substring(0, 150) : String(value);
          console.log(`  ${key}: ${preview}`);
        }
      });
    });

    // Check if there's a DeterminationOutcome or similar field anywhere
    console.log('\n\nSearching for fields with approval/refusal data in first 100 records...\n');
    const searchQuery = `
      SELECT application_number, status, raw_json
      FROM housing_dashboard.da_records_raw
      WHERE status = 'Determined'
      LIMIT 100
    `;
    const searchResult = await pool.query(searchQuery);
    const fieldStats = {};
    searchResult.rows.forEach(row => {
      const json = row.raw_json;
      Object.keys(json).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('approv') || lowerKey.includes('refus') || lowerKey.includes('consent') ||
            lowerKey.includes('decision') || lowerKey.includes('outcome')) {
          if (!fieldStats[key]) {
            fieldStats[key] = { count: 0, sampleValues: new Set() };
          }
          fieldStats[key].count++;
          if (fieldStats[key].sampleValues.size < 5) {
            const value = typeof json[key] === 'object' ? JSON.stringify(json[key]) : String(json[key]);
            fieldStats[key].sampleValues.add(value.substring(0, 100));
          }
        }
      });
    });

    console.log('Fields found across 100 records:');
    Object.keys(fieldStats).sort().forEach(key => {
      console.log(`\n  ${key} (appears in ${fieldStats[key].count} records):`);
      Array.from(fieldStats[key].sampleValues).forEach(val => {
        console.log(`    - ${val}`);
      });
    });

    console.log('\n');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
