import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs';

// Connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    console.log('Initializing PostgreSQL connection pool for LGA Geometry...');

    // Read password from file if configured
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
            console.log('Password loaded from file for LGA Geometry');
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error reading password file for LGA Geometry:', error);
    }

    pool = new Pool({
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: 'db_admin',
      password: password,
      ssl: {
        rejectUnauthorized: false
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      query_timeout: 30000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
      pool = null;
    });
  }

  return pool;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const schema = searchParams.get('schema') || 'housing_dashboard';
  const table = searchParams.get('table') || 'search';
  const geometryColumn = searchParams.get('geometryColumn') || 'wkb_geometry';
  const lgaNameColumn = searchParams.get('lgaNameColumn') || 'lga_name24';
  const lgaName = searchParams.get('lgaName');

  const requestId = Math.random().toString(36).substr(2, 9);
  console.log(`[${requestId}] LGA Geometry API Request:`, {
    schema,
    table,
    geometryColumn,
    lgaNameColumn,
    lgaName,
    timestamp: new Date().toISOString()
  });

  if (!lgaName) {
    return NextResponse.json({
      success: false,
      error: 'LGA name is required'
    }, { status: 400 });
  }

  try {
    const pool = getPool();

    // Query to get the geometry data
    // Convert geometry to GeoJSON format for easier handling
    const query = `
      SELECT
        ${lgaNameColumn} as lga_name,
        COALESCE(lga_code24, '') as lga_code,
        ST_AsGeoJSON(${geometryColumn}) as geometry_geojson,
        ST_AsText(ST_Centroid(${geometryColumn})) as centroid,
        ST_Area(${geometryColumn}::geography) / 1000000 as area_km2,
        ST_XMin(ST_Envelope(${geometryColumn})) as bbox_west,
        ST_YMin(ST_Envelope(${geometryColumn})) as bbox_south,
        ST_XMax(ST_Envelope(${geometryColumn})) as bbox_east,
        ST_YMax(ST_Envelope(${geometryColumn})) as bbox_north
      FROM ${schema}.${table}
      WHERE ${lgaNameColumn} = $1
        AND ${geometryColumn} IS NOT NULL
      LIMIT 1
    `;

    console.log(`[${requestId}] Executing geometry query for LGA:`, lgaName);

    const result = await pool.query(query, [lgaName]);

    if (result.rows.length > 0) {
      const row = result.rows[0];

      // Parse the GeoJSON geometry
      let geometry = null;
      if (row.geometry_geojson) {
        try {
          geometry = JSON.parse(row.geometry_geojson);
        } catch (e) {
          console.error('Failed to parse geometry GeoJSON:', e);
        }
      }

      // Parse centroid coordinates
      let centroid = null;
      if (row.centroid) {
        const match = row.centroid.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
        if (match) {
          centroid = {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2])
          };
        }
      }

      console.log(`[${requestId}] Geometry found for LGA:`, {
        lgaName,
        hasGeometry: !!geometry,
        areaKm2: row.area_km2
      });

      return NextResponse.json({
        success: true,
        data: {
          lga_name: row.lga_name,
          lga_code: row.lga_code,
          geometry: geometry,
          centroid: centroid,
          area_km2: row.area_km2,
          bbox: {
            west: row.bbox_west,
            south: row.bbox_south,
            east: row.bbox_east,
            north: row.bbox_north
          }
        },
        connection: {
          host: 'mecone-data-lake.postgres.database.azure.com',
          port: 5432,
          database: 'research&insights',
          user: 'db_admin',
          schema,
          table
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `No geometry data found for LGA: ${lgaName}`
      });
    }

  } catch (error: any) {
    console.error(`[${requestId}] LGA Geometry API error:`, error);

    // Check if it's a PostGIS function error
    if (error.message && error.message.includes('ST_')) {
      return NextResponse.json({
        success: false,
        error: 'PostGIS extension may not be installed or geometry functions not available',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Database query failed',
      details: error.toString()
    }, { status: 500 });
  }
}