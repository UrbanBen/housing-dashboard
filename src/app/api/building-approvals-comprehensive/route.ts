import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

/**
 * Comprehensive Building Approvals API
 *
 * Unified endpoint serving all 6 BA card types:
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
    console.error('[BA Comprehensive API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch BA data',
      },
      { status: 500 }
    );
  }
}

// Query builders
function buildDailyQuery(lgaCode?: string, lgaName?: string): string {
  const lgaFilter = lgaCode ? 'lga_code = $1' : lgaName ? 'lga_name = $1' : '1=1';

  return `
    SELECT
      period_start::text as date,
      total_approvals
    FROM housing_dashboard.ba_aggregated
    WHERE period_type = 'daily'
      AND ${lgaFilter}
      AND period_start >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY period_start ASC
  `;
}

function buildWeeklyQuery(lgaCode?: string, lgaName?: string): string {
  const lgaFilter = lgaCode ? 'lga_code = $1' : lgaName ? 'lga_name = $1' : '1=1';

  return `
    SELECT
      period_start::text as week_start,
      total_approvals
    FROM housing_dashboard.ba_aggregated
    WHERE period_type = 'weekly'
      AND ${lgaFilter}
      AND period_start >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '12 weeks'
    ORDER BY period_start ASC
  `;
}

function buildMonthlyQuery(lgaCode?: string, lgaName?: string): string {
  const lgaFilter = lgaCode ? 'lga_code = $1' : lgaName ? 'lga_name = $1' : '1=1';

  return `
    SELECT
      period_start::text as month,
      total_approvals
    FROM housing_dashboard.ba_aggregated
    WHERE period_type = 'monthly'
      AND ${lgaFilter}
      AND period_start >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
    ORDER BY period_start ASC
  `;
}

function build13MonthQuery(lgaCode?: string, lgaName?: string): string {
  const lgaFilter = lgaCode ? 'lga_code = $1' : lgaName ? 'lga_name = $1' : '1=1';

  return `
    SELECT
      period_start::text as month,
      total_approvals
    FROM housing_dashboard.ba_aggregated
    WHERE period_type = 'monthly'
      AND ${lgaFilter}
      AND period_start >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '13 months'
    ORDER BY period_start ASC
    LIMIT 13
  `;
}

function buildYoYComparisonQuery(lgaCode?: string, lgaName?: string): string {
  const lgaFilter = lgaCode ? 'lga_code = $1' : lgaName ? 'lga_name = $1' : '1=1';

  return `
    WITH current_year AS (
      SELECT
        period_start,
        TO_CHAR(period_start, 'Mon') as month_name,
        total_approvals
      FROM housing_dashboard.ba_aggregated
      WHERE period_type = 'monthly'
        AND ${lgaFilter}
        AND period_start >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
        AND period_start < DATE_TRUNC('month', CURRENT_DATE)
    ),
    previous_year AS (
      SELECT
        period_start,
        TO_CHAR(period_start, 'Mon') as month_name,
        total_approvals
      FROM housing_dashboard.ba_aggregated
      WHERE period_type = 'monthly'
        AND ${lgaFilter}
        AND period_start >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '24 months'
        AND period_start < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
    )
    SELECT
      c.month_name,
      c.total_approvals as current_year,
      p.total_approvals as previous_year,
      ROUND(((c.total_approvals::numeric - p.total_approvals::numeric) / NULLIF(p.total_approvals::numeric, 0) * 100)::numeric, 1) as percent_change
    FROM current_year c
    LEFT JOIN previous_year p ON EXTRACT(MONTH FROM c.period_start) = EXTRACT(MONTH FROM p.period_start)
    ORDER BY c.period_start ASC
  `;
}

function buildHistoryQuery(lgaCode?: string, lgaName?: string): string {
  const lgaFilter = lgaCode ? 'lga_code = $1' : lgaName ? 'lga_name = $1' : '1=1';

  return `
    SELECT
      period_start::text as month,
      total_approvals
    FROM housing_dashboard.ba_aggregated
    WHERE period_type = 'monthly'
      AND ${lgaFilter}
    ORDER BY period_start ASC
  `;
}

function buildParams(lgaCode?: string, lgaName?: string): any[] {
  if (lgaCode) return [lgaCode];
  if (lgaName) return [lgaName];
  return [];
}

function calculateSummary(rows: any[], type: string): any {
  if (rows.length === 0) {
    return {
      total_approvals: 0,
      avg_per_period: 0,
    };
  }

  const totalApprovals = rows.reduce((sum, row) => {
    const approvals = row.total_approvals || row.current_year || 0;
    return sum + parseInt(approvals);
  }, 0);

  const avgPerPeriod = rows.length > 0 ? (totalApprovals / rows.length).toFixed(1) : 0;

  const summary: any = {
    total_approvals: totalApprovals,
    avg_per_period: avgPerPeriod,
  };

  // Add type-specific metrics
  if (type === 'daily') {
    summary.total_last_30_days = totalApprovals;
    summary.avg_per_day = avgPerPeriod;
  } else if (type === 'weekly') {
    summary.total_last_12_weeks = totalApprovals;
    summary.avg_per_week = avgPerPeriod;
  } else if (type === 'monthly' || type === '13-month') {
    summary.total_last_12_months = totalApprovals;
    summary.avg_per_month = avgPerPeriod;
  } else if (type === 'yoy-comparison') {
    const currentYearTotal = rows.reduce((sum, row) => sum + parseInt(row.current_year || 0), 0);
    const previousYearTotal = rows.reduce((sum, row) => sum + parseInt(row.previous_year || 0), 0);
    const yoyChange = previousYearTotal > 0
      ? ((currentYearTotal - previousYearTotal) / previousYearTotal * 100).toFixed(1)
      : '0';

    summary.current_year_total = currentYearTotal;
    summary.previous_year_total = previousYearTotal;
    summary.yoy_change = yoyChange;
  }

  return summary;
}
