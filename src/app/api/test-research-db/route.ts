import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  let pool: Pool | null = null;

  try {
    pool = new Pool({
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    const testQuery = await pool.query('SELECT current_database(), current_user');

    // Get schemas
    const schemasQuery = await pool.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);

    // Get tables from housing_dashboard schema
    const tablesQuery = await pool.query(`
      SELECT
        schemaname,
        tablename,
        tableowner
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'housing_dashboard'
      ORDER BY tablename
    `);

    return NextResponse.json({
      connection: 'successful',
      database: testQuery.rows[0],
      schemas: schemasQuery.rows,
      housing_dashboard_tables: tablesQuery.rows
    });

  } catch (error) {
    console.error('Research DB test error:', error);
    return NextResponse.json({
      error: 'Failed to connect to research&insights database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
