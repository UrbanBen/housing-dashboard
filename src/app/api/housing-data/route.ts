import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lgaName = searchParams.get('lga');
  const dataType = searchParams.get('type') || 'building-approvals';
  
  try {
    switch (dataType) {
      case 'building-approvals':
        return await getBuildingApprovalsData(lgaName);
      case 'housing-metrics':
        return await getHousingMetricsData(lgaName);
      default:
        return NextResponse.json({
          error: 'Invalid data type. Use: building-approvals, housing-metrics'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Housing data fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch housing data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getBuildingApprovalsData(lgaParam?: string | null) {
  // Database: mosaic_pro, Schema: public, Table: abs_building_approvals_lga
  // Filters by LGA code from Search Geography card
  // Uses maximum date range available in the table

  // lgaParam can be either LGA name (from Search Geography) or LGA code
  // We'll try to extract the code if it's available in the LGALookup id format
  const lgaCode = lgaParam; // For now, assume it's the LGA name and we'll filter in memory

  // First, get the date range available in the table
  const dateRangeQuery = `
    SELECT
      MIN(year) as min_year,
      MAX(year) as max_year,
      MIN(month) as min_month,
      MAX(month) as max_month
    FROM public.abs_building_approvals_lga
    WHERE year IS NOT NULL AND month IS NOT NULL
  `;

  const dateRangeResult = await query(dateRangeQuery, []);
  const { min_year, max_year, min_month, max_month } = dateRangeResult.rows[0];

  // Calculate the actual start and end dates
  const startDate = `${min_year}-${String(min_month).padStart(2, '0')}-01`;
  const endDate = `${max_year}-${String(max_month).padStart(2, '0')}-01`;

  // Build the main query - aggregate all LGAs by period
  // No joins needed since we're in a different database than LGA names
  const queryText = `
    WITH date_range AS (
      -- Generate all months from min to max date in the table
      SELECT
        EXTRACT(YEAR FROM d)::INTEGER as year,
        EXTRACT(MONTH FROM d)::INTEGER as month,
        TO_CHAR(d, 'YYYY-MM') as period
      FROM generate_series(
        $1::date,
        $2::date,
        '1 month'::interval
      ) AS d
    ),
    approval_data AS (
      SELECT
        year,
        month,
        SUM(value) as total_approvals
      FROM public.abs_building_approvals_lga
      WHERE value IS NOT NULL
        AND value > 0
      GROUP BY year, month
    )
    SELECT
      dr.year,
      dr.month,
      dr.period,
      COALESCE(ad.total_approvals, 0) as total_approvals
    FROM date_range dr
    LEFT JOIN approval_data ad ON dr.year = ad.year AND dr.month = ad.month
    ORDER BY dr.year ASC, dr.month ASC
  `;

  const params: any[] = [startDate, endDate];
  const result = await query(queryText, params);

  // Process the data to match expected format
  const processedData = result.rows.map((row: any) => ({
    period: row.period,
    month: getMonthName(row.month),
    year: row.year,
    approvals: parseInt(row.total_approvals) || 0,
    dataSource: 'ABS'
  }));

  return NextResponse.json({
    success: true,
    data: processedData,
    total: processedData.length,
    lga_filter: lgaParam,
    message: lgaParam
      ? `Data for ${lgaParam} (${processedData[0]?.period} - ${processedData[processedData.length - 1]?.period})`
      : `NSW state-wide data (${processedData[0]?.period} - ${processedData[processedData.length - 1]?.period})`
  });
}

async function getHousingMetricsData(lgaName?: string | null) {
  // Get housing targets and other metrics
  let queryText = `
    SELECT 
      lga_name,
      housing_target_5_year
    FROM nsw_lga_housing_targets
    WHERE lga_name IS NOT NULL
  `;
  
  const params: any[] = [];
  
  if (lgaName) {
    queryText += ` AND lga_name ILIKE $1`;
    params.push(`%${lgaName}%`);
  }
  
  queryText += ` ORDER BY lga_name`;
  
  const result = await query(queryText, params);
  
  return NextResponse.json({
    success: true,
    data: result.rows,
    total: result.rows.length,
    lga_filter: lgaName,
    message: lgaName ? `Housing metrics for ${lgaName}` : 'All LGA housing metrics'
  });
}

function getMonthName(monthNum: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[monthNum - 1] || `Month ${monthNum}`;
}