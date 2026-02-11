import { NextResponse } from 'next/server';
import { getReadonlyPool, executeQuery } from '@/lib/db-pool';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lgaCode = searchParams.get('lgaCode');
  const lgaName = searchParams.get('lgaName'); // For display purposes

  if (!lgaName) {
    return NextResponse.json({
      success: false,
      error: 'LGA name is required',
      message: 'Please provide an LGA name parameter'
    }, { status: 400 });
  }

  try {
    const pool = getReadonlyPool();

    // Query DA aggregated data for monthly new dwellings
    // This uses the same DA data that powers the other DA cards
    const queryText = `
      SELECT
        lga_name,
        period_start,
        calendar_year,
        calendar_month,
        COALESCE(total_new_dwellings, 0) as total_new_dwellings
      FROM housing_dashboard.da_aggregated
      WHERE lga_name ILIKE $1
        AND period_type = 'monthly'
        AND total_new_dwellings > 0
      ORDER BY period_start ASC
    `;

    const result = await pool.query(queryText, [`%${lgaName}%`]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found',
        message: `No dwelling approvals data found for LGA: ${lgaName}`
      }, { status: 404 });
    }

    const processedData = result.rows.map((row: any) => {
      const date = new Date(row.period_start);
      const year = row.calendar_year;
      const month = row.calendar_month;

      return {
        period: `${year}-${String(month).padStart(2, '0')}`,
        month: getMonthName(month),
        year: year,
        approvals: row.total_new_dwellings,
        dataSource: 'housing_dashboard'
      };
    });

    return NextResponse.json({
      success: true,
      data: processedData,
      total: processedData.length,
      lga_filter: lgaName,
      lga_name: result.rows[0].lga_name,
      message: `Dwelling approvals data for ${result.rows[0].lga_name} (${processedData[0]?.period} - ${processedData[processedData.length - 1]?.period})`
    });

  } catch (error) {
    console.error('LGA dwelling approvals fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch LGA dwelling approvals data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function getMonthName(monthNum: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[monthNum - 1] || `Month ${monthNum}`;
}
