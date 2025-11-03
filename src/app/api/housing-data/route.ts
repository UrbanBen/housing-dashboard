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

async function getBuildingApprovalsData(lgaName?: string | null) {
  // Get data from July 2021 to October 2024
  // Database: mosaic_pro, Schema: public, Table: abs_building_approvals_lga
  let queryText = `
    WITH recent_data AS (
      SELECT
        lga_code,
        year,
        month,
        building_type,
        value,
        year * 100 + month as period_num
      FROM public.abs_building_approvals_lga
      WHERE (year > 2021 OR (year = 2021 AND month >= 7))
        AND (year < 2024 OR (year = 2024 AND month <= 10))
        AND value > 0
    ),
    lga_mapping AS (
      SELECT DISTINCT
        lga_name,
        ROW_NUMBER() OVER (ORDER BY lga_name) as synthetic_lga_code
      FROM public.nsw_lga_housing_targets
      WHERE lga_name IS NOT NULL
    ),
    monthly_totals AS (
      SELECT 
        rd.year,
        rd.month,
        rd.lga_code,
        SUM(CAST(rd.value AS INTEGER)) as total_approvals,
        MAX(lm.lga_name) as lga_name
      FROM recent_data rd
      LEFT JOIN lga_mapping lm ON CAST(lm.synthetic_lga_code AS TEXT) = CAST(rd.lga_code AS TEXT)
      GROUP BY rd.year, rd.month, rd.lga_code
      HAVING SUM(rd.value) > 0
    )
    SELECT 
      year,
      month,
      lga_code,
      total_approvals,
      lga_name,
      (year || '-' || LPAD(month::text, 2, '0')) as period
    FROM monthly_totals
  `;
  
  const params: any[] = [];
  
  if (lgaName) {
    // Since we don't have a direct mapping, we'll return a message about this limitation
    queryText += ` WHERE lga_name ILIKE $1`;
    params.push(`%${lgaName}%`);
  }
  
  queryText += ` ORDER BY year ASC, month ASC LIMIT 500`;

  const result = await query(queryText, params);

  // Process the data to match expected format
  const processedData = result.rows.map((row: any) => ({
    period: row.period,
    month: getMonthName(row.month),
    year: row.year,
    approvals: row.total_approvals,
    lgaCode: row.lga_code,
    lgaName: row.lga_name || `LGA ${row.lga_code}`,
    dataSource: 'ABS'
  }));

  // If no LGA specified, aggregate across all LGAs
  if (!lgaName && processedData.length > 0) {
    const aggregated = processedData.reduce((acc: any, curr: any) => {
      const key = curr.period;
      if (!acc[key]) {
        acc[key] = {
          period: curr.period,
          month: curr.month,
          year: curr.year,
          approvals: 0,
          lgaName: 'NSW Total',
          dataSource: 'ABS'
        };
      }
      acc[key].approvals += parseInt(curr.approvals) || 0;
      return acc;
    }, {} as Record<string, any>);

    // Sort by period and return all data from July 2021 to October 2024
    const sortedData = Object.values(aggregated).sort((a: any, b: any) =>
      a.period.localeCompare(b.period)
    );

    return NextResponse.json({
      success: true,
      data: sortedData,
      total: Object.keys(aggregated).length,
      lga_filter: lgaName,
      message: lgaName ? `Data for ${lgaName}` : 'NSW state-wide data (Jul 2021 - Oct 2024)'
    });
  }

  // Sort by period for individual LGA data
  const sortedData = processedData.sort((a: any, b: any) =>
    a.period.localeCompare(b.period)
  );

  return NextResponse.json({
    success: true,
    data: sortedData,
    total: processedData.length,
    lga_filter: lgaName,
    message: lgaName ? `Data for ${lgaName} (Jul 2021 - Oct 2024)` : 'All LGA data'
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