import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool } from '@/lib/db-pool';

interface RequestBody {
  lgaName: string;
  schema: string;
  table: string;
  lgaColumn: string;
  countryColumn?: string; // Column name for country (defaults to 'country_of_birth')
  valueColumn?: string; // Column name for value (defaults to 'value')
  limit?: number; // Number of top countries to return
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const {
      lgaName,
      schema,
      table,
      lgaColumn,
      countryColumn = 'country_of_birth',
      valueColumn = 'value',
      limit = 15
    } = body;

    const pool = getReadonlyPool();

    // Query for aggregated country of birth data
    // For tables with age/sex breakdown: Sum across all age groups and sexes
    // For aggregated tables: Use value directly
    const query = `
      SELECT
        ${countryColumn} as country_of_birth,
        SUM(${valueColumn}) as total
      FROM ${schema}.${table}
      WHERE ${lgaColumn} = $1
      GROUP BY ${countryColumn}
      ORDER BY total DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [lgaName, limit]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this LGA' },
        { status: 404 }
      );
    }

    // Also get the total population for percentage calculations
    const totalQuery = `
      SELECT SUM(${valueColumn}) as total_population
      FROM ${schema}.${table}
      WHERE ${lgaColumn} = $1
    `;

    const totalResult = await pool.query(totalQuery, [lgaName]);
    const totalPopulation = parseInt(totalResult.rows[0]?.total_population || 0);

    // Calculate Australia-born vs Overseas-born
    const australiaBornQuery = `
      SELECT SUM(${valueColumn}) as australia_born
      FROM ${schema}.${table}
      WHERE ${lgaColumn} = $1
        AND ${countryColumn} = 'Australia'
    `;

    const australiaBornResult = await pool.query(australiaBornQuery, [lgaName]);
    const australiaBorn = parseInt(australiaBornResult.rows[0]?.australia_born || 0);
    const overseasBorn = totalPopulation - australiaBorn;

    return NextResponse.json({
      success: true,
      data: result.rows.map(row => ({
        country: row.country_of_birth,
        total: parseInt(row.total),
        percentage: totalPopulation > 0
          ? ((parseInt(row.total) / totalPopulation) * 100).toFixed(1)
          : '0.0'
      })),
      summary: {
        totalPopulation,
        australiaBorn,
        overseasBorn,
        australiaPercentage: totalPopulation > 0
          ? ((australiaBorn / totalPopulation) * 100).toFixed(1)
          : '0.0',
        overseasPercentage: totalPopulation > 0
          ? ((overseasBorn / totalPopulation) * 100).toFixed(1)
          : '0.0'
      }
    });

  } catch (error) {
    console.error('Error fetching country of birth data:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch country of birth data',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
