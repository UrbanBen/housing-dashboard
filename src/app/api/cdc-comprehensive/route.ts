import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

/**
 * Comprehensive Complying Development Certificates (CDC) API
 *
 * Unified endpoint serving CDC card types:
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
    const summary = calculateSummary(result.rows);

    return NextResponse.json({
      success: true,
      type,
      lga: lgaCode || lgaName || 'All LGAs',
      data: result.rows,
      summary,
      count: result.rows.length,
    });

  } catch (error: any) {
    console.error('[CDC Comprehensive API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch CDC data',
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
  const periodFilter = whereClause ? `WHERE ${whereClause}` : '';

  return `
    SELECT
      month as period_start,
      lga_code,
      lga_name,
      COALESCE(monthly_new_dwellings, 0) as total_dwellings,
      total_cdcs,
      'Complying Development' as development_type
    FROM housing_dashboard.cdc_historic
    ${periodFilter}
    ORDER BY month ASC
  `;
}

function buildLatestMonthQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);
  const whereFilter = whereClause ? `AND ${whereClause}` : '';

  return `
    WITH latest AS (
      SELECT
        month as period_start,
        lga_code,
        lga_name,
        COALESCE(monthly_new_dwellings, 0) as total_dwellings,
        total_cdcs,
        total_private_certifier,
        total_council_certifier,
        total_cost,
        avg_cost
      FROM housing_dashboard.cdc_historic
      WHERE 1=1 ${whereFilter}
      ORDER BY month DESC
      LIMIT 1
    ),
    previous_month AS (
      SELECT
        COALESCE(monthly_new_dwellings, 0) as prev_month_dwellings,
        total_cdcs as prev_month_cdcs
      FROM housing_dashboard.cdc_historic
      WHERE month = (SELECT period_start FROM latest) - INTERVAL '1 month'
        ${whereFilter}
    ),
    previous_year AS (
      SELECT
        COALESCE(monthly_new_dwellings, 0) as prev_year_dwellings,
        total_cdcs as prev_year_cdcs
      FROM housing_dashboard.cdc_historic
      WHERE month = (SELECT period_start FROM latest) - INTERVAL '1 year'
        ${whereFilter}
    )
    SELECT
      l.*,
      pm.prev_month_dwellings,
      pm.prev_month_cdcs,
      py.prev_year_dwellings,
      py.prev_year_cdcs,
      CASE
        WHEN pm.prev_month_dwellings > 0
        THEN ROUND(((l.total_dwellings - pm.prev_month_dwellings)::DECIMAL / pm.prev_month_dwellings * 100)::NUMERIC, 1)
        ELSE NULL
      END as mom_change_pct,
      CASE
        WHEN py.prev_year_dwellings > 0
        THEN ROUND(((l.total_dwellings - py.prev_year_dwellings)::DECIMAL / py.prev_year_dwellings * 100)::NUMERIC, 1)
        ELSE NULL
      END as yoy_change_pct
    FROM latest l
    LEFT JOIN previous_month pm ON TRUE
    LEFT JOIN previous_year py ON TRUE
  `;
}

function buildPieChartQuery(lgaCode?: string, lgaName?: string): string {
  const whereClause = buildWhereClause(lgaCode, lgaName);
  const whereFilter = whereClause ? `WHERE ${whereClause}` : '';

  return `
    SELECT
      'Class 1 - Houses' as building_class,
      SUM(COALESCE(building_code_class_1_houses, 0)) as total_count
    FROM housing_dashboard.cdc_historic
    ${whereFilter}
    UNION ALL
    SELECT
      'Class 2 - Apartments' as building_class,
      SUM(COALESCE(building_code_class_2_apartments, 0)) as total_count
    FROM housing_dashboard.cdc_historic
    ${whereFilter}
    UNION ALL
    SELECT
      'Class 3 - Residential Care' as building_class,
      SUM(COALESCE(building_code_class_3_residential_care, 0)) as total_count
    FROM housing_dashboard.cdc_historic
    ${whereFilter}
    UNION ALL
    SELECT
      'Class 4 - Dwelling in Building' as building_class,
      SUM(COALESCE(building_code_class_4_dwelling_in_building, 0)) as total_count
    FROM housing_dashboard.cdc_historic
    ${whereFilter}
    UNION ALL
    SELECT
      'Class 10 - Non-Habitable' as building_class,
      SUM(COALESCE(building_code_class_10_non_habitable, 0)) as total_count
    FROM housing_dashboard.cdc_historic
    ${whereFilter}
    ORDER BY total_count DESC
  `;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildWhereClause(lgaCode?: string, lgaName?: string): string {
  if (lgaCode) {
    return `lga_code = $1`;
  } else if (lgaName) {
    return `lga_name ILIKE $1`;
  }
  return '';
}

function buildParams(lgaCode?: string, lgaName?: string): any[] {
  if (lgaCode) return [lgaCode];
  if (lgaName) return [`%${lgaName}%`];
  return [];
}

function calculateSummary(rows: any[]): any {
  if (rows.length === 0) {
    return {
      total_records: 0,
      total_dwellings: 0,
      monthly_average: 0,
      annual_average: 0,
    };
  }

  const totalDwellings = rows.reduce((sum, row) => sum + (parseInt(row.total_dwellings) || 0), 0);

  // Calculate monthly average
  const monthlyAverage = rows.length > 0 ? totalDwellings / rows.length : 0;

  // Calculate annual average: monthly average × 12 months
  const annualAverage = monthlyAverage * 12;

  return {
    total_records: rows.length,
    total_dwellings: totalDwellings,
    monthly_average: Math.round(monthlyAverage * 10) / 10, // Round to 1 decimal
    annual_average: Math.round(annualAverage * 10) / 10,   // Round to 1 decimal
  };
}
