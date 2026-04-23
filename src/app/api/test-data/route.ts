import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool, executeQuery } from '@/lib/db-pool';
import { createAPILogger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const logger = createAPILogger('/api/test-data', requestId);
  const startTime = Date.now();

  const { searchParams } = new URL(request.url);
  const schema = searchParams.get('schema') || 'housing_dashboard';
  const table = searchParams.get('table') || 'search';
  const column = searchParams.get('column') || 'lga_name24';
  const rowNumber = parseInt(searchParams.get('row') || '1');

  logger.info('Test API Request Started', {
    schema, table, column, rowNumber,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent')?.slice(0, 50)
  });

  try {
    logger.debug('Getting connection pool');
    const pool = getReadonlyPool();

    logger.debug('Pool status', {
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

    logger.debug('Executing query', {
      query: query.trim(),
      parameters: [rowNumber - 1],
      timeout: Date.now() - startTime + 'ms'
    });

    const queryStartTime = Date.now();
    const result = await pool.query(query, [rowNumber - 1]); // Convert to 0-based offset
    const queryDuration = Date.now() - queryStartTime;

    logger.debug('Query completed', {
      duration: queryDuration + 'ms',
      rowCount: result.rows.length,
      totalDuration: Date.now() - startTime + 'ms'
    });

    if (result.rows.length > 0) {
      const value = result.rows[0][column];

      logger.info('Success response', {
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
    logger.error('Test data query error', error instanceof Error ? error : new Error(String(error)), {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
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