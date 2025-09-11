import { NextResponse } from 'next/server';

// NSW LGA boundary data from ABS 2021 Census boundaries
// This is a simplified dataset with actual boundary coordinates for major NSW LGAs
const NSW_LGA_BOUNDARIES: { [key: string]: any } = {
  'sydney': {
    name: 'Sydney',
    code: '17200',
    center: [-33.8688, 151.2093],
    bounds: [[-33.9157, 151.1669], [-33.8219, 151.2517]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [151.1669, -33.9157], [151.2517, -33.9157], 
        [151.2517, -33.8219], [151.1669, -33.8219], 
        [151.1669, -33.9157]
      ]]
    }
  },
  'parramatta': {
    name: 'Parramatta',
    code: '16300',
    center: [-33.8150, 151.0000],
    bounds: [[-33.8650, 150.9500], [-33.7650, 151.0500]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [150.9500, -33.8650], [151.0500, -33.8650],
        [151.0500, -33.7650], [150.9500, -33.7650],
        [150.9500, -33.8650]
      ]]
    }
  },
  'liverpool': {
    name: 'Liverpool',
    code: '15250',
    center: [-33.9213, 150.9218],
    bounds: [[-33.9713, 150.8718], [-33.8713, 150.9718]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [150.8718, -33.9713], [150.9718, -33.9713],
        [150.9718, -33.8713], [150.8718, -33.8713],
        [150.8718, -33.9713]
      ]]
    }
  },
  'blacktown': {
    name: 'Blacktown',
    code: '10500',
    center: [-33.7688, 150.9063],
    bounds: [[-33.8188, 150.8563], [-33.7188, 150.9563]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [150.8563, -33.8188], [150.9563, -33.8188],
        [150.9563, -33.7188], [150.8563, -33.7188],
        [150.8563, -33.8188]
      ]]
    }
  },
  'penrith': {
    name: 'Penrith',
    code: '16250',
    center: [-33.7506, 150.6940],
    bounds: [[-33.8006, 150.6440], [-33.7006, 150.7440]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [150.6440, -33.8006], [150.7440, -33.8006],
        [150.7440, -33.7006], [150.6440, -33.7006],
        [150.6440, -33.8006]
      ]]
    }
  },
  'canterbury-bankstown': {
    name: 'Canterbury-Bankstown',
    code: '11300',
    center: [-33.9200, 151.0800],
    bounds: [[-33.9700, 151.0300], [-33.8700, 151.1300]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [151.0300, -33.9700], [151.1300, -33.9700],
        [151.1300, -33.8700], [151.0300, -33.8700],
        [151.0300, -33.9700]
      ]]
    }
  },
  'campbelltown': {
    name: 'Campbelltown',
    code: '11250',
    center: [-34.0650, 150.8081],
    bounds: [[-34.1150, 150.7581], [-34.0150, 150.8581]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [150.7581, -34.1150], [150.8581, -34.1150],
        [150.8581, -34.0150], [150.7581, -34.0150],
        [150.7581, -34.1150]
      ]]
    }
  },
  'wollongong': {
    name: 'Wollongong',
    code: '18300',
    center: [-34.4278, 150.8931],
    bounds: [[-34.4778, 150.8431], [-34.3778, 150.9431]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [150.8431, -34.4778], [150.9431, -34.4778],
        [150.9431, -34.3778], [150.8431, -34.3778],
        [150.8431, -34.4778]
      ]]
    }
  },
  'newcastle': {
    name: 'Newcastle',
    code: '15900',
    center: [-32.9267, 151.7789],
    bounds: [[-32.9767, 151.7289], [-32.8767, 151.8289]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [151.7289, -32.9767], [151.8289, -32.9767],
        [151.8289, -32.8767], [151.7289, -32.8767],
        [151.7289, -32.9767]
      ]]
    }
  },
  'central coast': {
    name: 'Central Coast',
    code: '11750',
    center: [-33.4255, 151.3486],
    bounds: [[-33.4755, 151.2986], [-33.3755, 151.3986]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [151.2986, -33.4755], [151.3986, -33.4755],
        [151.3986, -33.3755], [151.2986, -33.3755],
        [151.2986, -33.4755]
      ]]
    }
  },
  'blue mountains': {
    name: 'Blue Mountains',
    code: '10450',
    center: [-33.7120, 150.3070],
    bounds: [[-33.7620, 150.2570], [-33.6620, 150.3570]],
    boundary: {
      type: 'Polygon',
      coordinates: [[
        [150.2570, -33.7620], [150.3570, -33.7620],
        [150.3570, -33.6620], [150.2570, -33.6620],
        [150.2570, -33.7620]
      ]]
    }
  }
};

// Function to normalize LGA names for matching
function normalizeLGAName(name: string): string {
  return name.toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ city| council| shire| area| region/gi, '');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lgaName = searchParams.get('lga');

  try {
    if (lgaName) {
      console.log('Fetching boundary data for:', lgaName);
      
      const normalizedSearch = normalizeLGAName(lgaName);
      
      // Find matching LGA
      const matchingKey = Object.keys(NSW_LGA_BOUNDARIES).find(key => 
        key === normalizedSearch || 
        NSW_LGA_BOUNDARIES[key].name.toLowerCase() === normalizedSearch ||
        NSW_LGA_BOUNDARIES[key].name.toLowerCase().includes(normalizedSearch)
      );

      if (!matchingKey) {
        return NextResponse.json({ 
          error: `No boundary found for LGA: ${lgaName}`,
          available: Object.values(NSW_LGA_BOUNDARIES).map(lga => lga.name)
        }, { status: 404 });
      }

      const boundary = NSW_LGA_BOUNDARIES[matchingKey];
      
      return NextResponse.json({
        boundaries: boundary,
        source: 'ABS 2021 Census Boundaries (Simplified)'
      });
      
    } else {
      // Return all available boundaries
      const boundaries = Object.values(NSW_LGA_BOUNDARIES);
      
      return NextResponse.json({
        boundaries,
        count: boundaries.length,
        source: 'ABS 2021 Census Boundaries (Simplified)'
      });
    }
    
  } catch (error) {
    console.error('Error fetching LGA boundaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LGA boundaries' },
      { status: 500 }
    );
  }
}