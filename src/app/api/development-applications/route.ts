import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

interface RequestBody {
  lgaName: string;
  lgaCode?: string;
  startDate?: string; // ISO date string (YYYY-MM-DD)
  endDate?: string; // ISO date string (YYYY-MM-DD)
  monthsBack?: number; // Number of months to fetch (default: 12)
}

interface DARecord {
  month_year: string;
  total_determined: number;
  approved: number;
  refused: number;
  withdrawn: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { lgaName, lgaCode, startDate, endDate, monthsBack = 12 } = body;

    if (!lgaName && !lgaCode) {
      return NextResponse.json(
        { error: 'Either lgaName or lgaCode is required' },
        { status: 400 }
      );
    }

    const pool = getReadonlyPool();

    // Build query based on provided parameters
    let query: string;
    let params: any[];

    if (startDate && endDate) {
      // Query for specific date range
      query = `
        SELECT
          TO_CHAR(month_year, 'YYYY-MM-DD') as month_year,
          total_determined,
          approved,
          refused,
          withdrawn
        FROM housing_dashboard.development_applications
        WHERE ${lgaCode ? 'lga_code = $1' : 'lga_name = $1'}
          AND month_year >= $2
          AND month_year <= $3
        ORDER BY month_year DESC
      `;
      params = [lgaCode || lgaName, startDate, endDate];
    } else {
      // Query for last N months
      query = `
        SELECT
          TO_CHAR(month_year, 'YYYY-MM-DD') as month_year,
          total_determined,
          approved,
          refused,
          withdrawn
        FROM housing_dashboard.development_applications
        WHERE ${lgaCode ? 'lga_code = $1' : 'lga_name = $1'}
          AND month_year >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '${monthsBack} months')
        ORDER BY month_year DESC
      `;
      params = [lgaCode || lgaName];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error: 'No data found for this LGA',
          message: 'This could mean: (1) No DAs have been determined in this LGA, (2) Data has not been fetched yet, or (3) The LGA name/code does not match our records.'
        },
        { status: 404 }
      );
    }

    // Calculate summary statistics
    const totalRecords = result.rows.length;
    const totalDetermined = result.rows.reduce((sum: number, row: DARecord) => sum + parseInt(row.total_determined as any), 0);
    const totalApproved = result.rows.reduce((sum: number, row: DARecord) => sum + parseInt(row.approved as any), 0);
    const totalRefused = result.rows.reduce((sum: number, row: DARecord) => sum + parseInt(row.refused as any), 0);
    const totalWithdrawn = result.rows.reduce((sum: number, row: DARecord) => sum + parseInt(row.withdrawn as any), 0);

    const approvalRate = totalDetermined > 0
      ? ((totalApproved / totalDetermined) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      success: true,
      data: result.rows.map((row: any) => ({
        month: row.month_year,
        totalDetermined: parseInt(row.total_determined),
        approved: parseInt(row.approved),
        refused: parseInt(row.refused),
        withdrawn: parseInt(row.withdrawn)
      })),
      summary: {
        periodMonths: totalRecords,
        totalDetermined,
        totalApproved,
        totalRefused,
        totalWithdrawn,
        approvalRate: `${approvalRate}%`,
        averagePerMonth: totalRecords > 0
          ? Math.round(totalDetermined / totalRecords)
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching development applications data:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch development applications data',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
