import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';
import { createAPILogger, generateRequestId } from '@/lib/logger';

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
  const logger = createAPILogger('/api/cdc-comprehensive', generateRequestId());

  try {
    const body = await request.json();
    const { type, lgaCode, lgaName, startDate, endDate } = body;

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
        query = buildPieChartQuery(lgaCode, lgaName, startDate, endDate);
        params = buildPieChartParams(lgaCode, lgaName, startDate, endDate);
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
    logger.error('[CDC Comprehensive API] Error', error instanceof Error ? error : new Error(String(error)));
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

function buildPieChartQuery(lgaCode?: string, lgaName?: string, startDate?: string, endDate?: string): string {
  const whereClauses: string[] = [];

  // Base condition: building_code_class must exist
  whereClauses.push(`building_code_class IS NOT NULL`);
  whereClauses.push(`building_code_class != ''`);

  if (lgaCode) {
    whereClauses.push(`lga_code = $1`);
  } else if (lgaName) {
    whereClauses.push(`lga_name ILIKE $1`);
  }

  if (startDate && endDate) {
    const paramIndex = (lgaCode || lgaName) ? 3 : 1;
    whereClauses.push(`determined_date >= $${paramIndex - 1}::date`);
    whereClauses.push(`determined_date <= $${paramIndex}::date`);
  } else if (!startDate && !endDate) {
    // Default to most recent month if no date range specified
    whereClauses.push(`determined_date >= date_trunc('month', (SELECT MAX(determined_date) FROM housing_dashboard.cdc_records_raw))`);
    whereClauses.push(`determined_date < date_trunc('month', (SELECT MAX(determined_date) FROM housing_dashboard.cdc_records_raw)) + interval '1 month'`);
  }

  const whereFilter = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  return `
    SELECT
      building_code_class as building_class,
      COUNT(*)::INTEGER as total_count
    FROM housing_dashboard.cdc_records_raw
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

function buildPieChartParams(lgaCode?: string, lgaName?: string, startDate?: string, endDate?: string): any[] {
  const params: any[] = [];

  if (lgaCode) {
    params.push(lgaCode);
  } else if (lgaName) {
    params.push(`%${lgaName}%`);
  }

  if (startDate && endDate) {
    params.push(startDate);
    params.push(endDate);
  }

  return params;
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
