import { NextResponse } from 'next/server';

// ArcGIS REST service URLs for Australian LGA boundaries
const ARCGIS_LGA_BASE_URL = 'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/LGA/MapServer/0/query';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lgaName = searchParams.get('lga');
  const includeGeometry = searchParams.get('geometry') !== 'false';

  try {
    let query: string;
    let params: URLSearchParams;

    if (lgaName) {
      // Query for specific LGA with optional geometry
      if (includeGeometry) {
        // Fetch specific LGA with boundary geometry
        params = new URLSearchParams({
          where: `UPPER(lga_name_2021) LIKE UPPER('%${lgaName.replace(/'/g, "''")}%') AND state_name_2021='New South Wales'`,
          outFields: 'lga_code_2021,lga_name_2021,state_name_2021,area_albers_sqkm',
          returnGeometry: 'true',
          f: 'geojson',
          outSR: '4326',
          maxRecordCount: '1'
        });
      } else {
        // Fetch specific LGA without geometry (faster)
        params = new URLSearchParams({
          where: `UPPER(lga_name_2021) LIKE UPPER('%${lgaName.replace(/'/g, "''")}%') AND state_name_2021='New South Wales'`,
          outFields: 'lga_code_2021,lga_name_2021,state_name_2021,area_albers_sqkm',
          returnGeometry: 'false',
          f: 'json',
          maxRecordCount: '1'
        });
      }
    } else {
      // Get all NSW LGAs (without geometry for performance)
      params = new URLSearchParams({
        where: "state_name_2021='New South Wales'",
        outFields: 'lga_code_2021,lga_name_2021,state_name_2021,area_albers_sqkm',
        returnGeometry: 'false',
        f: 'json',
        orderByFields: 'lga_name_2021',
        maxRecordCount: '200'
      });
    }

    query = `${ARCGIS_LGA_BASE_URL}?${params.toString()}`;

    console.log('Querying ArcGIS ASGS2021 LGA service:', query);

    const response = await fetch(query, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Housing-Dashboard/1.0)',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`ArcGIS service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle ArcGIS error responses
    if (data.error) {
      throw new Error(`ArcGIS API error: ${data.error.message || 'Unknown error'}`);
    }

    if (lgaName && includeGeometry && data.features && data.features.length > 0) {
      // Return single LGA with boundary (GeoJSON format)
      const feature = data.features[0];
      const properties = feature.properties;

      // Calculate bounds from geometry if available
      let center: [number, number] = [-33.0, 147.0]; // Default NSW center
      let bounds: [[number, number], [number, number]] = [[-37.0, 141.0], [-28.5, 153.0]]; // Default NSW bounds

      if (feature.geometry && feature.geometry.type === 'Polygon') {
        // Calculate centroid and bounds from polygon
        const coordinates = feature.geometry.coordinates[0]; // First ring
        let minLng = Infinity, maxLng = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        let sumLng = 0, sumLat = 0;

        for (const coord of coordinates) {
          const [lng, lat] = coord;
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          sumLng += lng;
          sumLat += lat;
        }

        center = [sumLat / coordinates.length, sumLng / coordinates.length];
        bounds = [[minLat, minLng], [maxLat, maxLng]];
      } else if (feature.geometry && feature.geometry.type === 'MultiPolygon') {
        // Handle MultiPolygon - calculate from all rings
        const allCoords: number[][] = [];
        feature.geometry.coordinates.forEach((polygon: number[][][]) => {
          polygon[0].forEach((coord: number[]) => allCoords.push(coord));
        });

        if (allCoords.length > 0) {
          let minLng = Infinity, maxLng = -Infinity;
          let minLat = Infinity, maxLat = -Infinity;
          let sumLng = 0, sumLat = 0;

          for (const coord of allCoords) {
            const [lng, lat] = coord;
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            sumLng += lng;
            sumLat += lat;
          }

          center = [sumLat / allCoords.length, sumLng / allCoords.length];
          bounds = [[minLat, minLng], [maxLat, maxLng]];
        }
      }

      return NextResponse.json({
        boundaries: {
          name: properties.lga_name_2021,
          code: properties.lga_code_2021,
          state: properties.state_name_2021,
          area_sqkm: properties.area_albers_sqkm,
          boundary: feature.geometry,
          center: center,
          bounds: bounds
        },
        source: 'ABS ASGS2021 - ArcGIS REST Service'
      });
    } else if (lgaName && data.features && data.features.length > 0) {
      // Return single LGA without boundary (JSON format)
      const feature = data.features[0];
      const attributes = feature.attributes;

      return NextResponse.json({
        lga: {
          name: attributes.lga_name_2021,
          code: attributes.lga_code_2021,
          state: attributes.state_name_2021,
          area_sqkm: attributes.area_albers_sqkm
        },
        source: 'ABS ASGS2021 - ArcGIS REST Service'
      });
    } else if (!lgaName && data.features) {
      // Return list of all NSW LGAs
      const lgas = data.features.map((feature: any) => ({
        name: feature.attributes.lga_name_2021,
        code: feature.attributes.lga_code_2021,
        state: feature.attributes.state_name_2021,
        area_sqkm: feature.attributes.area_albers_sqkm
      }));

      return NextResponse.json({
        lgas,
        count: lgas.length,
        source: 'ABS ASGS2021 - ArcGIS REST Service'
      });
    } else {
      return NextResponse.json({
        error: lgaName ? `No LGA found for: ${lgaName}` : 'No LGAs found',
        source: 'ABS ASGS2021 - ArcGIS REST Service'
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error querying ArcGIS LGA service:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch LGA data from ArcGIS service',
        details: error instanceof Error ? error.message : 'Unknown error',
        service: 'ABS ASGS2021 - ArcGIS REST Service'
      },
      { status: 500 }
    );
  }
}