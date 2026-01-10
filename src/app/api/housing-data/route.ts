import { NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { getAdminPool } from '@/lib/db-pool';

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
  // Database: research&insights, Schema: housing_dashboard, Table: building_approvals_nsw_lga
  // Table structure: lga_code, lga_name, "1/7/2024", "1/8/2024", ... (wide format)
  // Unpivots date columns and filters by LGA name from Search Geography card

  const pool = getAdminPool();

  // Determine if this is a state-wide request or specific LGA
  const isStateWide = !lgaParam || lgaParam.toLowerCase().includes('state-wide') || lgaParam.toLowerCase() === 'new south wales';

  let queryText: string;
  let params: any[] = [];

  if (isStateWide) {
    // Aggregate all LGAs for NSW state-wide view - unpivot date columns
    queryText = `
      WITH unpivoted AS (
        SELECT
          col.key as date_str,
          COALESCE(col.value::text::integer, 0) as approvals
        FROM housing_dashboard.building_approvals_nsw_lga,
        LATERAL jsonb_each(to_jsonb(building_approvals_nsw_lga) - 'lga_code' - 'lga_name') col
        WHERE col.key ~ '^[0-9]+/[0-9]+/[0-9]+$'
      ),
      parsed_dates AS (
        SELECT
          date_str,
          TO_DATE(date_str, 'DD/MM/YYYY') as date,
          SUM(approvals) as total_approvals
        FROM unpivoted
        GROUP BY date_str, TO_DATE(date_str, 'DD/MM/YYYY')
      )
      SELECT
        TO_CHAR(date, 'YYYY-MM') as period,
        EXTRACT(YEAR FROM date)::INTEGER as year,
        EXTRACT(MONTH FROM date)::INTEGER as month,
        total_approvals
      FROM parsed_dates
      ORDER BY date ASC
    `;
  } else {
    // Get data for specific LGA - unpivot date columns
    queryText = `
      WITH unpivoted AS (
        SELECT
          col.key as date_str,
          COALESCE(col.value::text::integer, 0) as approvals
        FROM housing_dashboard.building_approvals_nsw_lga,
        LATERAL jsonb_each(to_jsonb(building_approvals_nsw_lga) - 'lga_code' - 'lga_name') col
        WHERE lga_name = $1
          AND col.key ~ '^[0-9]+/[0-9]+/[0-9]+$'
      ),
      parsed_dates AS (
        SELECT
          TO_DATE(date_str, 'DD/MM/YYYY') as date,
          approvals as total_approvals
        FROM unpivoted
      )
      SELECT
        TO_CHAR(date, 'YYYY-MM') as period,
        EXTRACT(YEAR FROM date)::INTEGER as year,
        EXTRACT(MONTH FROM date)::INTEGER as month,
        total_approvals
      FROM parsed_dates
      ORDER BY date ASC
    `;
    params = [lgaParam];
  }

  const result = await pool.query(queryText, params);

  // Process the data to match expected format
  const processedData = result.rows.map((row: any) => ({
    period: row.period,
    month: getMonthName(row.month),
    year: row.year,
    approvals: parseInt(row.total_approvals) || 0,
    dataSource: 'Housing Dashboard'
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