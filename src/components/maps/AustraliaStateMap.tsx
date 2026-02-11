"use client";

import React, { useEffect, useState } from 'react';

interface AustraliaStateMapProps {
  selectedState: string;
  onStateClick: (stateName: string) => void;
}

interface StateFeature {
  type: string;
  properties: {
    STATE_NAME: string;
    STATE_CODE: string;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}

export function AustraliaStateMap({ selectedState, onStateClick }: AustraliaStateMapProps) {
  const [geoJSON, setGeoJSON] = useState<any>(null);
  const [svgPaths, setSvgPaths] = useState<Map<string, string>>(new Map());
  const [nswIslandPath, setNswIslandPath] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Detect theme changes
  useEffect(() => {
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Theme-specific colors
  const colors = isDarkMode ? {
    background: '#000000',
    unselectedFill: '#090909',
    unselectedStroke: '#22c55e',
    selectedFill: '#22c55e',
    selectedStroke: '#22c55e',
    hoverFill: '#22c55e',
    hoverStroke: '#22c55e',
    textFill: '#22c55e'
  } : {
    background: '#FAFBF0',
    unselectedFill: '#f5f5dc',
    unselectedStroke: '#223222',
    selectedFill: '#223222',
    selectedStroke: '#223222',
    hoverFill: '#8b9d83',
    hoverStroke: '#223222',
    textFill: '#223222'
  };

  useEffect(() => {
    // Load GeoJSON from public folder (with cache busting)
    fetch(`/australia-states.geojson?v=7`)
      .then(res => res.json())
      .then(data => {
        setGeoJSON(data);

        // Convert GeoJSON to SVG paths
        const paths = new Map<string, string>();
        const viewBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

        data.features.forEach((feature: StateFeature) => {
          const stateName = feature.properties.STATE_NAME;
          const coords = feature.geometry.coordinates;

          // Special handling for NSW to separate island
          if (stateName === 'New South Wales' && coords[0][0][0] instanceof Array) {
            // MultiPolygon - separate mainland from island
            const polygons = coords.map((polygon: number[][][], index: number) => {
              return {
                index,
                polygon,
                area: calculatePolygonArea(polygon)
              };
            });

            // Sort by area (largest first)
            polygons.sort((a: any, b: any) => b.area - a.area);

            // First polygon is mainland, second is island
            const mainlandPath = polygonToPath(polygons[0].polygon, viewBox);
            const islandPath = polygons.length > 1 ? polygonToPath(polygons[1].polygon, viewBox) : '';

            paths.set(stateName, mainlandPath);
            setNswIslandPath(islandPath);
          } else {
            // Build SVG path from coordinates
            const pathData = coordsToPath(coords, viewBox);
            paths.set(stateName, pathData);
          }
        });

        setSvgPaths(paths);
      })
      .catch(err => console.error('Error loading GeoJSON:', err));
  }, []);

  // Calculate approximate area of a polygon (using shoelace formula)
  const calculatePolygonArea = (polygon: number[][][]): number => {
    const ring = polygon[0]; // Outer ring
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
    }
    return Math.abs(area / 2);
  };

  // Convert a single polygon to SVG path
  const polygonToPath = (polygon: number[][][], viewBox: any): string => {
    const pathParts: string[] = [];
    polygon.forEach((ring) => {
      ring.forEach((point, pointIndex) => {
        const [lng, lat] = point;

        // Update viewBox bounds
        viewBox.minX = Math.min(viewBox.minX, lng);
        viewBox.maxX = Math.max(viewBox.maxX, lng);
        viewBox.minY = Math.min(viewBox.minY, -lat);
        viewBox.maxY = Math.max(viewBox.maxY, -lat);

        if (pointIndex === 0) {
          pathParts.push(`M ${lng} ${-lat}`);
        } else {
          pathParts.push(`L ${lng} ${-lat}`);
        }
      });
      pathParts.push('Z');
    });
    return pathParts.join(' ');
  };

  // Convert GeoJSON coordinates to SVG path
  const coordsToPath = (coords: any, viewBox: any): string => {
    const pathParts: string[] = [];

    const processPolygon = (polygon: number[][][]) => {
      polygon.forEach((ring, ringIndex) => {
        ring.forEach((point, pointIndex) => {
          const [lng, lat] = point;

          // Update viewBox bounds
          viewBox.minX = Math.min(viewBox.minX, lng);
          viewBox.maxX = Math.max(viewBox.maxX, lng);
          viewBox.minY = Math.min(viewBox.minY, -lat); // Invert lat for SVG
          viewBox.maxY = Math.max(viewBox.maxY, -lat);

          if (pointIndex === 0) {
            pathParts.push(`M ${lng} ${-lat}`);
          } else {
            pathParts.push(`L ${lng} ${-lat}`);
          }
        });
        pathParts.push('Z');
      });
    };

    if (coords[0][0][0] instanceof Array) {
      // MultiPolygon
      coords.forEach((polygon: number[][][]) => processPolygon(polygon));
    } else {
      // Single Polygon
      processPolygon(coords);
    }

    return pathParts.join(' ');
  };

  if (!geoJSON || svgPaths.size === 0) {
    return (
      <div className="w-full h-[387px] flex items-center justify-center border border-border/50 rounded-lg" style={{ backgroundColor: colors.background }}>
        <div className="text-xs text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <svg
        viewBox="110 5 45 43"
        className="w-full h-[387px] border border-border/50 rounded-lg"
        style={{ backgroundColor: colors.background }}
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onStateClick('Australia')}
      >
        {/* Render unselected states first, but NSW and ACT need special ordering */}
        {Array.from(svgPaths.entries())
          .filter(([stateName]) =>
            stateName !== selectedState &&
            stateName !== 'Australian Capital Territory' && // Render ACT separately at the end
            selectedState !== 'Australia' // If Australia selected, render all states as highlighted
          )
          .map(([stateName, pathData]) => (
            <path
              key={stateName}
              d={pathData}
              style={{
                fill: colors.unselectedFill,
                fillOpacity: 1,
                stroke: colors.unselectedStroke,
                strokeWidth: 0.15,
                strokeOpacity: isDarkMode ? 0.6 : 0.8,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fillRule: 'evenodd' // This ensures holes work correctly
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.fill = colors.hoverFill;
                e.currentTarget.style.fillOpacity = isDarkMode ? '0.2' : '0.3';
                e.currentTarget.style.stroke = colors.hoverStroke;
                e.currentTarget.style.strokeOpacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.fill = colors.unselectedFill;
                e.currentTarget.style.fillOpacity = '1';
                e.currentTarget.style.stroke = colors.unselectedStroke;
                e.currentTarget.style.strokeOpacity = isDarkMode ? '0.6' : '0.8';
              }}
              onClick={(e) => {
                e.stopPropagation();
                onStateClick(stateName);
              }}
            >
              <title>{stateName}</title>
            </path>
          ))}

        {/* Render highlighted states when Australia is selected */}
        {selectedState === 'Australia' && Array.from(svgPaths.entries())
          .filter(([stateName]) => stateName !== 'Australian Capital Territory')
          .map(([stateName, pathData]) => (
            <path
              key={`australia-${stateName}`}
              d={pathData}
              style={{
                fill: colors.selectedFill,
                fillOpacity: isDarkMode ? 0.2 : 0.25,
                stroke: colors.selectedStroke,
                strokeWidth: 0.2,
                strokeOpacity: 1,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fillRule: 'evenodd'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onStateClick(stateName);
              }}
            >
              <title>{stateName}</title>
            </path>
          ))}

        {/* Render ACT before selected state so it's always clickable */}
        {svgPaths.has('Australian Capital Territory') && selectedState !== 'Australian Capital Territory' && selectedState !== 'Australia' && (
          <path
            key="Australian Capital Territory"
            d={svgPaths.get('Australian Capital Territory')}
            style={{
              fill: colors.unselectedFill,
              fillOpacity: 1,
              stroke: colors.unselectedStroke,
              strokeWidth: 0.15,
              strokeOpacity: isDarkMode ? 0.6 : 0.8,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fillRule: 'evenodd'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.fill = colors.hoverFill;
              e.currentTarget.style.fillOpacity = isDarkMode ? '0.2' : '0.3';
              e.currentTarget.style.stroke = colors.hoverStroke;
              e.currentTarget.style.strokeOpacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.fill = colors.unselectedFill;
              e.currentTarget.style.fillOpacity = '1';
              e.currentTarget.style.stroke = colors.unselectedStroke;
              e.currentTarget.style.strokeOpacity = isDarkMode ? '0.6' : '0.8';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onStateClick('Australian Capital Territory');
            }}
          >
            <title>Australian Capital Territory</title>
          </path>
        )}

        {/* Render ACT highlighted when Australia is selected */}
        {svgPaths.has('Australian Capital Territory') && selectedState === 'Australia' && (
          <path
            key="australia-act"
            d={svgPaths.get('Australian Capital Territory')}
            style={{
              fill: colors.selectedFill,
              fillOpacity: isDarkMode ? 0.2 : 0.25,
              stroke: colors.selectedStroke,
              strokeWidth: 0.2,
              strokeOpacity: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fillRule: 'evenodd'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onStateClick('Australian Capital Territory');
            }}
          >
            <title>Australian Capital Territory</title>
          </path>
        )}

        {/* Render selected state last (on top) - but not if Australia is selected */}
        {selectedState && selectedState !== 'Australia' && svgPaths.has(selectedState) && (
          <path
            key={selectedState}
            d={svgPaths.get(selectedState)}
            style={{
              fill: colors.selectedFill,
              fillOpacity: isDarkMode ? 0.2 : 0.25,
              stroke: colors.selectedStroke,
              strokeWidth: 0.2,
              strokeOpacity: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fillRule: 'evenodd'
            }}
            onClick={(e) => {
              e.stopPropagation();
              onStateClick(selectedState);
            }}
          >
            <title>{selectedState}</title>
          </path>
        )}

        {/* Selected state label inside map at bottom center */}
        {selectedState && (
          <text
            x="132.5"
            y="46"
            textAnchor="middle"
            style={{
              fill: colors.textFill,
              fontSize: '1.5px',
              fontWeight: '600',
              pointerEvents: 'none'
            }}
          >
            {selectedState}
          </text>
        )}
      </svg>
    </div>
  );
}
