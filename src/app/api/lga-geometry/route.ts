import { NextRequest, NextResponse } from 'next/server';
import { getReadonlyPool, executeQuery } from '@/lib/db-pool';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const schema = searchParams.get('schema') || 'housing_dashboard';
  const table = searchParams.get('table') || 'search';
  const geometryColumn = searchParams.get('geometryColumn') || 'wkb_geometry';
  const lgaNameColumn = searchParams.get('lgaNameColumn') || 'lga_name24';
  const lgaName = searchParams.get('lgaName');
  const simplifyTolerance = searchParams.get('simplifyTolerance') || '0.01'; // Default 0.01 degrees (~1km)

  // List of Australian states/territories that need simplification
  const statesAndTerritories = [
    'New South Wales',
    'Victoria',
    'Queensland',
    'South Australia',
    'Western Australia',
    'Tasmania',
    'Northern Territory',
    'Australian Capital Territory'
  ];

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
    const pool = getReadonlyPool();

    // Determine if this is a state/territory that needs simplification
    const isState = lgaName ? statesAndTerritories.includes(lgaName) : false;

    // Query to get the geometry data
    // Convert geometry to GeoJSON format for easier handling
    // Use ST_Simplify to reduce coordinate count for large geometries (like states)
    // Keep LGA boundaries at full detail
    const geometryExpression = isState
      ? `ST_Simplify(${geometryColumn}, $2)`
      : geometryColumn;

    const query = `
      SELECT
        ${lgaNameColumn} as lga_name,
        COALESCE(lga_code24, '') as lga_code,
        ST_AsGeoJSON(${geometryExpression}) as geometry_geojson,
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

    console.log(`[${requestId}] Executing geometry query for:`, lgaName);
    console.log(`[${requestId}] Is state/territory:`, isState);
    if (isState) {
      console.log(`[${requestId}] Simplification tolerance:`, simplifyTolerance);
    }

    const result = isState
      ? await pool.query(query, [lgaName, parseFloat(simplifyTolerance)])
      : await pool.query(query, [lgaName]);

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
          user: 'mosaic_readonly',
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