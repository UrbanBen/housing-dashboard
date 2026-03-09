import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lgaName } = body;

    if (!lgaName) {
      return NextResponse.json(
        { error: 'LGA name is required' },
        { status: 400 }
      );
    }

    const pool = getReadonlyPool();

    // Get all rent data for the selected LGA (most recent quarter)
    const query = `
      SELECT
        quarter,
        quarter_date,
        lga_name,
        dwelling_type,
        num_bedrooms,
        first_quartile_rent,
        median_rent,
        third_quartile_rent,
        new_bonds_lodged,
        total_bonds_held,
        quarterly_change_median_pct,
        annual_change_median_pct,
        quarterly_change_bonds_pct,
        annual_change_bonds_pct
      FROM housing_dashboard.median_weekly_rent
      WHERE lga_name = $1
        AND quarter_date = (
          SELECT MAX(quarter_date)
          FROM housing_dashboard.median_weekly_rent
        )
      ORDER BY
        CASE dwelling_type
          WHEN 'Total' THEN 1
          WHEN 'Houses' THEN 2
          WHEN 'Flats/Units' THEN 3
          WHEN 'Townhouses' THEN 4
          ELSE 5
        END,
        CASE num_bedrooms
          WHEN 'Total' THEN 1
          WHEN '1' THEN 2
          WHEN '2' THEN 3
          WHEN '3' THEN 4
          WHEN '4+' THEN 5
          ELSE 6
        END
    `;

    const result = await pool.query(query, [lgaName]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No rent data found for this LGA',
        data: []
      });
    }

    // Calculate summary statistics
    const totalRow = result.rows.find(
      r => r.dwelling_type === 'Total' && r.num_bedrooms === 'Total'
    );

    const summary = {
      quarter: result.rows[0].quarter,
      quarter_date: result.rows[0].quarter_date,
      lga_name: result.rows[0].lga_name,
      overall_median_rent: totalRow?.median_rent || null,
      overall_quarterly_change: totalRow?.quarterly_change_median_pct || null,
      overall_annual_change: totalRow?.annual_change_median_pct || null,
      total_new_bonds: totalRow?.new_bonds_lodged || null,
      total_bonds_held: totalRow?.total_bonds_held || null
    };

    // Group data by dwelling type and bedroom count
    const byDwellingType = result.rows.filter(
      r => r.num_bedrooms === 'Total' && r.dwelling_type !== 'Total'
    );

    const byBedroomCount = result.rows.filter(
      r => r.dwelling_type === 'Total' && r.num_bedrooms !== 'Total'
    );

    const byDwellingAndBedroom = result.rows.filter(
      r => r.dwelling_type !== 'Total' && r.num_bedrooms !== 'Total'
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      summary,
      byDwellingType,
      byBedroomCount,
      byDwellingAndBedroom
    });

  } catch (error) {
    console.error('Error fetching median rent data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch rent data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
