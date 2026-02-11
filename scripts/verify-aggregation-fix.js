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
    console.log('Verifying aggregation fix - Woollahra Municipal Council:\n');

    const query = `
      SELECT
        period_type,
        COUNT(*) as period_count,
        SUM(total_determined) as total_das,
        SUM(determined_approved) as total_approved,
        SUM(determined_refused) as total_refused,
        SUM(determined_withdrawn) as total_withdrawn,
        MAX(period_start) as latest_period
      FROM housing_dashboard.da_aggregated
      WHERE lga_name = 'Woollahra Municipal Council'
      GROUP BY period_type
      ORDER BY period_type
    `;

    const result = await pool.query(query);

    console.log('Period Type  | Periods | Total DAs | Approved | Refused | Withdrawn | Latest Period');
    console.log('=' .repeat(95));
    result.rows.forEach(row => {
      console.log(
        `${row.period_type.padEnd(12)} | ` +
        `${row.period_count.toString().padEnd(7)} | ` +
        `${row.total_das.toLocaleString().padEnd(9)} | ` +
        `${row.total_approved.toLocaleString().padEnd(8)} | ` +
        `${row.total_refused.toString().padEnd(7)} | ` +
        `${row.total_withdrawn.toString().padEnd(9)} | ` +
        `${row.latest_period}`
      );
    });

    // Also check a sample daily record
    console.log('\n\nSample daily records (last 5 days):');
    console.log('=' .repeat(95));
    const sampleQuery = `
      SELECT
        period_start,
        total_determined,
        determined_approved,
        determined_refused,
        determined_withdrawn
      FROM housing_dashboard.da_aggregated
      WHERE lga_name = 'Woollahra Municipal Council' AND period_type = 'daily'
      ORDER BY period_start DESC
      LIMIT 5
    `;

    const sampleResult = await pool.query(sampleQuery);
    console.log('Date       | Total | Approved | Refused | Withdrawn');
    console.log('-' .repeat(50));
    sampleResult.rows.forEach(row => {
      console.log(
        `${row.period_start} | ` +
        `${row.total_determined.toString().padEnd(5)} | ` +
        `${row.determined_approved.toString().padEnd(8)} | ` +
        `${row.determined_refused.toString().padEnd(7)} | ` +
        `${row.determined_withdrawn.toString()}`
      );
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
