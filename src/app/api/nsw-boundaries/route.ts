import { NextResponse } from 'next/server';

const NSW_SPATIAL_BASE_URL = 'https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Administrative_Boundaries_Theme_multiCRS/FeatureServer/8';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lgaName = searchParams.get('lga');
  const includeGeometry = searchParams.get('geometry') !== 'false';

  try {
    let queryUrl: string;
    
    if (lgaName) {
      // Query for specific LGA with geometry - use case-insensitive search
      const whereClause = `UPPER(lganame)='${lgaName.toUpperCase()}' OR UPPER(councilname) LIKE '%${lgaName.toUpperCase()}%'`;
      queryUrl = `${NSW_SPATIAL_BASE_URL}/query?` + new URLSearchParams({
        where: whereClause,
        outFields: 'cadid,lganame,councilname,abscode,urbanity,Shape__Area,Shape__Length',
        returnGeometry: includeGeometry.toString(),
        f: includeGeometry ? 'geojson' : 'json',
        outSR: '4326' // WGS84 for web mapping
      }).toString();
    } else {
      // Get all LGAs without geometry for listing
      queryUrl = `${NSW_SPATIAL_BASE_URL}/query?` + new URLSearchParams({
        where: '1=1',
        outFields: 'lganame,councilname,abscode,urbanity',
        returnGeometry: 'false',
        f: 'json',
        resultRecordCount: '200'
      }).toString();
    }

    console.log('Querying NSW Spatial:', queryUrl);
    
    const response = await fetch(queryUrl, {
      headers: {
        'User-Agent': 'Housing-Insights-Dashboard/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`NSW Spatial API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (lgaName && includeGeometry) {
      // Return GeoJSON for mapping
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        
        // Extract center point from geometry bounds
        const geometry = feature.geometry;
        let center: [number, number] = [-33.8688, 151.2093]; // Default to Sydney
        let bounds: [[number, number], [number, number]] = [[-34.5, 150.5], [-33.0, 152.0]];
        
        if (geometry && geometry.type === 'Polygon' && geometry.coordinates && geometry.coordinates[0]) {
          const coords = geometry.coordinates[0];
          const lats = coords.map((c: number[]) => c[1]);
          const lngs = coords.map((c: number[]) => c[0]);
          
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          
          center = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
          bounds = [[minLat, minLng], [maxLat, maxLng]];
        }

        return NextResponse.json({
          boundaries: {
            name: feature.properties.lganame || feature.properties.councilname,
            code: feature.properties.abscode,
            urbanity: feature.properties.urbanity,
            boundary: geometry,
            center: center,
            bounds: bounds,
            area: feature.properties.Shape__Area,
            length: feature.properties.Shape__Length
          },
          source: 'NSW Spatial Services - Official Administrative Boundaries'
        });
      } else {
        return NextResponse.json({ 
          error: `No boundary found for LGA: ${lgaName}`,
          source: 'NSW Spatial Services'
        }, { status: 404 });
      }
    } else {
      // Return list of LGAs
      const lgas = data.features?.map((feature: any) => ({
        name: feature.attributes.lganame,
        council: feature.attributes.councilname,
        code: feature.attributes.abscode,
        urbanity: feature.attributes.urbanity
      })) || [];

      return NextResponse.json({
        lgas,
        count: lgas.length,
        source: 'NSW Spatial Services - Official Administrative Boundaries'
      });
    }

  } catch (error) {
    console.error('Error fetching NSW boundary data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch boundary data from NSW Spatial Services',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}