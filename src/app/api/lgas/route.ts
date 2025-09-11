import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Get all unique LGA names from the housing targets table
    const lgasResult = await query(`
      SELECT DISTINCT 
        lga_name,
        housing_target_5_year
      FROM nsw_lga_housing_targets 
      WHERE lga_name IS NOT NULL 
      ORDER BY lga_name
    `);

    // Get LGA codes and recent building approvals data
    const codesResult = await query(`
      SELECT DISTINCT lga_code
      FROM abs_building_approvals_lga 
      ORDER BY lga_code
    `);

    // Get population data for codes we have
    const populationResult = await query(`
      SELECT 
        lga_code,
        value as population,
        year
      FROM abs_population_lga 
      WHERE year = (SELECT MAX(year) FROM abs_population_lga)
      ORDER BY lga_code
    `);

    // Create a map of LGA codes to population data
    const populationMap = new Map();
    populationResult.rows.forEach((row: any) => {
      populationMap.set(row.lga_code.toString(), {
        population: row.population,
        year: row.year
      });
    });

    // Combine the data and format for the frontend
    const lgas = lgasResult.rows.map((lga: any, index: number) => {
      // For now, we'll create simple IDs based on LGA names
      // In production, you'd want to map these to proper ABS codes
      const id = lga.lga_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      return {
        id: id,
        name: lga.lga_name,
        population: null, // We'd need proper mapping to get population data
        populationYear: null,
        housingTarget: lga.housing_target_5_year,
        region: determineRegion(lga.lga_name)
      };
    });

    return NextResponse.json({
      success: true,
      lgas: lgas,
      total: lgas.length,
      message: `Found ${lgas.length} NSW Local Government Areas`
    });

  } catch (error) {
    console.error('LGA fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch LGA data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper function to determine region based on LGA name
function determineRegion(lgaName: string): string {
  const name = lgaName.toLowerCase();
  
  // Sydney Metro
  if (name.includes('sydney') || name.includes('parramatta') || name.includes('blacktown') || 
      name.includes('penrith') || name.includes('liverpool') || name.includes('campbelltown') ||
      name.includes('fairfield') || name.includes('canterbury') || name.includes('bankstown') ||
      name.includes('sutherland') || name.includes('hornsby') || name.includes('ku-ring-gai') ||
      name.includes('northern beaches') || name.includes('north sydney') || name.includes('willoughby') ||
      name.includes('lane cove') || name.includes('ryde') || name.includes('hunters hill') ||
      name.includes('mosman') || name.includes('warringah') || name.includes('pittwater') ||
      name.includes('manly') || name.includes('strathfield') || name.includes('canada bay') ||
      name.includes('inner west') || name.includes('randwick') || name.includes('waverley') ||
      name.includes('woollahra') || name.includes('bayside') || name.includes('georges river')) {
    return 'Sydney Metro';
  }
  
  // Hunter
  if (name.includes('newcastle') || name.includes('lake macquarie') || name.includes('maitland') ||
      name.includes('cessnock') || name.includes('port stephens') || name.includes('singleton') ||
      name.includes('muswellbrook') || name.includes('upper hunter')) {
    return 'Hunter';
  }
  
  // Central Coast
  if (name.includes('central coast') || name.includes('gosford') || name.includes('wyong')) {
    return 'Central Coast';
  }
  
  // Illawarra
  if (name.includes('wollongong') || name.includes('shellharbour') || name.includes('kiama') ||
      name.includes('shoalhaven')) {
    return 'Illawarra';
  }
  
  // Blue Mountains
  if (name.includes('blue mountains')) {
    return 'Sydney Metro'; // Often considered part of Greater Sydney
  }
  
  // Defaults for regional areas
  if (name.includes('far north') || name.includes('northern rivers')) {
    return 'Northern Rivers';
  }
  
  if (name.includes('mid north') || name.includes('port macquarie')) {
    return 'Mid North Coast';
  }
  
  if (name.includes('south coast')) {
    return 'South Coast';
  }
  
  if (name.includes('western') || name.includes('dubbo') || name.includes('orange') || 
      name.includes('bathurst')) {
    return 'Central West';
  }
  
  if (name.includes('riverina') || name.includes('wagga') || name.includes('griffith')) {
    return 'Riverina';
  }
  
  if (name.includes('far west') || name.includes('broken hill')) {
    return 'Far West';
  }
  
  if (name.includes('new england') || name.includes('armidale') || name.includes('tamworth')) {
    return 'New England';
  }
  
  // Default to Regional NSW for unclassified areas
  return 'Regional NSW';
}