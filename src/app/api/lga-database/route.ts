import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Parse .env file to get password
function getPasswordFromEnv(envPath: string): string | null {
  try {
    // Resolve path with home directory support
    let resolvedPath = envPath;
    if (envPath.startsWith('~/')) {
      resolvedPath = path.join(os.homedir(), envPath.slice(2));
    }

    if (!fs.existsSync(resolvedPath)) {
      console.error('Env file not found:', resolvedPath);
      return null;
    }

    const content = fs.readFileSync(resolvedPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('POSTGRES_PASSWORD=')) {
        const value = trimmed.substring('POSTGRES_PASSWORD='.length);
        // Remove quotes if present
        return value.replace(/^["']|["']$/g, '');
      }
    }
  } catch (error) {
    console.error('Error reading env file:', error);
  }
  return null;
}

// Create PostgreSQL connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const password = getPasswordFromEnv('/users/ben/permissions/.env.admin');

    if (!password) {
      throw new Error('Failed to read database password from .env file');
    }

    pool = new Pool({
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: 'db_admin',
      password: password,
      ssl: {
        rejectUnauthorized: false // For Azure PostgreSQL
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      query_timeout: 30000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const lgaCode = searchParams.get('lgaCode');

  try {
    const pool = getPool();

    if (action === 'list') {
      // Get list of NSW LGAs for dropdown (code pattern 1xxxx for NSW)
      const query = `
        SELECT
          lga_code24 as code,
          lga_name24 as name
        FROM housing_dashboard.search
        WHERE lga_name24 IS NOT NULL
          AND lga_code24 LIKE '1%'
        ORDER BY lga_name24 ASC
      `;

      const result = await pool.query(query);

      return NextResponse.json({
        success: true,
        lgas: result.rows,
        source: 'Azure PostgreSQL Database'
      });
    } else if (action === 'details' && lgaCode) {
      // Get detailed information for selected LGA
      const query = `
        SELECT
          lga_code24 as code,
          lga_name24 as name,
          ST_AsGeoJSON(wkb_geometry) as geometry,
          areasqkm as area
        FROM housing_dashboard.search
        WHERE lga_code24 = $1
      `;

      const result = await pool.query(query, [lgaCode]);

      if (result.rows.length > 0) {
        const row = result.rows[0];

        return NextResponse.json({
          success: true,
          lga: {
            code: row.code,
            name: row.name,
            geometry: row.geometry ? JSON.parse(row.geometry) : null,
            area: row.area
          },
          source: 'Azure PostgreSQL Database'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'LGA not found'
        }, { status: 404 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action or missing parameters'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Clean up pool connections on shutdown
process.on('SIGINT', async () => {
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});