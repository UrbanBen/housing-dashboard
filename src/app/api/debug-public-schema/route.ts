import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Mosaic_pro server connection configuration
const pool = new Pool({
  host: process.env.MOSAIC_PRO_HOST || 'localhost',
  port: parseInt(process.env.MOSAIC_PRO_PORT || '5432'),
  database: process.env.MOSAIC_PRO_DATABASE || 'mosaic_pro',
  user: process.env.MOSAIC_PRO_USER || 'postgres',
  password: process.env.MOSAIC_PRO_PASSWORD || '',
  ssl: process.env.MOSAIC_PRO_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: Request) {
  try {
    // Check column structure of key LGA tables
    const columnsQuery = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name IN ('abs_population_lga', 'abs_building_approvals_lga')
      ORDER BY table_name, ordinal_position;
    `;

    const columnsResult = await pool.query(columnsQuery);

    // Sample data from population table
    const sampleQuery = `
      SELECT * FROM abs_population_lga LIMIT 3;
    `;

    const sampleResult = await pool.query(sampleQuery);

    return NextResponse.json({
      columns: columnsResult.rows,
      sample_data: sampleResult.rows,
      table_count: sampleResult.rows.length
    });

  } catch (error) {
    console.error('Public schema debug error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze public schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}