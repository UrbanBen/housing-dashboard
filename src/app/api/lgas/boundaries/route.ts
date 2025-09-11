import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lgaName = searchParams.get('lga');
  
  if (!lgaName) {
    return NextResponse.json({
      error: 'LGA name parameter is required'
    }, { status: 400 });
  }

  try {
    // First, let's explore what we have in the planning proposals geometry table
    const structureResult = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'nsw_planning_proposals_geometry'
      ORDER BY ordinal_position
    `);

    // Get a sample of data to see what columns might relate to LGAs
    const sampleResult = await query(`
      SELECT *
      FROM nsw_planning_proposals_geometry 
      LIMIT 5
    `);

    // For now, let's also check if there are any other geometry tables that might have LGA boundaries
    const geometryTablesResult = await query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name ILIKE '%lga%'
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = tables.table_name 
        AND data_type = 'USER-DEFINED'
      )
    `);

    // Let's also check if we have any direct LGA geometry table
    let lgaBoundary = null;
    try {
      // This is speculative - there might be an LGA boundaries table we haven't found yet
      const boundaryResult = await query(`
        SELECT ST_AsGeoJSON(geom) as geometry
        FROM nsw_planning_proposals_geometry 
        WHERE is_lga = true 
        LIMIT 1
      `);
      
      if (boundaryResult.rows.length > 0) {
        lgaBoundary = JSON.parse(boundaryResult.rows[0].geometry);
      }
    } catch (error) {
      console.log('No direct LGA boundary found, that\'s expected');
    }

    return NextResponse.json({
      lga_name: lgaName,
      structure: structureResult.rows,
      sample_data: sampleResult.rows,
      geometry_tables_with_lga: geometryTablesResult.rows,
      sample_boundary: lgaBoundary,
      message: lgaBoundary ? 'Found boundary data' : 'No boundary found - may need to generate from cadastre data'
    });

  } catch (error) {
    console.error('Boundary fetch error:', error);
    return NextResponse.json({
      error: 'Failed to fetch boundary data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}