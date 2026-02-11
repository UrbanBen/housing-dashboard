#!/usr/bin/env node

/**
 * Occupation Certificate Aggregation Script
 *
 * Aggregates OC data from mosaic_pro.public.nsw_oc_data into
 * housing_dashboard.oc_aggregated (daily, weekly, and monthly summaries)
 *
 * IMPORTANT: This script READS from mosaic_pro and WRITES to research&insights
 * - Source: mosaic_pro.public.nsw_oc_data (READ ONLY)
 * - Target: research&insights.housing_dashboard.oc_aggregated (READ/WRITE)
 *
 * Usage: node scripts/aggregate-oc-comprehensive.js
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

// Initialize database connection for mosaic_pro (READ ONLY)
function createMosaicProPool() {
  const password = readPasswordFromFile('/users/ben/permissions/.env.readonly');

  if (!password) {
    throw new Error('Failed to read readonly database password');
  }

  return new Pool({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'mosaic_pro',
    user: 'mosaic_readonly',
    password: password,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// Initialize database connection for research&insights (WRITE)
function createResearchInsightsPool() {
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
async function aggregateDaily(sourcePool, targetPool) {
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    console.log('[Daily Aggregation] Starting...');

    // Fetch data from mosaic_pro
    const fetchQuery = `
      SELECT
        lga_name,
        lga_code::TEXT as lga_code,
        DATE(date_last_updated) as determination_date,
        application_status,
        COUNT(*) as record_count
      FROM public.nsw_oc_data
      WHERE date_last_updated IS NOT NULL
        AND lga_name IS NOT NULL
      GROUP BY lga_name, lga_code, DATE(date_last_updated), application_status
      ORDER BY determination_date DESC
    `;

    console.log('[Daily Aggregation] Fetching OC data from mosaic_pro...');
    const sourceResult = await sourceClient.query(fetchQuery);
    console.log(`[Daily Aggregation] Fetched ${sourceResult.rows.length} raw daily records`);

    // Aggregate by day and LGA
    const dailyAggregates = new Map();

    sourceResult.rows.forEach(row => {
      const key = `${row.lga_name}|${row.determination_date}`;

      if (!dailyAggregates.has(key)) {
        dailyAggregates.set(key, {
          lga_code: row.lga_code,
          lga_name: row.lga_name,
          period_start: row.determination_date,
          period_end: row.determination_date,
          calendar_year: new Date(row.determination_date).getFullYear(),
          calendar_month: new Date(row.determination_date).getMonth() + 1,
          calendar_week: getWeekNumber(new Date(row.determination_date)),
          total_determined: 0,
          determined_approved: 0,
          determined_withdrawn: 0,
          record_count: 0
        });
      }

      const agg = dailyAggregates.get(key);
      agg.record_count += row.record_count;
      agg.total_determined += row.record_count;

      // Categorize by application_status
      const status = (row.application_status || '').toLowerCase();
      if (status.includes('determined') || status.includes('issued') || status.includes('approved') || status.includes('finalised') || status.includes('post oc completed')) {
        agg.determined_approved += row.record_count;
      } else if (status.includes('withdrawn') || status.includes('returned') || status.includes('cancelled') || status.includes('declined') || status.includes('rejected')) {
        agg.determined_withdrawn += row.record_count;
      }
    });

    console.log(`[Daily Aggregation] Aggregated into ${dailyAggregates.size} daily summaries`);

    // Insert into research&insights
    for (const [key, agg] of dailyAggregates) {
      const fiscalYear = agg.calendar_month >= 7 ? agg.calendar_year + 1 : agg.calendar_year;

      const insertQuery = `
        INSERT INTO housing_dashboard.oc_aggregated (
          lga_code, lga_name, period_type, period_start, period_end,
          fiscal_year, calendar_year, calendar_month, calendar_week,
          total_determined, determined_approved, determined_withdrawn,
          record_count, aggregated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (lga_name, period_type, period_start)
        DO UPDATE SET
          lga_code = EXCLUDED.lga_code,
          period_end = EXCLUDED.period_end,
          fiscal_year = EXCLUDED.fiscal_year,
          calendar_year = EXCLUDED.calendar_year,
          calendar_month = EXCLUDED.calendar_month,
          calendar_week = EXCLUDED.calendar_week,
          total_determined = EXCLUDED.total_determined,
          determined_approved = EXCLUDED.determined_approved,
          determined_withdrawn = EXCLUDED.determined_withdrawn,
          record_count = EXCLUDED.record_count,
          aggregated_at = NOW()
        RETURNING (xmax = 0) as inserted
      `;

      const result = await targetClient.query(insertQuery, [
        agg.lga_code,
        agg.lga_name,
        'daily',
        agg.period_start,
        agg.period_end,
        fiscalYear,
        agg.calendar_year,
        agg.calendar_month,
        agg.calendar_week,
        agg.total_determined,
        agg.determined_approved,
        agg.determined_withdrawn,
        agg.record_count
      ]);

      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(`[Daily Aggregation] Complete: ${insertedCount} inserted, ${updatedCount} updated`);

  } catch (error) {
    console.error('[Daily Aggregation] Error:', error.message);
    throw error;
  } finally {
    sourceClient.release();
    targetClient.release();
  }

  return { insertedCount, updatedCount };
}

// Aggregate weekly data
async function aggregateWeekly(sourcePool, targetPool) {
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    console.log('[Weekly Aggregation] Starting...');

    // Fetch data from mosaic_pro
    const fetchQuery = `
      SELECT
        lga_name,
        lga_code::TEXT as lga_code,
        DATE_TRUNC('week', date_last_updated)::DATE as week_start,
        application_status,
        COUNT(*) as record_count
      FROM public.nsw_oc_data
      WHERE date_last_updated IS NOT NULL
        AND lga_name IS NOT NULL
      GROUP BY lga_name, lga_code, DATE_TRUNC('week', date_last_updated), application_status
      ORDER BY week_start DESC
    `;

    console.log('[Weekly Aggregation] Fetching OC data from mosaic_pro...');
    const sourceResult = await sourceClient.query(fetchQuery);
    console.log(`[Weekly Aggregation] Fetched ${sourceResult.rows.length} raw weekly records`);

    // Aggregate by week and LGA
    const weeklyAggregates = new Map();

    sourceResult.rows.forEach(row => {
      const key = `${row.lga_name}|${row.week_start}`;

      if (!weeklyAggregates.has(key)) {
        const weekStart = new Date(row.week_start);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        weeklyAggregates.set(key, {
          lga_code: row.lga_code,
          lga_name: row.lga_name,
          period_start: row.week_start,
          period_end: weekEnd.toISOString().split('T')[0],
          calendar_year: weekStart.getFullYear(),
          calendar_week: getWeekNumber(weekStart),
          total_determined: 0,
          determined_approved: 0,
          determined_withdrawn: 0,
          record_count: 0
        });
      }

      const agg = weeklyAggregates.get(key);
      agg.record_count += row.record_count;
      agg.total_determined += row.record_count;

      const status = (row.application_status || '').toLowerCase();
      if (status.includes('determined') || status.includes('issued') || status.includes('approved') || status.includes('finalised') || status.includes('post oc completed')) {
        agg.determined_approved += row.record_count;
      } else if (status.includes('withdrawn') || status.includes('returned') || status.includes('cancelled') || status.includes('declined') || status.includes('rejected')) {
        agg.determined_withdrawn += row.record_count;
      }
    });

    console.log(`[Weekly Aggregation] Aggregated into ${weeklyAggregates.size} weekly summaries`);

    // Insert into research&insights
    for (const [key, agg] of weeklyAggregates) {
      const fiscalYear = new Date(agg.period_start).getMonth() >= 6 ? agg.calendar_year + 1 : agg.calendar_year;

      const insertQuery = `
        INSERT INTO housing_dashboard.oc_aggregated (
          lga_code, lga_name, period_type, period_start, period_end,
          fiscal_year, calendar_year, calendar_week,
          total_determined, determined_approved, determined_withdrawn,
          record_count, aggregated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (lga_name, period_type, period_start)
        DO UPDATE SET
          lga_code = EXCLUDED.lga_code,
          period_end = EXCLUDED.period_end,
          fiscal_year = EXCLUDED.fiscal_year,
          calendar_year = EXCLUDED.calendar_year,
          calendar_week = EXCLUDED.calendar_week,
          total_determined = EXCLUDED.total_determined,
          determined_approved = EXCLUDED.determined_approved,
          determined_withdrawn = EXCLUDED.determined_withdrawn,
          record_count = EXCLUDED.record_count,
          aggregated_at = NOW()
        RETURNING (xmax = 0) as inserted
      `;

      const result = await targetClient.query(insertQuery, [
        agg.lga_code,
        agg.lga_name,
        'weekly',
        agg.period_start,
        agg.period_end,
        fiscalYear,
        agg.calendar_year,
        agg.calendar_week,
        agg.total_determined,
        agg.determined_approved,
        agg.determined_withdrawn,
        agg.record_count
      ]);

      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(`[Weekly Aggregation] Complete: ${insertedCount} inserted, ${updatedCount} updated`);

  } catch (error) {
    console.error('[Weekly Aggregation] Error:', error.message);
    throw error;
  } finally {
    sourceClient.release();
    targetClient.release();
  }

  return { insertedCount, updatedCount };
}

// Aggregate monthly data
async function aggregateMonthly(sourcePool, targetPool) {
  const sourceClient = await sourcePool.connect();
  const targetClient = await targetPool.connect();
  let insertedCount = 0;
  let updatedCount = 0;

  try {
    console.log('[Monthly Aggregation] Starting...');

    // Fetch data from mosaic_pro
    const fetchQuery = `
      SELECT
        lga_name,
        lga_code::TEXT as lga_code,
        DATE_TRUNC('month', date_last_updated)::DATE as month_start,
        application_status,
        COUNT(*) as record_count
      FROM public.nsw_oc_data
      WHERE date_last_updated IS NOT NULL
        AND lga_name IS NOT NULL
      GROUP BY lga_name, lga_code, DATE_TRUNC('month', date_last_updated), application_status
      ORDER BY month_start DESC
    `;

    console.log('[Monthly Aggregation] Fetching OC data from mosaic_pro...');
    const sourceResult = await sourceClient.query(fetchQuery);
    console.log(`[Monthly Aggregation] Fetched ${sourceResult.rows.length} raw monthly records`);

    // Aggregate by month and LGA
    const monthlyAggregates = new Map();

    sourceResult.rows.forEach(row => {
      const key = `${row.lga_name}|${row.month_start}`;

      if (!monthlyAggregates.has(key)) {
        const monthStart = new Date(row.month_start);
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

        monthlyAggregates.set(key, {
          lga_code: row.lga_code,
          lga_name: row.lga_name,
          period_start: row.month_start,
          period_end: monthEnd.toISOString().split('T')[0],
          calendar_year: monthStart.getFullYear(),
          calendar_month: monthStart.getMonth() + 1,
          total_determined: 0,
          determined_approved: 0,
          determined_withdrawn: 0,
          record_count: 0
        });
      }

      const agg = monthlyAggregates.get(key);
      agg.record_count += row.record_count;
      agg.total_determined += row.record_count;

      const status = (row.application_status || '').toLowerCase();
      if (status.includes('determined') || status.includes('issued') || status.includes('approved') || status.includes('finalised') || status.includes('post oc completed')) {
        agg.determined_approved += row.record_count;
      } else if (status.includes('withdrawn') || status.includes('returned') || status.includes('cancelled') || status.includes('declined') || status.includes('rejected')) {
        agg.determined_withdrawn += row.record_count;
      }
    });

    console.log(`[Monthly Aggregation] Aggregated into ${monthlyAggregates.size} monthly summaries`);

    // Insert into research&insights
    for (const [key, agg] of monthlyAggregates) {
      const fiscalYear = agg.calendar_month >= 7 ? agg.calendar_year + 1 : agg.calendar_year;

      const insertQuery = `
        INSERT INTO housing_dashboard.oc_aggregated (
          lga_code, lga_name, period_type, period_start, period_end,
          fiscal_year, calendar_year, calendar_month,
          total_determined, determined_approved, determined_withdrawn,
          record_count, aggregated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (lga_name, period_type, period_start)
        DO UPDATE SET
          lga_code = EXCLUDED.lga_code,
          period_end = EXCLUDED.period_end,
          fiscal_year = EXCLUDED.fiscal_year,
          calendar_year = EXCLUDED.calendar_year,
          calendar_month = EXCLUDED.calendar_month,
          total_determined = EXCLUDED.total_determined,
          determined_approved = EXCLUDED.determined_approved,
          determined_withdrawn = EXCLUDED.determined_withdrawn,
          record_count = EXCLUDED.record_count,
          aggregated_at = NOW()
        RETURNING (xmax = 0) as inserted
      `;

      const result = await targetClient.query(insertQuery, [
        agg.lga_code,
        agg.lga_name,
        'monthly',
        agg.period_start,
        agg.period_end,
        fiscalYear,
        agg.calendar_year,
        agg.calendar_month,
        agg.total_determined,
        agg.determined_approved,
        agg.determined_withdrawn,
        agg.record_count
      ]);

      if (result.rows[0].inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    console.log(`[Monthly Aggregation] Complete: ${insertedCount} inserted, ${updatedCount} updated`);

  } catch (error) {
    console.error('[Monthly Aggregation] Error:', error.message);
    throw error;
  } finally {
    sourceClient.release();
    targetClient.release();
  }

  return { insertedCount, updatedCount };
}

// Helper function to get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Main execution
async function main() {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[OC Aggregation] Starting at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}\n`);

  let sourcePool;
  let targetPool;

  try {
    // Initialize database connections
    sourcePool = createMosaicProPool();
    targetPool = createResearchInsightsPool();
    console.log('[DB] Source: mosaic_pro (READ ONLY)');
    console.log('[DB] Target: research&insights (READ/WRITE)\n');

    // Run aggregations
    const dailyResult = await aggregateDaily(sourcePool, targetPool);
    const weeklyResult = await aggregateWeekly(sourcePool, targetPool);
    const monthlyResult = await aggregateMonthly(sourcePool, targetPool);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`[OC Aggregation] Completed in ${duration}s`);
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
    if (sourcePool) {
      await sourcePool.end();
    }
    if (targetPool) {
      await targetPool.end();
    }
    console.log('[DB] Database connections closed\n');
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
