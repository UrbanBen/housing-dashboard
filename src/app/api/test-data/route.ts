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
      connectionTimeoutMillis: 60000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();

  const { searchParams } = new URL(request.url);
  const schema = searchParams.get('schema') || 'housing_dashboard';
  const table = searchParams.get('table') || 'search';
  const column = searchParams.get('column') || 'lga_name24';
  const rowNumber = parseInt(searchParams.get('row') || '1');

  console.log(`[${requestId}] Test API Request Started:`, {
    schema, table, column, rowNumber,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.slice(0, 50)
  });

  try {
    console.log(`[${requestId}] Getting connection pool...`);
    const pool = getPool();

    console.log(`[${requestId}] Pool status:`, {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    });

    // Build dynamic query based on parameters
    const query = `
      SELECT ${column}
      FROM ${schema}.${table}
      ORDER BY ogc_fid
      LIMIT 1 OFFSET $1
    `;

    console.log(`[${requestId}] Executing query:`, {
      query: query.trim(),
      parameters: [rowNumber - 1],
      timeout: Date.now() - startTime + 'ms'
    });

    const queryStartTime = Date.now();
    const result = await pool.query(query, [rowNumber - 1]); // Convert to 0-based offset
    const queryDuration = Date.now() - queryStartTime;

    console.log(`[${requestId}] Query completed:`, {
      duration: queryDuration + 'ms',
      rowCount: result.rows.length,
      totalDuration: Date.now() - startTime + 'ms'
    });

    if (result.rows.length > 0) {
      const value = result.rows[0][column];

      console.log(`[${requestId}] Success response:`, {
        value: value?.toString().slice(0, 50) + (value?.toString().length > 50 ? '...' : ''),
        totalDuration: Date.now() - startTime + 'ms'
      });

      return NextResponse.json({
        success: true,
        data: {
          value: value,
          row: rowNumber,
          column: column,
          schema: schema,
          table: table,
          query: query.replace('$1', (rowNumber - 1).toString())
        },
        connection: {
          host: 'mecone-data-lake.postgres.database.azure.com',
          port: 5432,
          database: 'research&insights',
          user: 'db_admin',
          schema: schema,
          table: table
        },
        source: 'Azure PostgreSQL Database',
        diagnostics: {
          requestId: requestId,
          totalDuration: Date.now() - startTime,
          queryDuration: queryDuration,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `No data found at row ${rowNumber}`,
        connection: {
          host: 'mecone-data-lake.postgres.database.azure.com',
          port: 5432,
          database: 'research&insights',
          user: 'db_admin',
          schema: schema,
          table: table
        }
      }, { status: 404 });
    }

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    console.error(`[${requestId}] Test data query error (after ${errorDuration}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
      schema, table, column, rowNumber,
      totalDuration: errorDuration + 'ms'
    });

    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      connection: {
        host: 'mecone-data-lake.postgres.database.azure.com',
        port: 5432,
        database: 'research&insights',
        user: 'db_admin',
        schema: schema || 'housing_dashboard',
        table: table || 'search'
      },
      diagnostics: {
        requestId: requestId,
        totalDuration: errorDuration,
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : typeof error
      }
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