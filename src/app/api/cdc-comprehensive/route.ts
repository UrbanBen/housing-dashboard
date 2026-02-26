import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

/**
 * Comprehensive Complying Development Certificates (CDC) API
 *
 * Unified endpoint serving CDC card types:
 * - history: Complete historical data (monthly rollup)
 *
 * Query Parameters:
 * - type: 'history'
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

  // Calculate annual average by getting unique years
  const years = new Set(rows.map(row => new Date(row.period_start).getFullYear()));
  const annualAverage = years.size > 0 ? totalDwellings / years.size : 0;

  return {
    total_records: rows.length,
    total_dwellings: totalDwellings,
    monthly_average: Math.round(monthlyAverage * 10) / 10, // Round to 1 decimal
    annual_average: Math.round(annualAverage * 10) / 10,   // Round to 1 decimal
  };
}
