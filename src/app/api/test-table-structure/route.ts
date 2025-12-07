import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableName = searchParams.get('table') || 'building_approvals_nsw_lga';

  let pool: Pool | null = null;

  try {
    // Read password from file
    let password = process.env.DATABASE_PASSWORD;

    try {
      const passwordPath = '/users/ben/permissions/.env.admin';
      if (fs.existsSync(passwordPath)) {
        const content = fs.readFileSync(passwordPath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;

          const match = trimmed.match(/^([A-Z_]*PASSWORD)\s*=\s*(.*)$/);
          if (match) {
            let value = match[2];
            value = value.replace(/^["']|["']$/g, '');
            password = value;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error reading password file:', error);
    }

    pool = new Pool({
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: 'db_admin',
      password: password,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Get table structure
    const structureQuery = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'housing_dashboard'
        AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    // Get sample data
    const sampleQuery = await pool.query(`
      SELECT *
      FROM housing_dashboard.${tableName}
      LIMIT 5
    `);

    return NextResponse.json({
      table: `housing_dashboard.${tableName}`,
      columns: structureQuery.rows,
      sample_data: sampleQuery.rows
    });

  } catch (error) {
    console.error('Table structure test error:', error);
    return NextResponse.json({
      error: 'Failed to get table structure',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
