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
    // Check available schemas
    const schemasQuery = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name;
    `;

    const schemasResult = await pool.query(schemasQuery);

    // Check tables in each accessible schema
    const tablesQuery = `
      SELECT schemaname, tablename, tableowner
      FROM pg_tables
      WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      AND (tablename LIKE '%lga%' OR tablename LIKE '%census%' OR tablename LIKE '%abs%' OR tablename LIKE '%boundary%')
      ORDER BY schemaname, tablename;
    `;

    const tablesResult = await pool.query(tablesQuery);

    // Check current user permissions
    const userQuery = `SELECT current_user, current_database();`;
    const userResult = await pool.query(userQuery);

    return NextResponse.json({
      connection: 'successful',
      user: userResult.rows[0],
      available_schemas: schemasResult.rows,
      relevant_tables: tablesResult.rows,
      debug_info: {
        host: process.env.MOSAIC_PRO_HOST,
        database: process.env.MOSAIC_PRO_DATABASE,
        user: process.env.MOSAIC_PRO_USER,
        ssl_enabled: process.env.MOSAIC_PRO_SSL === 'true'
      }
    });

  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json(
      {
        error: 'Database connection or query failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug_info: {
          host: process.env.MOSAIC_PRO_HOST,
          database: process.env.MOSAIC_PRO_DATABASE,
          user: process.env.MOSAIC_PRO_USER,
          ssl_enabled: process.env.MOSAIC_PRO_SSL === 'true'
        }
      },
      { status: 500 }
    );
  }
}