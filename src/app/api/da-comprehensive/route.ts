import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

/**
 * Comprehensive Development Applications API
 *
 * Unified endpoint serving all 6 DA card types:
 * 1. Daily Activity (last 30 days)
 * 2. Weekly Trends (last 12 weeks)
 * 3. Monthly Summary (last 12 months)
 * 4. 13-Month Overview
 * 5. Year-over-Year Comparison (12 months vs previous 12)
 * 6. Complete History (all time, monthly rollup)
 *
 * Query Parameters:
 * - type: 'daily' | 'weekly' | 'monthly' | '13-month' | 'yoy-comparison' | 'history'
 * - lgaCode: LGA code (optional, for filtering)
 * - lgaName: LGA name (optional, for filtering)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, lgaCode, lgaName } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: type' },
        { status: 400 }
      );
    }

    const pool = getReadonlyPool();

    let query: string;
    let params: any[] = [];

    // Build query based on card type
    switch (type) {
      case 'daily':
        query = buildDailyQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      case 'weekly':
        query = buildWeeklyQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      case 'monthly':
        query = buildMonthlyQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      case '13-month':
        query = build13MonthQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      case 'yoy-comparison':
        query = buildYoYComparisonQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      case 'history':
        query = buildHistoryQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Invalid type: ${type}` },
          { status: 400 }
        );
    }

    const result = await pool.query(query, params);

    // Calculate summary statistics
    const summary = calculateSummary(result.rows, type);

    return NextResponse.json({
      success: true,
      type,
      lga: lgaCode || lgaName || 'All LGAs',
      data: result.rows,
      summary,
      count: result.rows.length,
    });

  } catch (error: any) {
    console.error('[DA Comprehensive API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch DA data',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Query Builders
// ============================================================================

function buildDailyQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);

  return `
    SELECT
      lga_code,
      lga_name,
      period_start as date,
      total_determined,
      determined_approved,
      determined_refused,
      determined_withdrawn,
      determined_deferred,
      determined_other,
      total_new_dwellings,
      avg_estimated_cost,
      avg_days_to_determination,
      total_modifications,
      modification_percentage,
      record_count
    FROM housing_dashboard.da_aggregated
    WHERE period_type = 'daily'
      AND period_start >= CURRENT_DATE - INTERVAL '30 days'
      ${whereClause}
    ORDER BY period_start DESC, lga_name
    LIMIT 500
  `;
}

function buildWeeklyQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);

  return `
    SELECT
      lga_code,
      lga_name,
      period_start,
      period_end,
      calendar_week,
      calendar_year,
      total_determined,
      determined_approved,
      determined_refused,
      determined_withdrawn,
      total_new_dwellings,
      avg_estimated_cost,
      avg_days_to_determination,
      modification_percentage,
      record_count
    FROM housing_dashboard.da_aggregated
    WHERE period_type = 'weekly'
      AND period_start >= CURRENT_DATE - INTERVAL '12 weeks'
      ${whereClause}
    ORDER BY period_start DESC, lga_name
    LIMIT 200
  `;
}

function buildMonthlyQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);

  return `
    SELECT
      lga_code,
      lga_name,
      period_start,
      period_end,
      calendar_month,
      calendar_year,
      fiscal_year,
      total_determined,
      determined_approved,
      determined_refused,
      determined_withdrawn,
      determined_deferred,
      total_new_dwellings,
      total_estimated_cost,
      avg_estimated_cost,
      avg_days_to_determination,
      median_days_to_determination,
      total_modifications,
      modification_percentage,
      record_count
    FROM housing_dashboard.da_aggregated
    WHERE period_type = 'monthly'
      AND period_start >= CURRENT_DATE - INTERVAL '12 months'
      ${whereClause}
    ORDER BY period_start DESC, lga_name
    LIMIT 200
  `;
}

function build13MonthQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);

  return `
    SELECT
      lga_code,
      lga_name,
      period_start,
      period_end,
      calendar_month,
      calendar_year,
      total_determined,
      determined_approved,
      determined_refused,
      determined_withdrawn,
      total_new_dwellings,
      avg_estimated_cost,
      avg_days_to_determination,
      modification_percentage,
      record_count
    FROM housing_dashboard.da_aggregated
    WHERE period_type = 'monthly'
      AND period_start >= CURRENT_DATE - INTERVAL '13 months'
      ${whereClause}
    ORDER BY period_start DESC, lga_name
    LIMIT 200
  `;
}

function buildYoYComparisonQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);

  return `
    WITH current_period AS (
      SELECT
        lga_code,
        lga_name,
        period_start,
        calendar_month,
        total_determined,
        determined_approved,
        determined_refused,
        total_new_dwellings,
        avg_days_to_determination
      FROM housing_dashboard.da_aggregated
      WHERE period_type = 'monthly'
        AND period_start >= CURRENT_DATE - INTERVAL '12 months'
        AND period_start < CURRENT_DATE
        ${whereClause}
    ),
    previous_period AS (
      SELECT
        lga_code,
        lga_name,
        period_start,
        calendar_month,
        total_determined,
        determined_approved,
        determined_refused,
        total_new_dwellings,
        avg_days_to_determination
      FROM housing_dashboard.da_aggregated
      WHERE period_type = 'monthly'
        AND period_start >= CURRENT_DATE - INTERVAL '24 months'
        AND period_start < CURRENT_DATE - INTERVAL '12 months'
        ${whereClause}
    )
    SELECT
      COALESCE(c.lga_code, p.lga_code) as lga_code,
      COALESCE(c.lga_name, p.lga_name) as lga_name,
      c.period_start as current_period_start,
      c.calendar_month as month,
      c.total_determined as current_total_determined,
      c.determined_approved as current_determined_approved,
      c.determined_refused as current_determined_refused,
      c.total_new_dwellings as current_total_new_dwellings,
      c.avg_days_to_determination as current_avg_days,
      p.total_determined as previous_total_determined,
      p.determined_approved as previous_determined_approved,
      p.determined_refused as previous_determined_refused,
      p.total_new_dwellings as previous_total_new_dwellings,
      p.avg_days_to_determination as previous_avg_days,
      CASE
        WHEN p.total_determined > 0
        THEN ((c.total_determined - p.total_determined)::DECIMAL / p.total_determined * 100)
        ELSE NULL
      END as pct_change_determined,
      CASE
        WHEN p.determined_approved > 0
        THEN ((c.determined_approved - p.determined_approved)::DECIMAL / p.determined_approved * 100)
        ELSE NULL
      END as pct_change_approved
    FROM current_period c
    FULL OUTER JOIN previous_period p
      ON c.lga_code = p.lga_code
      AND c.calendar_month = p.calendar_month
    ORDER BY current_period_start DESC, lga_name
  `;
}

function buildHistoryQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);

  return `
    SELECT
      lga_code,
      lga_name,
      period_start,
      period_end,
      calendar_month,
      calendar_year,
      fiscal_year,
      total_determined,
      determined_approved,
      determined_refused,
      determined_withdrawn,
      total_new_dwellings,
      avg_estimated_cost,
      avg_days_to_determination,
      modification_percentage,
      record_count
    FROM housing_dashboard.da_aggregated
    WHERE period_type = 'monthly'
      ${whereClause}
    ORDER BY period_start ASC, lga_name
  `;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildWhereClause(lgaCode?: string, lgaName?: string): string {
  if (lgaCode) {
    return `AND lga_code = $1`;
  } else if (lgaName) {
    return `AND lga_name ILIKE $1`;
  }
  return '';
}

function buildParams(lgaCode?: string, lgaName?: string): any[] {
  if (lgaCode) return [lgaCode];
  if (lgaName) return [`%${lgaName}%`];
  return [];
}

function calculateSummary(rows: any[], type: string): any {
  if (rows.length === 0) {
    return {
      total_records: 0,
      total_determined: 0,
      total_approved: 0,
      total_refused: 0,
      approval_rate: 0,
    };
  }

  const totalDetermined = rows.reduce((sum, row) => sum + (row.total_determined || 0), 0);
  const totalApproved = rows.reduce((sum, row) => sum + (row.determined_approved || row.current_determined_approved || 0), 0);
  const totalRefused = rows.reduce((sum, row) => sum + (row.determined_refused || row.current_determined_refused || 0), 0);
  const totalWithdrawn = rows.reduce((sum, row) => sum + (row.determined_withdrawn || 0), 0);
  const totalNewDwellings = rows.reduce((sum, row) => sum + (row.total_new_dwellings || row.current_total_new_dwellings || 0), 0);

  const approvalRate = totalDetermined > 0
    ? ((totalApproved / totalDetermined) * 100).toFixed(1)
    : 0;

  const avgDaysToDecision = rows
    .filter(row => row.avg_days_to_determination || row.current_avg_days)
    .reduce((sum, row, _, arr) => sum + (row.avg_days_to_determination || row.current_avg_days || 0) / arr.length, 0);

  return {
    total_records: rows.length,
    total_determined: totalDetermined,
    total_approved: totalApproved,
    total_refused: totalRefused,
    total_withdrawn: totalWithdrawn,
    total_new_dwellings: totalNewDwellings,
    approval_rate: parseFloat(approvalRate),
    avg_days_to_decision: avgDaysToDecision ? Math.round(avgDaysToDecision) : null,
  };
}
