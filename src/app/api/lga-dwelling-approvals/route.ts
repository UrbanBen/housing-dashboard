import { NextResponse } from 'next/server';
import { getReadonlyPool, executeQuery } from '@/lib/db-pool';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lgaCode = searchParams.get('lgaCode');
  const lgaName = searchParams.get('lgaName'); // For display purposes

  if (!lgaCode) {
    return NextResponse.json({
      success: false,
      error: 'LGA code is required',
      message: 'Please provide an LGA code parameter'
    }, { status: 400 });
  }

  try {
    const pool = getReadonlyPool();

    // Query the wide format table - lga_code and lga_name columns
    const queryText = `
      SELECT *
      FROM housing_dashboard.building_approvals_nsw_lga
      WHERE lga_code = $1
      LIMIT 1
    `;

    const result = await pool.query(queryText, [parseInt(lgaCode)]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found',
        message: `No dwelling approvals data found for LGA code: ${lgaCode}`
      }, { status: 404 });
    }

    const row = result.rows[0];
    const processedData: any[] = [];

    // Process each date column (skip lga_code and lga_name)
    for (const columnName of Object.keys(row)) {
      if (columnName === 'lga_code' || columnName === 'lga_name') continue;

      // Parse the date from column name (e.g., "1/7/2024" -> day 1, month 7, year 2024 = July 2024)
      const dateParts = columnName.split('/');
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const year = parseInt(dateParts[2]);

        const approvals = row[columnName] || 0;
        const period = `${year}-${String(month).padStart(2, '0')}`;

        processedData.push({
          period: period,
          month: getMonthName(month),
          year: year,
          approvals: approvals,
          dataSource: 'housing_dashboard'
        });
      }
    }

    // Sort by period
    processedData.sort((a, b) => a.period.localeCompare(b.period));

    return NextResponse.json({
      success: true,
      data: processedData,
      total: processedData.length,
      lga_filter: lgaName,
      lga_name: row.lga_name,
      message: `Dwelling approvals data for ${row.lga_name} (${processedData[0]?.period} - ${processedData[processedData.length - 1]?.period})`
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
