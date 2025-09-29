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
  const { searchParams } = new URL(request.url);
  const lgaName = searchParams.get('lga');
  const includeGeometry = searchParams.get('geometry') !== 'false';

  try {
    let query: string;
    let params: any[] = [];

    if (lgaName) {
      // Query for specific LGA with optional geometry
      if (includeGeometry) {
        query = `
          SELECT
            *,
            ST_AsGeoJSON(geom) as boundary_geojson,
            ST_X(ST_Centroid(geom)) as center_lng,
            ST_Y(ST_Centroid(geom)) as center_lat,
            ST_XMin(geom) as bbox_west,
            ST_XMax(geom) as bbox_east,
            ST_YMin(geom) as bbox_south,
            ST_YMax(geom) as bbox_north
          FROM boundaries.abs_census24_lga_4326
          WHERE UPPER(lga_name_2024) = UPPER($1)
          OR UPPER(lga_name_2024) LIKE UPPER($2)
          LIMIT 1
        `;
        params = [lgaName, `%${lgaName}%`];
      } else {
        query = `
          SELECT
            lga_code_2024,
            lga_name_2024,
            state_name_2024,
            area_albers_sqkm
          FROM boundaries.abs_census24_lga_4326
          WHERE UPPER(lga_name_2024) = UPPER($1)
          OR UPPER(lga_name_2024) LIKE UPPER($2)
          LIMIT 1
        `;
        params = [lgaName, `%${lgaName}%`];
      }
    } else {
      // Get all LGAs for listing (without geometry for performance)
      query = `
        SELECT
          lga_code_2024,
          lga_name_2024,
          state_name_2024,
          area_albers_sqkm
        FROM boundaries.abs_census24_lga_4326
        ORDER BY lga_name_2024
        LIMIT 200
      `;
    }

    console.log('Querying Mosaic_pro ABS Census 2024 data:', query, params);

    const result = await pool.query(query, params);

    if (lgaName && includeGeometry && result.rows.length > 0) {
      // Return single LGA with boundary
      const lga = result.rows[0];

      let boundary = null;
      if (lga.boundary_geojson) {
        try {
          boundary = JSON.parse(lga.boundary_geojson);
        } catch (e) {
          console.error('Error parsing boundary GeoJSON:', e);
        }
      }

      return NextResponse.json({
        boundaries: {
          name: lga.lga_name_2024,
          code: lga.lga_code_2024,
          state: lga.state_name_2024,
          area_sqkm: lga.area_albers_sqkm,
          boundary: boundary,
          center: [lga.center_lat, lga.center_lng] as [number, number],
          bounds: [
            [lga.bbox_south, lga.bbox_west],
            [lga.bbox_north, lga.bbox_east]
          ] as [[number, number], [number, number]]
        },
        source: 'ABS Census 2024 - Mosaic_pro Database'
      });
    } else if (lgaName && result.rows.length > 0) {
      // Return single LGA without boundary
      const lga = result.rows[0];
      return NextResponse.json({
        lga: {
          name: lga.lga_name_2024,
          code: lga.lga_code_2024,
          state: lga.state_name_2024,
          area_sqkm: lga.area_albers_sqkm
        },
        source: 'ABS Census 2024 - Mosaic_pro Database'
      });
    } else if (!lgaName) {
      // Return list of all LGAs
      const lgas = result.rows.map(row => ({
        name: row.lga_name_2024,
        code: row.lga_code_2024,
        state: row.state_name_2024,
        area_sqkm: row.area_albers_sqkm
      }));

      return NextResponse.json({
        lgas,
        count: lgas.length,
        source: 'ABS Census 2024 - Mosaic_pro Database'
      });
    } else {
      return NextResponse.json({
        error: `No LGA found for: ${lgaName}`,
        source: 'ABS Census 2024 - Mosaic_pro Database'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error querying Mosaic_pro ABS Census data:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ABS Census 2024 data from Mosaic_pro',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}