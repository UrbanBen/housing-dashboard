#!/usr/bin/env node

/**
 * NSW State Aggregation Script
 *
 * Aggregates all LGA data to create NSW state-level totals for:
 * - Development Applications (DA)
 * - Occupation Certificates (OC)
 * - Building Approvals (BA)
 *
 * Creates records with lga_name = 'New South Wales' and lga_code = 'NSW'
 */

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

      const match = trimmed.match(/^DB_ADMIN_PASSWORD\s*=\s*(.*)$/);
      if (match) {
        let value = match[1];
        value = value.replace(/^["']|["']$/g, '');
        return value;
      }
    }

    console.error(`DB_ADMIN_PASSWORD not found in file: ${filePath}`);
    return null;
  } catch (error) {
    console.error(`Error reading password file ${filePath}:`, error);
    return null;
  }
}

// Initialize database connection
function createDbPool() {
  const password = readPasswordFromFile('.env.local');
  if (!password) {
    throw new Error('Failed to read DB_ADMIN_PASSWORD from .env.local');
  }

  return new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    password: password,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

async function aggregateNSWData() {
  console.log('🏛️  Starting NSW State Aggregation...\n');

  const pool = createDbPool();

  try {
    // ========================================================================
    // 1. DEVELOPMENT APPLICATIONS (DA)
    // ========================================================================
    console.log('📋 Aggregating Development Applications (DA)...');

    const daResult = await pool.query(`
      -- Delete existing NSW aggregates
      DELETE FROM housing_dashboard.da_aggregated
      WHERE lga_name = 'New South Wales';

      -- Insert NSW totals by aggregating all LGAs
      INSERT INTO housing_dashboard.da_aggregated (
        lga_code,
        lga_name,
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week,
        total_determined,
        determined_approved,
        determined_refused,
        determined_withdrawn,
        record_count,
        aggregated_at
      )
      SELECT
        'NSW' as lga_code,
        'New South Wales' as lga_name,
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week,
        SUM(total_determined) as total_determined,
        SUM(determined_approved) as determined_approved,
        SUM(determined_refused) as determined_refused,
        SUM(determined_withdrawn) as determined_withdrawn,
        SUM(record_count) as record_count,
        NOW() as aggregated_at
      FROM housing_dashboard.da_aggregated
      WHERE lga_name != 'New South Wales'
      GROUP BY
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week
      ORDER BY period_start;
    `);

    console.log(`✓ DA aggregation complete: ${daResult.rowCount} periods aggregated`);

    // ========================================================================
    // 2. OCCUPATION CERTIFICATES (OC)
    // ========================================================================
    console.log('\n📜 Aggregating Occupation Certificates (OC)...');

    const ocResult = await pool.query(`
      -- Delete existing NSW aggregates
      DELETE FROM housing_dashboard.oc_aggregated
      WHERE lga_name = 'New South Wales';

      -- Insert NSW totals by aggregating all LGAs
      INSERT INTO housing_dashboard.oc_aggregated (
        lga_code,
        lga_name,
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week,
        total_determined,
        determined_approved,
        determined_withdrawn,
        record_count,
        aggregated_at
      )
      SELECT
        'NSW' as lga_code,
        'New South Wales' as lga_name,
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week,
        SUM(total_determined) as total_determined,
        SUM(determined_approved) as determined_approved,
        SUM(determined_withdrawn) as determined_withdrawn,
        SUM(record_count) as record_count,
        NOW() as aggregated_at
      FROM housing_dashboard.oc_aggregated
      WHERE lga_name != 'New South Wales'
      GROUP BY
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week
      ORDER BY period_start;
    `);

    console.log(`✓ OC aggregation complete: ${ocResult.rowCount} periods aggregated`);

    // ========================================================================
    // 3. BUILDING APPROVALS (BA)
    // ========================================================================
    console.log('\n🏗️  Aggregating Building Approvals (BA)...');

    const baResult = await pool.query(`
      -- Delete existing NSW aggregates
      DELETE FROM housing_dashboard.ba_aggregated
      WHERE lga_name = 'New South Wales';

      -- Insert NSW totals by aggregating all LGAs
      INSERT INTO housing_dashboard.ba_aggregated (
        lga_code,
        lga_name,
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week,
        total_approvals,
        record_count,
        aggregated_at
      )
      SELECT
        'NSW' as lga_code,
        'New South Wales' as lga_name,
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week,
        SUM(total_approvals) as total_approvals,
        SUM(record_count) as record_count,
        NOW() as aggregated_at
      FROM housing_dashboard.ba_aggregated
      WHERE lga_name != 'New South Wales'
      GROUP BY
        period_type,
        period_start,
        period_end,
        fiscal_year,
        calendar_year,
        calendar_month,
        calendar_week
      ORDER BY period_start;
    `);

    console.log(`✓ BA aggregation complete: ${baResult.rowCount} periods aggregated`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ NSW State Aggregation Complete');
    console.log('='.repeat(60));
    console.log(`DA Periods: ${daResult.rowCount}`);
    console.log(`OC Periods: ${ocResult.rowCount}`);
    console.log(`BA Periods: ${baResult.rowCount}`);
    console.log('='.repeat(60));

    // Verify the data
    console.log('\n🔍 Verification - Sample NSW Data:\n');

    const verifyDA = await pool.query(`
      SELECT
        'DA' as dataset,
        period_type,
        COUNT(*) as period_count,
        SUM(total_determined) as total_determined,
        SUM(determined_approved) as total_approved
      FROM housing_dashboard.da_aggregated
      WHERE lga_name = 'New South Wales'
      GROUP BY period_type
      ORDER BY period_type;
    `);

    const verifyOC = await pool.query(`
      SELECT
        'OC' as dataset,
        period_type,
        COUNT(*) as period_count,
        SUM(total_determined) as total_determined,
        SUM(determined_approved) as total_approved
      FROM housing_dashboard.oc_aggregated
      WHERE lga_name = 'New South Wales'
      GROUP BY period_type
      ORDER BY period_type;
    `);

    const verifyBA = await pool.query(`
      SELECT
        'BA' as dataset,
        period_type,
        COUNT(*) as period_count,
        SUM(total_approvals) as total_approvals
      FROM housing_dashboard.ba_aggregated
      WHERE lga_name = 'New South Wales'
      GROUP BY period_type
      ORDER BY period_type;
    `);

    console.table([...verifyDA.rows, ...verifyOC.rows, ...verifyBA.rows]);

    console.log('\n✓ Script completed successfully\n');
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during aggregation:', error);
    console.error('Details:', error.message);
    await pool.end();
    process.exit(1);
  }
}

// Run the aggregation
aggregateNSWData();
