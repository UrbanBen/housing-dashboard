import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const pool = getReadonlyPool();

  try {
    const body = await request.json();
    const { lgaName, lgaCode } = body;

    if (!lgaName && !lgaCode) {
      return NextResponse.json(
        { success: false, error: 'LGA name or code is required' },
        { status: 400 }
      );
    }

    // Build WHERE clause for LGA matching
    const lgaCondition = lgaCode
      ? `lga_code_2021 = $1`
      : `lga_name_2021 ILIKE $1`;
    const lgaValue = lgaCode || lgaName;

    // Query all three census years
    const query2011 = `
      SELECT
        '2011' as year,
        lga_name_2021,
        lga_code_2021,
        australian_citizenship as category,
        value_mapped_to_21 as value
      FROM s12_census.cen11_australian_citizenship_lga
      WHERE ${lgaCondition}
      ORDER BY value_mapped_to_21 DESC;
    `;

    const query2016 = `
      SELECT
        '2016' as year,
        lga_name_2021,
        lga_code_2021,
        australian_citizenship as category,
        value_mapped_to_21 as value
      FROM s12_census.cen16_australian_citizenship_lga
      WHERE ${lgaCondition}
      ORDER BY value_mapped_to_21 DESC;
    `;

    const query2021 = `
      SELECT
        '2021' as year,
        lga_name_2021,
        lga_code_2021,
        citp_australian_citizenship as category,
        value
      FROM s12_census.cen21_australian_citizenship_lga
      WHERE ${lgaCondition}
      ORDER BY value DESC;
    `;

    const [result2011, result2016, result2021] = await Promise.all([
      pool.query(query2011, [lgaValue]),
      pool.query(query2016, [lgaValue]),
      pool.query(query2021, [lgaValue])
    ]);

    if (result2011.rows.length === 0 && result2016.rows.length === 0 && result2021.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No citizenship data found for this LGA'
      }, { status: 404 });
    }

    // Normalize category names
    const normalizeCategory = (category: string): string => {
      if (category === 'Australian' || category === 'Australian Citizen') {
        return 'Australian Citizen';
      } else if (category === 'Not Australian' || category === 'Not an Australian Citizen') {
        return 'Not an Australian Citizen';
      } else {
        return 'Not stated';
      }
    };

    // Process data for each year
    const processYearData = (rows: any[]) => {
      const data: { [key: string]: number } = {
        'Australian Citizen': 0,
        'Not an Australian Citizen': 0,
        'Not stated': 0
      };

      rows.forEach(row => {
        const category = normalizeCategory(row.category);
        data[category] = Math.round(row.value);
      });

      const total = Object.values(data).reduce((sum, val) => sum + val, 0);
      const citizenPercentage = total > 0 ? ((data['Australian Citizen'] / total) * 100).toFixed(1) : '0';

      return {
        categories: data,
        total,
        citizenPercentage: parseFloat(citizenPercentage)
      };
    };

    const data2011 = processYearData(result2011.rows);
    const data2016 = processYearData(result2016.rows);
    const data2021 = processYearData(result2021.rows);

    // Build trend data for line chart
    const trendData = [
      {
        year: '2011',
        'Australian Citizen': data2011.categories['Australian Citizen'],
        'Not an Australian Citizen': data2011.categories['Not an Australian Citizen'],
        'Not stated': data2011.categories['Not stated'],
        total: data2011.total
      },
      {
        year: '2016',
        'Australian Citizen': data2016.categories['Australian Citizen'],
        'Not an Australian Citizen': data2016.categories['Not an Australian Citizen'],
        'Not stated': data2016.categories['Not stated'],
        total: data2016.total
      },
      {
        year: '2021',
        'Australian Citizen': data2021.categories['Australian Citizen'],
        'Not an Australian Citizen': data2021.categories['Not an Australian Citizen'],
        'Not stated': data2021.categories['Not stated'],
        total: data2021.total
      }
    ];

    // Get LGA details from most recent data
    const lgaDetails = result2021.rows[0] || result2016.rows[0] || result2011.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        lga_name: lgaDetails.lga_name_2021,
        lga_code: lgaDetails.lga_code_2021,
        current: data2021, // Most recent data for donut chart
        historical: {
          2011: data2011,
          2016: data2016,
          2021: data2021
        },
        trend: trendData, // Time series for line chart
        summary: {
          currentCitizenPercentage: data2021.citizenPercentage,
          change2016to2021: (data2021.citizenPercentage - data2016.citizenPercentage).toFixed(1),
          change2011to2021: (data2021.citizenPercentage - data2011.citizenPercentage).toFixed(1),
          totalPopulation2021: data2021.total,
          populationGrowth2011to2021: data2021.total - data2011.total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching citizenship data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
