import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool, executeQuery } from '@/lib/db-pool';

interface RequestBody {
  lgaName: string;
  schema: string;
  table: string;
  lgaColumn: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { lgaName, schema, table, lgaColumn } = body;

    const pool = getReadonlyPool();

    // Query for age by sex data grouped by age
    const query = `
      SELECT
        age5p_age_in_five_year_groups as age,
        sexp_sex as sex,
        value as total
      FROM ${schema}.${table}
      WHERE ${lgaColumn} = $1
      ORDER BY age5p_age_in_five_year_groups, sexp_sex
    `;

    const result = await pool.query(query, [lgaName]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No data found for this LGA' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching age by sex data:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch age by sex data',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
