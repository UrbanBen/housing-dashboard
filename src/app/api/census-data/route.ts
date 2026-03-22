import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db-pool';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lgaName = searchParams.get('lgaName');
    const level = searchParams.get('level') || 'lga';

    if (!lgaName) {
      return NextResponse.json(
        { error: 'LGA name is required' },
        { status: 400 }
      );
    }

    let query: string;
    let params: any[];

    if (lgaName === 'NSW' || lgaName === 'New South Wales') {
      // Get NSW state data
      query = `
        SELECT
          state_name as name,
          area_sqkm,
          population as population_2026,
          population_2011,
          population_2016,
          population_2021,
          population_2024 as population_2026_proj,
          growth_rate_2011_2016,
          growth_rate_2016_2021,
          growth_rate_2021_2024 as growth_rate_2021_2026,
          growth_rate_annual_avg
        FROM housing_dashboard.card_details
        WHERE level = 'state'
        AND state_code = '1'
        LIMIT 1
      `;
      params = [];
    } else {
      // Get LGA data
      query = `
        SELECT
          lga_name as name,
          area_sqkm,
          population as population_2026,
          population_2011,
          population_2016,
          population_2021,
          population_2024 as population_2026_proj,
          growth_rate_2011_2016,
          growth_rate_2016_2021,
          growth_rate_2021_2024 as growth_rate_2021_2026,
          growth_rate_annual_avg
        FROM housing_dashboard.card_details
        WHERE level = 'lga'
        AND lga_name = $1
        LIMIT 1
      `;
      params = [lgaName];
    }

    const result = await executeQuery(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No census data found for this LGA' },
        { status: 404 }
      );
    }

    const data = result.rows[0];

    // Calculate population density if we have both population and area
    let populationDensity = null;
    if (data.population_2026_proj && data.area_sqkm && data.area_sqkm > 0) {
      populationDensity = Math.round(data.population_2026_proj / data.area_sqkm);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        population_density: populationDensity
      }
    });

  } catch (error) {
    console.error('Error fetching census data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch census data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
