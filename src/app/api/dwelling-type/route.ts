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

    // Query for dwelling type data with aggregation to handle potential duplicates
    const query = `
      SELECT
        dwtd_dwelling_type as dwelling_type,
        SUM(value) as value
      FROM ${schema}.${table}
      WHERE ${lgaColumn} = $1
      GROUP BY dwtd_dwelling_type
      ORDER BY dwtd_dwelling_type
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
    console.error('Error fetching dwelling type data:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch dwelling type data',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
