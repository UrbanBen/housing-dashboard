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

  try {
    let query: string;
    let params: any[] = [];

    if (lgaName) {
      // Query for specific LGA from available public tables
      query = `
        SELECT DISTINCT
          p.lga_name_2024,
          p.lga_code_2024,
          p.state_name_2024,
          COALESCE(ba.total_dwellings_approved, 0) as building_approvals,
          COALESCE(pop.population, 0) as population
        FROM abs_population_lga p
        LEFT JOIN abs_building_approvals_lga ba ON p.lga_code_2024 = ba.lga_code_2024
        WHERE UPPER(p.lga_name_2024) = UPPER($1)
        OR UPPER(p.lga_name_2024) LIKE UPPER($2)
        ORDER BY p.lga_name_2024
        LIMIT 1
      `;
      params = [lgaName, `%${lgaName}%`];
    } else {
      // Get all LGAs from population table (most comprehensive)
      query = `
        SELECT DISTINCT
          lga_name_2024,
          lga_code_2024,
          state_name_2024,
          population
        FROM abs_population_lga
        WHERE lga_name_2024 IS NOT NULL
        ORDER BY lga_name_2024
        LIMIT 200
      `;
    }

    console.log('Querying Mosaic_pro public schema:', query, params);

    const result = await pool.query(query, params);

    if (lgaName && result.rows.length > 0) {
      // Return single LGA
      const lga = result.rows[0];
      return NextResponse.json({
        lga: {
          name: lga.lga_name_2024,
          code: lga.lga_code_2024,
          state: lga.state_name_2024,
          population: lga.population,
          building_approvals: lga.building_approvals || 0
        },
        source: 'ABS Census 2024 - Mosaic_pro Database (Public Schema)',
        note: 'Boundary geometry not available with current permissions'
      });
    } else if (!lgaName) {
      // Return list of all LGAs
      const lgas = result.rows.map(row => ({
        name: row.lga_name_2024,
        code: row.lga_code_2024,
        state: row.state_name_2024,
        population: row.population
      }));

      return NextResponse.json({
        lgas,
        count: lgas.length,
        source: 'ABS Census 2024 - Mosaic_pro Database (Public Schema)',
        note: 'Boundary geometry not available with current permissions'
      });
    } else {
      return NextResponse.json({
        error: `No LGA found for: ${lgaName}`,
        source: 'ABS Census 2024 - Mosaic_pro Database'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error querying Mosaic_pro public schema:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch ABS Census 2024 data from Mosaic_pro',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}