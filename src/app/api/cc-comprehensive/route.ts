import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

/**
 * Comprehensive Construction Certificates API
 *
 * Unified endpoint serving CC card types:
 * - history: Complete historical data (monthly rollup)
 * - latest-month: Most recent month with MoM and YoY comparisons
 * - pie-chart: Breakdown by building code class
 *
 * Query Parameters:
 * - type: 'history' | 'latest-month' | 'pie-chart'
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
      case 'history':
        query = buildHistoryQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      case 'latest-month':
        query = buildLatestMonthQuery(lgaCode, lgaName);
        params = buildParams(lgaCode, lgaName);
        break;

      case 'pie-chart':
        query = buildPieChartQuery(lgaCode, lgaName);
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
    console.error('[CC Comprehensive API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch CC data',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Query Builders
// ============================================================================

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
      total_applications,
      total_approved,
      total_withdrawn,
      total_cancelled,
      total_estimated_cost,
      avg_estimated_cost,
      total_proposed_floor_area,
      total_units_proposed,
      record_count
    FROM housing_dashboard.cc_aggregated
    WHERE period_type = 'monthly'
      ${whereClause}
    ORDER BY period_start ASC, lga_name
  `;
}

function buildLatestMonthQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);

  return `
    WITH latest AS (
      SELECT
        lga_code,
        lga_name,
        period_start,
        period_end,
        calendar_month,
        calendar_year,
        total_applications,
        total_approved,
        total_withdrawn,
        total_cancelled,
        total_estimated_cost,
        avg_estimated_cost,
        total_proposed_floor_area,
        total_units_proposed
      FROM housing_dashboard.cc_aggregated
      WHERE period_type = 'monthly'
        ${whereClause}
      ORDER BY period_start DESC
      LIMIT 1
    ),
    previous_month AS (
      SELECT
        total_applications as prev_month_applications,
        total_approved as prev_month_approved
      FROM housing_dashboard.cc_aggregated
      WHERE period_type = 'monthly'
        AND period_start = (SELECT period_start FROM latest) - INTERVAL '1 month'
        ${whereClause}
    ),
    previous_year AS (
      SELECT
        total_applications as prev_year_applications,
        total_approved as prev_year_approved
      FROM housing_dashboard.cc_aggregated
      WHERE period_type = 'monthly'
        AND period_start = (SELECT period_start FROM latest) - INTERVAL '1 year'
        ${whereClause}
    )
    SELECT
      l.*,
      pm.prev_month_applications,
      pm.prev_month_approved,
      py.prev_year_applications,
      py.prev_year_approved,
      CASE
        WHEN pm.prev_month_applications > 0
        THEN ROUND(((l.total_applications - pm.prev_month_applications)::DECIMAL / pm.prev_month_applications * 100)::NUMERIC, 1)
        ELSE NULL
      END as mom_change_pct,
      CASE
        WHEN py.prev_year_applications > 0
        THEN ROUND(((l.total_applications - py.prev_year_applications)::DECIMAL / py.prev_year_applications * 100)::NUMERIC, 1)
        ELSE NULL
      END as yoy_change_pct
    FROM latest l
    LEFT JOIN previous_month pm ON TRUE
    LEFT JOIN previous_year py ON TRUE
  `;
}

function buildPieChartQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);
  const whereFilter = whereClause ? `AND ${whereClause}` : '';

  return `
    SELECT
      building_code_class as class_name,
      COUNT(*) as total_count,
      SUM(CASE WHEN application_status = 'Approved' THEN 1 ELSE 0 END) as approved_count
    FROM housing_dashboard.cc_records_raw
    WHERE building_code_class IS NOT NULL
      AND building_code_class != ''
      ${whereFilter}
    GROUP BY building_code_class
    ORDER BY total_count DESC
    LIMIT 10
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
      total_applications: 0,
      total_approved: 0,
      approval_rate: 0,
    };
  }

  if (type === 'pie-chart') {
    const totalCount = rows.reduce((sum, row) => sum + (row.total_count || 0), 0);
    return {
      total_records: rows.length,
      total_count: totalCount,
    };
  }

  const totalApplications = rows.reduce((sum, row) => sum + (row.total_applications || 0), 0);
  const totalApproved = rows.reduce((sum, row) => sum + (row.total_approved || 0), 0);

  const approvalRate = totalApplications > 0
    ? ((totalApproved / totalApplications) * 100).toFixed(1)
    : 0;

  return {
    total_records: rows.length,
    total_applications: totalApplications,
    total_approved: totalApproved,
    approval_rate: typeof approvalRate === 'number' ? approvalRate : parseFloat(approvalRate),
  };
}
