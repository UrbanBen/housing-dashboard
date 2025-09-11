import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Look for tables that might contain LGA boundaries or geographic data
    const geographyTables = await query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND (
        column_name ILIKE '%geom%' 
        OR column_name ILIKE '%boundary%'
        OR column_name ILIKE '%shape%'
        OR column_name ILIKE '%polygon%'
        OR table_name ILIKE '%lga%'
        OR table_name ILIKE '%geography%'
        OR table_name ILIKE '%spatial%'
        OR table_name ILIKE '%geometry%'
      )
      ORDER BY table_name, column_name
    `);

    // Check specifically for LGA-related tables
    const lgaTables = await query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name ILIKE '%lga%'
      ORDER BY table_name
    `);

    // Check for NSW-specific geography tables
    const nswGeogTables = await query(`
      SELECT table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND (
        table_name ILIKE '%nsw%'
        OR table_name ILIKE '%cadastre%'
        OR table_name ILIKE '%planning%'
      )
      AND (
        table_name ILIKE '%geom%'
        OR table_name ILIKE '%geography%'
        OR table_name ILIKE '%spatial%'
      )
      ORDER BY table_name
    `);

    // Let's also peek at one of the LGA tables to see its structure
    let sampleLGAData = [];
    try {
      const sample = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'abs_building_approvals_lga'
        ORDER BY ordinal_position
      `);
      sampleLGAData = sample.rows;
    } catch (error) {
      console.warn('Could not get sample LGA table structure:', error);
    }

    // Check if PostGIS is available (geometry functions)
    let hasPostGIS = false;
    try {
      await query('SELECT PostGIS_Version()');
      hasPostGIS = true;
    } catch (error) {
      console.log('PostGIS not available or not accessible');
    }

    return NextResponse.json({
      geography_columns: geographyTables.rows,
      lga_tables: lgaTables.rows,
      nsw_geography_tables: nswGeogTables.rows,
      sample_lga_table_structure: sampleLGAData,
      postgis_available: hasPostGIS,
      analysis: {
        total_geography_columns: geographyTables.rows.length,
        total_lga_tables: lgaTables.rows.length,
        has_spatial_data: geographyTables.rows.length > 0,
        recommendations: geographyTables.rows.length > 0 
          ? "Found geographic columns! You likely have boundary data available."
          : "No obvious boundary columns found. Data might use coordinate pairs or external boundary files."
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Boundary exploration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}