#!/usr/bin/env node

/**
 * Construction Certificates Aggregation Script
 *
 * Aggregates raw CC records into daily, weekly, and monthly summaries
 * Designed to run after fetch-cc-comprehensive.js (daily via cron)
 *
 * Usage: node scripts/aggregate-cc-comprehensive.js
 *
 * Environment Variables (Optional):
 * - NODE_ENV: 'development' for verbose logging
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

// Aggregate daily data
async function aggregateDaily(pool) {
  const client = await pool.connect();
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    console.log('[Daily Aggregation] Starting...');

    const query = `
      WITH daily_stats AS (
        SELECT
          COALESCE(lga_code, 'UNKNOWN') as lga_code,
          MAX(lga_name) as lga_name,
          DATE(determined_date) as period_start,
          DATE(determined_date) as period_end,
          EXTRACT(YEAR FROM determined_date) as calendar_year,
          EXTRACT(MONTH FROM determined_date) as calendar_month,
          EXTRACT(WEEK FROM determined_date) as calendar_week,

          -- Application counts
          COUNT(*) as total_applications,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%approved%' OR LOWER(application_status) LIKE '%issued%') as total_approved,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%withdraw%') as total_withdrawn,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%cancel%') as total_cancelled,

          -- Financial metrics
          SUM(cost_of_development) as total_estimated_cost,
          AVG(cost_of_development) as avg_estimated_cost,

          -- Building metrics
          SUM(proposed_gross_floor_area) as total_proposed_floor_area,
          AVG(proposed_gross_floor_area) as avg_proposed_floor_area,
          SUM(units_proposed) as total_units_proposed,
          AVG(storeys_proposed) as avg_storeys,

          -- Record count
          COUNT(*) as record_count

        FROM housing_dashboard.cc_records_raw
        WHERE determined_date IS NOT NULL
        GROUP BY lga_code, DATE(determined_date)
      )
      INSERT INTO housing_dashboard.cc_aggregated (
        lga_code, lga_name, period_type, period_start, period_end,
        fiscal_year, calendar_year, calendar_month, calendar_week,
        total_applications, total_approved, total_withdrawn, total_cancelled,
        total_estimated_cost, avg_estimated_cost,
        total_proposed_floor_area, avg_proposed_floor_area,
        total_units_proposed, avg_storeys,
        record_count, aggregated_at
      )
      SELECT
        lga_code, lga_name, 'daily', period_start, period_end,
        CASE
          WHEN calendar_month >= 7 THEN calendar_year + 1
          ELSE calendar_year
        END as fiscal_year,
        calendar_year, calendar_month, calendar_week,
        total_applications, total_approved, total_withdrawn, total_cancelled,
        total_estimated_cost, avg_estimated_cost,
        total_proposed_floor_area, avg_proposed_floor_area,
        total_units_proposed, avg_storeys,
        record_count, NOW()
      FROM daily_stats
      ON CONFLICT (lga_code, lga_name, period_type, period_start)
      DO UPDATE SET
        period_end = EXCLUDED.period_end,
        fiscal_year = EXCLUDED.fiscal_year,
        calendar_year = EXCLUDED.calendar_year,
        calendar_month = EXCLUDED.calendar_month,
        calendar_week = EXCLUDED.calendar_week,
        total_applications = EXCLUDED.total_applications,
        total_approved = EXCLUDED.total_approved,
        total_withdrawn = EXCLUDED.total_withdrawn,
        total_cancelled = EXCLUDED.total_cancelled,
        total_estimated_cost = EXCLUDED.total_estimated_cost,
        avg_estimated_cost = EXCLUDED.avg_estimated_cost,
        total_proposed_floor_area = EXCLUDED.total_proposed_floor_area,
        avg_proposed_floor_area = EXCLUDED.avg_proposed_floor_area,
        total_units_proposed = EXCLUDED.total_units_proposed,
        avg_storeys = EXCLUDED.avg_storeys,
        record_count = EXCLUDED.record_count,
        aggregated_at = NOW()
      RETURNING (xmax = 0) as inserted;
    `;

    const result = await client.query(query);

    result.rows.forEach(row => {
      if (row.inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    });

    console.log(`[Daily Aggregation] Complete: ${insertedCount} inserted, ${updatedCount} updated`);

  } catch (error) {
    console.error('[Daily Aggregation] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }

  return { insertedCount, updatedCount };
}

// Aggregate weekly data
async function aggregateWeekly(pool) {
  const client = await pool.connect();
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    console.log('[Weekly Aggregation] Starting...');

    const query = `
      WITH weekly_stats AS (
        SELECT
          COALESCE(lga_code, 'UNKNOWN') as lga_code,
          MAX(lga_name) as lga_name,
          DATE_TRUNC('week', determined_date)::DATE as period_start,
          (DATE_TRUNC('week', determined_date) + INTERVAL '6 days')::DATE as period_end,
          EXTRACT(YEAR FROM DATE_TRUNC('week', determined_date)) as calendar_year,
          EXTRACT(WEEK FROM DATE_TRUNC('week', determined_date)) as calendar_week,

          -- Application counts
          COUNT(*) as total_applications,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%approved%' OR LOWER(application_status) LIKE '%issued%') as total_approved,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%withdraw%') as total_withdrawn,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%cancel%') as total_cancelled,

          -- Financial metrics
          SUM(cost_of_development) as total_estimated_cost,
          AVG(cost_of_development) as avg_estimated_cost,

          -- Building metrics
          SUM(proposed_gross_floor_area) as total_proposed_floor_area,
          AVG(proposed_gross_floor_area) as avg_proposed_floor_area,
          SUM(units_proposed) as total_units_proposed,
          AVG(storeys_proposed) as avg_storeys,

          -- Record count
          COUNT(*) as record_count

        FROM housing_dashboard.cc_records_raw
        WHERE determined_date IS NOT NULL
        GROUP BY lga_code, DATE_TRUNC('week', determined_date)
      )
      INSERT INTO housing_dashboard.cc_aggregated (
        lga_code, lga_name, period_type, period_start, period_end,
        fiscal_year, calendar_year, calendar_week,
        total_applications, total_approved, total_withdrawn, total_cancelled,
        total_estimated_cost, avg_estimated_cost,
        total_proposed_floor_area, avg_proposed_floor_area,
        total_units_proposed, avg_storeys,
        record_count, aggregated_at
      )
      SELECT
        lga_code, lga_name, 'weekly', period_start, period_end,
        CASE
          WHEN EXTRACT(MONTH FROM period_start) >= 7 THEN calendar_year + 1
          ELSE calendar_year
        END as fiscal_year,
        calendar_year, calendar_week,
        total_applications, total_approved, total_withdrawn, total_cancelled,
        total_estimated_cost, avg_estimated_cost,
        total_proposed_floor_area, avg_proposed_floor_area,
        total_units_proposed, avg_storeys,
        record_count, NOW()
      FROM weekly_stats
      ON CONFLICT (lga_code, lga_name, period_type, period_start)
      DO UPDATE SET
        period_end = EXCLUDED.period_end,
        fiscal_year = EXCLUDED.fiscal_year,
        calendar_year = EXCLUDED.calendar_year,
        calendar_week = EXCLUDED.calendar_week,
        total_applications = EXCLUDED.total_applications,
        total_approved = EXCLUDED.total_approved,
        total_withdrawn = EXCLUDED.total_withdrawn,
        total_cancelled = EXCLUDED.total_cancelled,
        total_estimated_cost = EXCLUDED.total_estimated_cost,
        avg_estimated_cost = EXCLUDED.avg_estimated_cost,
        total_proposed_floor_area = EXCLUDED.total_proposed_floor_area,
        avg_proposed_floor_area = EXCLUDED.avg_proposed_floor_area,
        total_units_proposed = EXCLUDED.total_units_proposed,
        avg_storeys = EXCLUDED.avg_storeys,
        record_count = EXCLUDED.record_count,
        aggregated_at = NOW()
      RETURNING (xmax = 0) as inserted;
    `;

    const result = await client.query(query);

    result.rows.forEach(row => {
      if (row.inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    });

    console.log(`[Weekly Aggregation] Complete: ${insertedCount} inserted, ${updatedCount} updated`);

  } catch (error) {
    console.error('[Weekly Aggregation] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }

  return { insertedCount, updatedCount };
}

// Aggregate monthly data
async function aggregateMonthly(pool) {
  const client = await pool.connect();
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    console.log('[Monthly Aggregation] Starting...');

    const query = `
      WITH monthly_stats AS (
        SELECT
          COALESCE(lga_code, 'UNKNOWN') as lga_code,
          MAX(lga_name) as lga_name,
          DATE_TRUNC('month', determined_date)::DATE as period_start,
          (DATE_TRUNC('month', determined_date) + INTERVAL '1 month - 1 day')::DATE as period_end,
          EXTRACT(YEAR FROM DATE_TRUNC('month', determined_date)) as calendar_year,
          EXTRACT(MONTH FROM DATE_TRUNC('month', determined_date)) as calendar_month,

          -- Application counts
          COUNT(*) as total_applications,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%approved%' OR LOWER(application_status) LIKE '%issued%') as total_approved,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%withdraw%') as total_withdrawn,
          COUNT(*) FILTER (WHERE LOWER(application_status) LIKE '%cancel%') as total_cancelled,

          -- Financial metrics
          SUM(cost_of_development) as total_estimated_cost,
          AVG(cost_of_development) as avg_estimated_cost,

          -- Building metrics
          SUM(proposed_gross_floor_area) as total_proposed_floor_area,
          AVG(proposed_gross_floor_area) as avg_proposed_floor_area,
          SUM(units_proposed) as total_units_proposed,
          AVG(storeys_proposed) as avg_storeys,

          -- Record count
          COUNT(*) as record_count

        FROM housing_dashboard.cc_records_raw
        WHERE determined_date IS NOT NULL
        GROUP BY lga_code, DATE_TRUNC('month', determined_date)
      )
      INSERT INTO housing_dashboard.cc_aggregated (
        lga_code, lga_name, period_type, period_start, period_end,
        fiscal_year, calendar_year, calendar_month,
        total_applications, total_approved, total_withdrawn, total_cancelled,
        total_estimated_cost, avg_estimated_cost,
        total_proposed_floor_area, avg_proposed_floor_area,
        total_units_proposed, avg_storeys,
        record_count, aggregated_at
      )
      SELECT
        lga_code, lga_name, 'monthly', period_start, period_end,
        CASE
          WHEN calendar_month >= 7 THEN calendar_year + 1
          ELSE calendar_year
        END as fiscal_year,
        calendar_year, calendar_month,
        total_applications, total_approved, total_withdrawn, total_cancelled,
        total_estimated_cost, avg_estimated_cost,
        total_proposed_floor_area, avg_proposed_floor_area,
        total_units_proposed, avg_storeys,
        record_count, NOW()
      FROM monthly_stats
      ON CONFLICT (lga_code, lga_name, period_type, period_start)
      DO UPDATE SET
        period_end = EXCLUDED.period_end,
        fiscal_year = EXCLUDED.fiscal_year,
        calendar_year = EXCLUDED.calendar_year,
        calendar_month = EXCLUDED.calendar_month,
        total_applications = EXCLUDED.total_applications,
        total_approved = EXCLUDED.total_approved,
        total_withdrawn = EXCLUDED.total_withdrawn,
        total_cancelled = EXCLUDED.total_cancelled,
        total_estimated_cost = EXCLUDED.total_estimated_cost,
        avg_estimated_cost = EXCLUDED.avg_estimated_cost,
        total_proposed_floor_area = EXCLUDED.total_proposed_floor_area,
        avg_proposed_floor_area = EXCLUDED.avg_proposed_floor_area,
        total_units_proposed = EXCLUDED.total_units_proposed,
        avg_storeys = EXCLUDED.avg_storeys,
        record_count = EXCLUDED.record_count,
        aggregated_at = NOW()
      RETURNING (xmax = 0) as inserted;
    `;

    const result = await client.query(query);

    result.rows.forEach(row => {
      if (row.inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    });

    console.log(`[Monthly Aggregation] Complete: ${insertedCount} inserted, ${updatedCount} updated`);

  } catch (error) {
    console.error('[Monthly Aggregation] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }

  return { insertedCount, updatedCount };
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[CC Aggregation] Starting at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}\n`);

  let pool;

  try {
    // Initialize database
    pool = createDbPool();
    console.log('[DB] Database connection established\n');

    // Run aggregations
    const dailyResult = await aggregateDaily(pool);
    const weeklyResult = await aggregateWeekly(pool);
    const monthlyResult = await aggregateMonthly(pool);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[CC Aggregation] Completed in ${duration}s`);
    console.log(`${'='.repeat(70)}`);
    console.log(`[Summary]`);
    console.log(`  Daily:   ${dailyResult.insertedCount} inserted, ${dailyResult.updatedCount} updated`);
    console.log(`  Weekly:  ${weeklyResult.insertedCount} inserted, ${weeklyResult.updatedCount} updated`);
    console.log(`  Monthly: ${monthlyResult.insertedCount} inserted, ${monthlyResult.updatedCount} updated`);
    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error('\n[ERROR] Fatal error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('[ERROR] Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('[DB] Database connection closed\n');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('[Fatal]', error);
    process.exit(1);
  });
}

module.exports = { main, aggregateDaily, aggregateWeekly, aggregateMonthly };
