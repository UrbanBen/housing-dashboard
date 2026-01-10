import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool, executeQuery } from '@/lib/db-pool';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`[${requestId}] Test Search API Request:`, {
    action,
    params: Object.fromEntries(searchParams.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    const pool = getReadonlyPool();

    if (action === 'getLGAs') {
      // Get all LGAs from NSW
      const schema = searchParams.get('schema') || 'housing_dashboard';
      const table = searchParams.get('table') || 'search';
      const stateColumn = searchParams.get('state_column') || 'ste_name21';
      const stateValue = searchParams.get('state_value') || 'New South Wales';
      const lgaColumn = searchParams.get('lga_column') || 'lga_name24';

      const query = `
        SELECT DISTINCT
          ${lgaColumn} as lga_name,
          COALESCE(lga_code24, '') as lga_code
        FROM ${schema}.${table}
        WHERE ${stateColumn} = $1
          AND ${lgaColumn} IS NOT NULL
        ORDER BY ${lgaColumn}
      `;

      console.log(`[${requestId}] Executing LGA query:`, { query, stateValue });

      const result = await pool.query(query, [stateValue]);

      console.log(`[${requestId}] Found ${result.rows.length} LGAs`);

      return NextResponse.json({
        success: true,
        data: result.rows,
        connection: {
          host: 'mecone-data-lake.postgres.database.azure.com',
          port: 5432,
          database: 'research&insights',
          user: 'db_admin',
          schema,
          table
        }
      });

    } else if (action === 'getDataForLGA') {
      // Get data for specific LGA
      const schema = searchParams.get('schema') || 'housing_dashboard';
      const table = searchParams.get('table') || 'search';
      const column = searchParams.get('column') || 'lga_name24';
      const lgaValue = searchParams.get('lga_value');

      if (!lgaValue) {
        return NextResponse.json({
          success: false,
          error: 'LGA value is required'
        }, { status: 400 });
      }

      // Get the first row of data for this LGA
      const query = `
        SELECT *
        FROM ${schema}.${table}
        WHERE ${column} = $1
        LIMIT 1
      `;

      console.log(`[${requestId}] Executing data query for LGA:`, { query, lgaValue });

      const result = await pool.query(query, [lgaValue]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        // Return some meaningful data from the row
        const valueColumn = Object.keys(row).find(key =>
          key.includes('population') ||
          key.includes('count') ||
          key.includes('total')
        ) || Object.keys(row)[0];

        console.log(`[${requestId}] Data found for LGA:`, { lgaValue, valueColumn });

        return NextResponse.json({
          success: true,
          data: {
            value: row[valueColumn] || 'N/A',
            column: valueColumn,
            row: 1,
            schema,
            table,
            query: query.replace('$1', `'${lgaValue}'`)
          },
          connection: {
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'mosaic_readonly',
            schema,
            table
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `No data found for LGA: ${lgaValue}`
        });
      }

    } else if (action === 'getAreaData') {
      // Get area data for specific LGA
      const schema = searchParams.get('schema') || 'housing_dashboard';
      const table = searchParams.get('table') || 'search';
      const areaColumn = searchParams.get('areaColumn') || 'areasqkm';
      const lgaNameColumn = searchParams.get('lgaNameColumn') || 'lga_name24';
      const lgaName = searchParams.get('lgaName');

      if (!lgaName) {
        return NextResponse.json({
          success: false,
          error: 'LGA name is required'
        }, { status: 400 });
      }

      const query = `
        SELECT
          ${lgaNameColumn} as lga_name,
          ${areaColumn} as area_sqkm
        FROM ${schema}.${table}
        WHERE ${lgaNameColumn} = $1
          AND ${areaColumn} IS NOT NULL
        LIMIT 1
      `;

      console.log(`[${requestId}] Executing area query for LGA:`, { query, lgaName });

      const result = await pool.query(query, [lgaName]);

      if (result.rows.length > 0) {
        const row = result.rows[0];

        console.log(`[${requestId}] Area data found for LGA:`, { lgaName, area: row.area_sqkm });

        return NextResponse.json({
          success: true,
          data: {
            lga_name: row.lga_name,
            area_sqkm: parseFloat(row.area_sqkm) || 0
          },
          connection: {
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'mosaic_readonly',
            schema,
            table
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `No area data found for LGA: ${lgaName}`,
          connection: {
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'mosaic_readonly',
            schema,
            table
          }
        });
      }

    } else if (action === 'getAccordTargetData') {
      // Get accord target data for specific LGA
      const schema = searchParams.get('schema') || 'housing_dashboard';
      const table = searchParams.get('table') || 'search';
      const accordTargetColumn = searchParams.get('accordTargetColumn') || 'accord_target';
      const lgaNameColumn = searchParams.get('lgaNameColumn') || 'lga_name24';
      const lgaName = searchParams.get('lgaName');

      if (!lgaName) {
        return NextResponse.json({
          success: false,
          error: 'LGA name is required'
        }, { status: 400 });
      }

      const query = `
        SELECT
          ${lgaNameColumn} as lga_name,
          ${accordTargetColumn} as accord_target
        FROM ${schema}.${table}
        WHERE ${lgaNameColumn} = $1
        LIMIT 1
      `;

      console.log(`[${requestId}] Executing accord target query for LGA:`, { query, lgaName });

      const result = await pool.query(query, [lgaName]);

      if (result.rows.length > 0) {
        const row = result.rows[0];

        console.log(`[${requestId}] Accord target data found for LGA:`, { lgaName, accordTarget: row.accord_target });

        return NextResponse.json({
          success: true,
          data: {
            lga_name: row.lga_name,
            accord_target: row.accord_target ? parseFloat(row.accord_target) : null
          },
          connection: {
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'mosaic_readonly',
            schema,
            table
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `No accord target data found for LGA: ${lgaName}`,
          connection: {
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'mosaic_readonly',
            schema,
            table
          }
        });
      }

    } else if (action === 'getBuildingApprovalsData') {
      // Get building approvals data from abs_nsw_lga_fytd table
      const schema = searchParams.get('schema') || 'housing_dashboard';
      const table = searchParams.get('table') || 'abs_nsw_lga_fytd';
      const lgaNameColumn = searchParams.get('lgaNameColumn') || 'lga_name';
      const lgaName = searchParams.get('lgaName');

      if (!lgaName) {
        return NextResponse.json({
          success: false,
          error: 'LGA name is required'
        }, { status: 400 });
      }

      // Check if this is state-wide request
      const isStateWide = lgaName.toLowerCase().includes('state-wide') ||
                         lgaName.toLowerCase() === 'new south wales';

      let query: string;
      let queryParams: any[];

      if (isStateWide) {
        // Aggregate all LGAs for state-wide view
        // Cast to numeric since columns might be stored as text
        // Remove commas and convert empty strings to NULL before casting
        // Filter to only numeric data rows (digits and commas)
        query = `
          SELECT
            'New South Wales' as lga_name,
            SUM(CAST(REPLACE(NULLIF(total_dwellings, ''), ',', '') AS NUMERIC)) as total_dwellings,
            SUM(CAST(REPLACE(NULLIF(new_houses, ''), ',', '') AS NUMERIC)) as new_houses,
            SUM(CAST(REPLACE(NULLIF(new_other, ''), ',', '') AS NUMERIC)) as new_other,
            SUM(CAST(REPLACE(NULLIF(value_total_res, ''), ',', '') AS NUMERIC)) as value_total_res
          FROM ${schema}.${table}
          WHERE total_dwellings ~ '^[0-9,]+\.?[0-9]*$'
        `;
        queryParams = [];
      } else {
        // Get data for specific LGA
        // Cast to numeric and remove commas for consistency
        // Use ILIKE for case-insensitive pattern matching
        // Quote column names to handle case-sensitive names like "Column2"
        const quotedLgaColumn = lgaNameColumn.includes('"') ? lgaNameColumn : `"${lgaNameColumn}"`;
        query = `
          SELECT
            ${quotedLgaColumn} as lga_name,
            CAST(REPLACE(NULLIF(total_dwellings, ''), ',', '') AS NUMERIC) as total_dwellings,
            CAST(REPLACE(NULLIF(new_houses, ''), ',', '') AS NUMERIC) as new_houses,
            CAST(REPLACE(NULLIF(new_other, ''), ',', '') AS NUMERIC) as new_other,
            CAST(REPLACE(NULLIF(value_total_res, ''), ',', '') AS NUMERIC) as value_total_res
          FROM ${schema}.${table}
          WHERE ${quotedLgaColumn} ILIKE $1
            AND total_dwellings ~ '^[0-9,]+\.?[0-9]*$'
          LIMIT 1
        `;
        queryParams = [`%${lgaName}%`];
      }

      console.log(`[${requestId}] Executing building approvals query:`, {
        query,
        lgaName,
        isStateWide
      });

      const result = await pool.query(query, queryParams);

      if (result.rows.length > 0) {
        const row = result.rows[0];

        console.log(`[${requestId}] Building approvals data found:`, {
          lgaName,
          totalDwellings: row.total_dwellings,
          newHouses: row.new_houses,
          newOther: row.new_other,
          valueTotalRes: row.value_total_res
        });

        return NextResponse.json({
          success: true,
          data: {
            lga_name: row.lga_name,
            total_dwellings: row.total_dwellings !== null ? Number(row.total_dwellings) : null,
            new_houses: row.new_houses !== null ? Number(row.new_houses) : null,
            new_other: row.new_other !== null ? Number(row.new_other) : null,
            value_total_res: row.value_total_res !== null ? Number(row.value_total_res) : null
          },
          connection: {
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'mosaic_readonly',
            schema,
            table
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `No building approvals data found for LGA: ${lgaName}`,
          connection: {
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'mosaic_readonly',
            schema,
            table
          }
        });
      }

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action parameter'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error(`[${requestId}] Test Search API error:`, error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Database query failed',
      details: error.toString()
    }, { status: 500 });
  }
}