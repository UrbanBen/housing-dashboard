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

    // Test query for Woollahra using code
    console.log('Test 1: Query Woollahra by lga_name\n');
    const query1 = `
      SELECT
        lga_code,
        lga_name,
        period_start as date,
        total_determined,
        determined_approved,
        determined_refused
      FROM housing_dashboard.da_aggregated
      WHERE period_type = 'daily'
        AND period_start >= CURRENT_DATE - INTERVAL '30 days'
        AND lga_name = $1
      ORDER BY period_start DESC
      LIMIT 5
    `;
    const result1 = await pool.query(query1, ['Woollahra Municipal Council']);
    console.log('Results:', result1.rows.length, 'rows');
    if (result1.rows.length > 0) {
      console.log('Sample row:', result1.rows[0]);
    }

    // Check what LGA names are in the table
    console.log('\n\nTest 2: Check available LGAs in daily aggregated data\n');
    const query2 = `
      SELECT DISTINCT lga_code, lga_name, COUNT(*) as record_count
      FROM housing_dashboard.da_aggregated
      WHERE period_type = 'daily'
        AND period_start >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY lga_code, lga_name
      ORDER BY record_count DESC
      LIMIT 10
    `;
    const result2 = await pool.query(query2);
    console.log('Top 10 LGAs with recent daily data:');
    result2.rows.forEach(row => {
      console.log(`  ${row.lga_name} (${row.lga_code || 'no code'}): ${row.record_count} records`);
    });

    // Check raw DA records
    console.log('\n\nTest 3: Check raw DA records\n');
    const query3 = `
      SELECT DISTINCT lga_code, lga_name
      FROM housing_dashboard.da_records_raw
      WHERE determined_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY lga_name
      LIMIT 10
    `;
    const result3 = await pool.query(query3);
    console.log('Sample LGAs from raw records:');
    result3.rows.forEach(row => {
      console.log(`  ${row.lga_name} (${row.lga_code || 'no code'})`);
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
