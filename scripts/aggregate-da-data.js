#!/usr/bin/env node

/**
 * DA Data Aggregation Script
 *
 * Transforms raw DA records into pre-aggregated daily/weekly/monthly summaries
 * for fast dashboard queries.
 *
 * Run after fetch-da-comprehensive.js completes
 *
 * Usage: node scripts/aggregate-da-data.js
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
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Aggregate daily data
async function aggregateDaily(pool) {
  console.log('[Aggregate] Processing DAILY aggregations...');

  const query = `
    INSERT INTO housing_dashboard.da_aggregated (
      lga_code, lga_name, period_type, period_start, period_end,
      fiscal_year, calendar_year, calendar_month, calendar_week,
      total_determined, determined_approved, determined_refused,
      determined_withdrawn, determined_deferred, determined_other,
      total_lodged, total_estimated_cost, avg_estimated_cost,
      total_new_dwellings, avg_new_dwellings_per_da,
      avg_days_to_determination, median_days_to_determination,
      total_modifications, modification_percentage,
      development_types_breakdown, applicant_types_breakdown,
      record_count, aggregated_at
    )
    SELECT
      lga_code,
      lga_name,
      'daily' as period_type,
      determined_date as period_start,
      determined_date as period_end,
      -- Fiscal year (July 1 to June 30)
      CASE
        WHEN EXTRACT(MONTH FROM determined_date) >= 7
        THEN EXTRACT(YEAR FROM determined_date)::INTEGER + 1
        ELSE EXTRACT(YEAR FROM determined_date)::INTEGER
      END as fiscal_year,
      EXTRACT(YEAR FROM determined_date)::INTEGER as calendar_year,
      EXTRACT(MONTH FROM determined_date)::INTEGER as calendar_month,
      EXTRACT(WEEK FROM determined_date)::INTEGER as calendar_week,

      -- Determination counts
      COUNT(*) as total_determined,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%approv%' OR LOWER(determination_type) LIKE '%consent%') as determined_approved,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%refus%' OR LOWER(determination_type) LIKE '%reject%') as determined_refused,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%withdraw%') as determined_withdrawn,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%defer%') as determined_deferred,
      COUNT(*) FILTER (WHERE
        determination_type IS NULL OR
        (LOWER(determination_type) NOT LIKE '%approv%' AND
         LOWER(determination_type) NOT LIKE '%consent%' AND
         LOWER(determination_type) NOT LIKE '%refus%' AND
         LOWER(determination_type) NOT LIKE '%reject%' AND
         LOWER(determination_type) NOT LIKE '%withdraw%' AND
         LOWER(determination_type) NOT LIKE '%defer%')
      ) as determined_other,

      -- Lodgement count (for this day)
      0 as total_lodged, -- Will update in separate query

      -- Financial metrics
      SUM(estimated_cost) as total_estimated_cost,
      AVG(estimated_cost) as avg_estimated_cost,

      -- Dwelling metrics
      SUM(COALESCE(number_of_new_dwellings, 0)) as total_new_dwellings,
      AVG(number_of_new_dwellings) as avg_new_dwellings_per_da,

      -- Efficiency metrics
      AVG(days_to_determination) as avg_days_to_determination,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_determination) as median_days_to_determination,

      -- Modification metrics
      COUNT(*) FILTER (WHERE is_modification = true) as total_modifications,
      (COUNT(*) FILTER (WHERE is_modification = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as modification_percentage,

      -- Development types breakdown (JSON)
      jsonb_object_agg(
        COALESCE(development_type, 'Unknown'),
        dev_type_count
      ) FILTER (WHERE development_type IS NOT NULL) as development_types_breakdown,

      -- Applicant types breakdown (JSON)
      jsonb_object_agg(
        COALESCE(applicant_type, 'Unknown'),
        app_type_count
      ) FILTER (WHERE applicant_type IS NOT NULL) as applicant_types_breakdown,

      COUNT(*) as record_count,
      NOW() as aggregated_at

    FROM (
      SELECT
        r.*,
        COUNT(*) OVER (PARTITION BY r.lga_code, r.determined_date, r.development_type) as dev_type_count,
        COUNT(*) OVER (PARTITION BY r.lga_code, r.determined_date, r.applicant_type) as app_type_count
      FROM housing_dashboard.da_records_raw r
      WHERE r.determined_date IS NOT NULL
    ) as subq

    GROUP BY lga_code, lga_name, determined_date

    ON CONFLICT (lga_code, period_type, period_start)
    DO UPDATE SET
      lga_name = EXCLUDED.lga_name,
      total_determined = EXCLUDED.total_determined,
      determined_approved = EXCLUDED.determined_approved,
      determined_refused = EXCLUDED.determined_refused,
      determined_withdrawn = EXCLUDED.determined_withdrawn,
      determined_deferred = EXCLUDED.determined_deferred,
      determined_other = EXCLUDED.determined_other,
      total_estimated_cost = EXCLUDED.total_estimated_cost,
      avg_estimated_cost = EXCLUDED.avg_estimated_cost,
      total_new_dwellings = EXCLUDED.total_new_dwellings,
      avg_new_dwellings_per_da = EXCLUDED.avg_new_dwellings_per_da,
      avg_days_to_determination = EXCLUDED.avg_days_to_determination,
      median_days_to_determination = EXCLUDED.median_days_to_determination,
      total_modifications = EXCLUDED.total_modifications,
      modification_percentage = EXCLUDED.modification_percentage,
      development_types_breakdown = EXCLUDED.development_types_breakdown,
      applicant_types_breakdown = EXCLUDED.applicant_types_breakdown,
      record_count = EXCLUDED.record_count,
      aggregated_at = NOW()
  `;

  const result = await pool.query(query);
  console.log(`[Aggregate] Daily: ${result.rowCount} LGA-day combinations processed`);
  return result.rowCount;
}

// Aggregate weekly data
async function aggregateWeekly(pool) {
  console.log('[Aggregate] Processing WEEKLY aggregations...');

  const query = `
    INSERT INTO housing_dashboard.da_aggregated (
      lga_code, lga_name, period_type, period_start, period_end,
      fiscal_year, calendar_year, calendar_month, calendar_week,
      total_determined, determined_approved, determined_refused,
      determined_withdrawn, determined_deferred, determined_other,
      total_lodged, total_estimated_cost, avg_estimated_cost,
      total_new_dwellings, avg_new_dwellings_per_da,
      avg_days_to_determination, median_days_to_determination,
      total_modifications, modification_percentage,
      record_count, aggregated_at
    )
    SELECT
      lga_code,
      lga_name,
      'weekly' as period_type,
      DATE_TRUNC('week', determined_date)::DATE as period_start,
      (DATE_TRUNC('week', determined_date) + INTERVAL '6 days')::DATE as period_end,
      NULL as fiscal_year, -- Not applicable for weekly
      EXTRACT(YEAR FROM determined_date)::INTEGER as calendar_year,
      NULL as calendar_month,
      EXTRACT(WEEK FROM determined_date)::INTEGER as calendar_week,

      -- Determination counts
      COUNT(*) as total_determined,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%approv%' OR LOWER(determination_type) LIKE '%consent%') as determined_approved,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%refus%' OR LOWER(determination_type) LIKE '%reject%') as determined_refused,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%withdraw%') as determined_withdrawn,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%defer%') as determined_deferred,
      COUNT(*) FILTER (WHERE
        determination_type IS NULL OR
        (LOWER(determination_type) NOT LIKE '%approv%' AND
         LOWER(determination_type) NOT LIKE '%consent%' AND
         LOWER(determination_type) NOT LIKE '%refus%' AND
         LOWER(determination_type) NOT LIKE '%reject%' AND
         LOWER(determination_type) NOT LIKE '%withdraw%' AND
         LOWER(determination_type) NOT LIKE '%defer%')
      ) as determined_other,

      0 as total_lodged,

      -- Financial metrics
      SUM(estimated_cost) as total_estimated_cost,
      AVG(estimated_cost) as avg_estimated_cost,

      -- Dwelling metrics
      SUM(COALESCE(number_of_new_dwellings, 0)) as total_new_dwellings,
      AVG(number_of_new_dwellings) as avg_new_dwellings_per_da,

      -- Efficiency metrics
      AVG(days_to_determination) as avg_days_to_determination,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_determination) as median_days_to_determination,

      -- Modification metrics
      COUNT(*) FILTER (WHERE is_modification = true) as total_modifications,
      (COUNT(*) FILTER (WHERE is_modification = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as modification_percentage,

      COUNT(*) as record_count,
      NOW() as aggregated_at

    FROM housing_dashboard.da_records_raw
    WHERE determined_date IS NOT NULL

    GROUP BY lga_code, lga_name, DATE_TRUNC('week', determined_date), EXTRACT(YEAR FROM determined_date), EXTRACT(WEEK FROM determined_date)

    ON CONFLICT (lga_code, period_type, period_start)
    DO UPDATE SET
      lga_name = EXCLUDED.lga_name,
      period_end = EXCLUDED.period_end,
      total_determined = EXCLUDED.total_determined,
      determined_approved = EXCLUDED.determined_approved,
      determined_refused = EXCLUDED.determined_refused,
      determined_withdrawn = EXCLUDED.determined_withdrawn,
      determined_deferred = EXCLUDED.determined_deferred,
      determined_other = EXCLUDED.determined_other,
      total_estimated_cost = EXCLUDED.total_estimated_cost,
      avg_estimated_cost = EXCLUDED.avg_estimated_cost,
      total_new_dwellings = EXCLUDED.total_new_dwellings,
      avg_new_dwellings_per_da = EXCLUDED.avg_new_dwellings_per_da,
      avg_days_to_determination = EXCLUDED.avg_days_to_determination,
      median_days_to_determination = EXCLUDED.median_days_to_determination,
      total_modifications = EXCLUDED.total_modifications,
      modification_percentage = EXCLUDED.modification_percentage,
      record_count = EXCLUDED.record_count,
      aggregated_at = NOW()
  `;

  const result = await pool.query(query);
  console.log(`[Aggregate] Weekly: ${result.rowCount} LGA-week combinations processed`);
  return result.rowCount;
}

// Aggregate monthly data
async function aggregateMonthly(pool) {
  console.log('[Aggregate] Processing MONTHLY aggregations...');

  const query = `
    INSERT INTO housing_dashboard.da_aggregated (
      lga_code, lga_name, period_type, period_start, period_end,
      fiscal_year, calendar_year, calendar_month, calendar_week,
      total_determined, determined_approved, determined_refused,
      determined_withdrawn, determined_deferred, determined_other,
      total_lodged, total_estimated_cost, avg_estimated_cost,
      total_new_dwellings, avg_new_dwellings_per_da,
      avg_days_to_determination, median_days_to_determination,
      total_modifications, modification_percentage,
      record_count, aggregated_at
    )
    SELECT
      lga_code,
      lga_name,
      'monthly' as period_type,
      DATE_TRUNC('month', determined_date)::DATE as period_start,
      (DATE_TRUNC('month', determined_date) + INTERVAL '1 month - 1 day')::DATE as period_end,
      CASE
        WHEN EXTRACT(MONTH FROM determined_date) >= 7
        THEN EXTRACT(YEAR FROM determined_date)::INTEGER + 1
        ELSE EXTRACT(YEAR FROM determined_date)::INTEGER
      END as fiscal_year,
      EXTRACT(YEAR FROM determined_date)::INTEGER as calendar_year,
      EXTRACT(MONTH FROM determined_date)::INTEGER as calendar_month,
      NULL as calendar_week,

      -- Determination counts
      COUNT(*) as total_determined,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%approv%' OR LOWER(determination_type) LIKE '%consent%') as determined_approved,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%refus%' OR LOWER(determination_type) LIKE '%reject%') as determined_refused,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%withdraw%') as determined_withdrawn,
      COUNT(*) FILTER (WHERE LOWER(determination_type) LIKE '%defer%') as determined_deferred,
      COUNT(*) FILTER (WHERE
        determination_type IS NULL OR
        (LOWER(determination_type) NOT LIKE '%approv%' AND
         LOWER(determination_type) NOT LIKE '%consent%' AND
         LOWER(determination_type) NOT LIKE '%refus%' AND
         LOWER(determination_type) NOT LIKE '%reject%' AND
         LOWER(determination_type) NOT LIKE '%withdraw%' AND
         LOWER(determination_type) NOT LIKE '%defer%')
      ) as determined_other,

      0 as total_lodged,

      -- Financial metrics
      SUM(estimated_cost) as total_estimated_cost,
      AVG(estimated_cost) as avg_estimated_cost,

      -- Dwelling metrics
      SUM(COALESCE(number_of_new_dwellings, 0)) as total_new_dwellings,
      AVG(number_of_new_dwellings) as avg_new_dwellings_per_da,

      -- Efficiency metrics
      AVG(days_to_determination) as avg_days_to_determination,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_determination) as median_days_to_determination,

      -- Modification metrics
      COUNT(*) FILTER (WHERE is_modification = true) as total_modifications,
      (COUNT(*) FILTER (WHERE is_modification = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as modification_percentage,

      COUNT(*) as record_count,
      NOW() as aggregated_at

    FROM housing_dashboard.da_records_raw
    WHERE determined_date IS NOT NULL

    GROUP BY lga_code, lga_name, DATE_TRUNC('month', determined_date), EXTRACT(YEAR FROM determined_date), EXTRACT(MONTH FROM determined_date)

    ON CONFLICT (lga_code, period_type, period_start)
    DO UPDATE SET
      lga_name = EXCLUDED.lga_name,
      period_end = EXCLUDED.period_end,
      fiscal_year = EXCLUDED.fiscal_year,
      total_determined = EXCLUDED.total_determined,
      determined_approved = EXCLUDED.determined_approved,
      determined_refused = EXCLUDED.determined_refused,
      determined_withdrawn = EXCLUDED.determined_withdrawn,
      determined_deferred = EXCLUDED.determined_deferred,
      determined_other = EXCLUDED.determined_other,
      total_estimated_cost = EXCLUDED.total_estimated_cost,
      avg_estimated_cost = EXCLUDED.avg_estimated_cost,
      total_new_dwellings = EXCLUDED.total_new_dwellings,
      avg_new_dwellings_per_da = EXCLUDED.avg_new_dwellings_per_da,
      avg_days_to_determination = EXCLUDED.avg_days_to_determination,
      median_days_to_determination = EXCLUDED.median_days_to_determination,
      total_modifications = EXCLUDED.total_modifications,
      modification_percentage = EXCLUDED.modification_percentage,
      record_count = EXCLUDED.record_count,
      aggregated_at = NOW()
  `;

  const result = await pool.query(query);
  console.log(`[Aggregate] Monthly: ${result.rowCount} LGA-month combinations processed`);
  return result.rowCount;
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[DA Aggregation] Starting at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}\n`);

  let pool;

  try {
    // Initialize database
    pool = createDbPool();
    console.log('[DB] Database connection established\n');

    // Run aggregations
    const dailyCount = await aggregateDaily(pool);
    const weeklyCount = await aggregateWeekly(pool);
    const monthlyCount = await aggregateMonthly(pool);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[DA Aggregation] Completed in ${duration}s`);
    console.log(`${'='.repeat(70)}`);
    console.log(`[Summary]`);
    console.log(`  Daily records:   ${dailyCount}`);
    console.log(`  Weekly records:  ${weeklyCount}`);
    console.log(`  Monthly records: ${monthlyCount}`);
    console.log(`  Total:           ${dailyCount + weeklyCount + monthlyCount}`);
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
