const { Pool } = require('pg');
const fs = require('fs');

// Read database password from .env.local
function getDbPassword() {
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    const match = content.match(/^DB_ADMIN_PASSWORD\s*=\s*(.+)$/m);
    if (match) {
      return match[1].replace(/^["']|["']$/g, '');
    }
  } catch (error) {
    console.error('Error reading .env.local:', error.message);
  }
  throw new Error('DB_ADMIN_PASSWORD not found in .env.local');
}

const dbPassword = getDbPassword();

// Connection pools
const sourcePool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: dbPassword,
  ssl: { rejectUnauthorized: false }
});

const targetPool = new Pool({
  host: 'mecone-data-lake.postgres.database.azure.com',
  port: 5432,
  database: 'research&insights',
  user: 'db_admin',
  password: dbPassword,
  ssl: { rejectUnauthorized: false }
});

const BATCH_SIZE = 500;

async function aggregateBuildingApprovals() {
  const startTime = Date.now();
  console.log('[BA Aggregation] Starting comprehensive aggregation...');
  console.log('[BA Aggregation] Batch size:', BATCH_SIZE);

  try {
    // Aggregate daily, weekly, and monthly
    await aggregatePeriod('daily');
    await aggregatePeriod('weekly');
    await aggregatePeriod('monthly');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[BA Aggregation] ✅ Complete in ${duration}s`);

  } catch (error) {
    console.error('[BA Aggregation] ❌ Error:', error);
    throw error;
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

async function aggregatePeriod(periodType) {
  console.log(`\n[BA Aggregation] === ${periodType.toUpperCase()} AGGREGATION ===`);

  const queryMap = {
    daily: `
      WITH unpivoted AS (
        SELECT
          lga_code::TEXT,
          lga_name,
          col.key as date_str,
          TO_DATE(col.key, 'DD/MM/YYYY') as date,
          CASE
            WHEN col.value::text = 'null' OR col.value IS NULL THEN 0
            ELSE col.value::text::integer
          END as approvals
        FROM housing_dashboard.building_approvals_nsw_lga,
        LATERAL jsonb_each(to_jsonb(building_approvals_nsw_lga) - 'lga_code' - 'lga_name') col
        WHERE col.key ~ '^[0-9]+/[0-9]+/[0-9]+$'
      )
      SELECT
        lga_code,
        lga_name,
        date as period_date,
        SUM(approvals) as total_approvals,
        COUNT(*) as record_count
      FROM unpivoted
      WHERE lga_name IS NOT NULL
        AND date IS NOT NULL
      GROUP BY lga_code, lga_name, date
      ORDER BY lga_name, date
    `,
    weekly: `
      WITH unpivoted AS (
        SELECT
          lga_code::TEXT,
          lga_name,
          TO_DATE(col.key, 'DD/MM/YYYY') as date,
          CASE
            WHEN col.value::text = 'null' OR col.value IS NULL THEN 0
            ELSE col.value::text::integer
          END as approvals
        FROM housing_dashboard.building_approvals_nsw_lga,
        LATERAL jsonb_each(to_jsonb(building_approvals_nsw_lga) - 'lga_code' - 'lga_name') col
        WHERE col.key ~ '^[0-9]+/[0-9]+/[0-9]+$'
      )
      SELECT
        lga_code,
        lga_name,
        DATE_TRUNC('week', date)::DATE as week_start,
        SUM(approvals) as total_approvals,
        COUNT(*) as record_count
      FROM unpivoted
      WHERE lga_name IS NOT NULL
        AND date IS NOT NULL
      GROUP BY lga_code, lga_name, DATE_TRUNC('week', date)
      ORDER BY lga_name, week_start
    `,
    monthly: `
      WITH unpivoted AS (
        SELECT
          lga_code::TEXT,
          lga_name,
          TO_DATE(col.key, 'DD/MM/YYYY') as date,
          CASE
            WHEN col.value::text = 'null' OR col.value IS NULL THEN 0
            ELSE col.value::text::integer
          END as approvals
        FROM housing_dashboard.building_approvals_nsw_lga,
        LATERAL jsonb_each(to_jsonb(building_approvals_nsw_lga) - 'lga_code' - 'lga_name') col
        WHERE col.key ~ '^[0-9]+/[0-9]+/[0-9]+$'
      )
      SELECT
        lga_code,
        lga_name,
        DATE_TRUNC('month', date)::DATE as month_start,
        SUM(approvals) as total_approvals,
        COUNT(*) as record_count
      FROM unpivoted
      WHERE lga_name IS NOT NULL
        AND date IS NOT NULL
      GROUP BY lga_code, lga_name, DATE_TRUNC('month', date)
      ORDER BY lga_name, month_start
    `
  };

  const sourceQuery = queryMap[periodType];
  console.log(`[BA Aggregation ${periodType}] Fetching source data...`);

  const result = await sourcePool.query(sourceQuery);
  console.log(`[BA Aggregation ${periodType}] Retrieved ${result.rows.length} aggregates`);

  if (result.rows.length === 0) {
    console.log(`[BA Aggregation ${periodType}] No data to aggregate`);
    return;
  }

  // Process in batches
  await batchInsert(targetPool, result.rows, periodType);

  console.log(`[BA Aggregation ${periodType}] ✅ Complete: ${result.rows.length} records`);
}

async function batchInsert(client, aggregates, periodType) {
  const batches = [];
  for (let i = 0; i < aggregates.length; i += BATCH_SIZE) {
    batches.push(aggregates.slice(i, i + BATCH_SIZE));
  }

  console.log(`[BA Aggregation ${periodType}] Inserting in ${batches.length} batches...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const values = [];
    const placeholders = [];

    batch.forEach((agg, idx) => {
      const baseIdx = idx * 11;
      const periodStart = agg.period_date || agg.week_start || agg.month_start;
      const periodEnd = getPeriodEnd(periodStart, periodType);

      // Calculate time dimensions
      const date = new Date(periodStart);
      const fiscalYear = date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
      const calendarYear = date.getFullYear();
      const calendarMonth = date.getMonth() + 1;
      const calendarWeek = getWeekNumber(date);

      placeholders.push(
        `($${baseIdx + 1}::VARCHAR(10), $${baseIdx + 2}::VARCHAR(100), $${baseIdx + 3}::VARCHAR(10), $${baseIdx + 4}::DATE, $${baseIdx + 5}::DATE, $${baseIdx + 6}::INTEGER, $${baseIdx + 7}::INTEGER, $${baseIdx + 8}::INTEGER, $${baseIdx + 9}::INTEGER, $${baseIdx + 10}::INTEGER, $${baseIdx + 11}::INTEGER, NOW())`
      );

      values.push(
        agg.lga_code,
        agg.lga_name,
        periodType,
        periodStart,
        periodEnd,
        fiscalYear,
        calendarYear,
        calendarMonth,
        calendarWeek,
        parseInt(agg.total_approvals) || 0,
        parseInt(agg.record_count) || 0
      );
    });

    const insertQuery = `
      INSERT INTO housing_dashboard.ba_aggregated (
        lga_code, lga_name, period_type, period_start, period_end,
        fiscal_year, calendar_year, calendar_month, calendar_week,
        total_approvals, record_count, aggregated_at
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (lga_name, period_type, period_start)
      DO UPDATE SET
        total_approvals = EXCLUDED.total_approvals,
        record_count = EXCLUDED.record_count,
        aggregated_at = NOW()
    `;

    await client.query(insertQuery, values);

    const progress = ((i + 1) / batches.length * 100).toFixed(1);
    console.log(`[BA Aggregation ${periodType}] Progress: ${progress}% (batch ${i + 1}/${batches.length})`);
  }
}

function getPeriodEnd(periodStart, periodType) {
  const date = new Date(periodStart);

  if (periodType === 'daily') {
    return periodStart;
  } else if (periodType === 'weekly') {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6);
    return endDate.toISOString().split('T')[0];
  } else if (periodType === 'monthly') {
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return endDate.toISOString().split('T')[0];
  }

  return periodStart;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Run aggregation
aggregateBuildingApprovals();
