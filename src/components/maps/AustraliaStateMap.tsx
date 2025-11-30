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
      <div className="w-full h-80 flex items-center justify-center border border-border/50 rounded-lg" style={{ backgroundColor: '#000000' }}>
        <div className="text-xs text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="text-xs text-muted-foreground mb-2 text-center">Select State</div>
      <svg
        viewBox="110 5 45 43"
        className="w-full h-80 border border-border/50 rounded-lg"
        style={{ backgroundColor: '#000000' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Render unselected states first */}
        {Array.from(svgPaths.entries())
          .filter(([stateName]) => stateName !== selectedState)
          .map(([stateName, pathData]) => (
            <path
              key={stateName}
              d={pathData}
              style={{
                fill: '#090909',
                fillOpacity: 1,
                stroke: '#22c55e',
                strokeWidth: 0.15,
                strokeOpacity: 0.6,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.fill = '#22c55e';
                e.currentTarget.style.fillOpacity = '0.2';
                e.currentTarget.style.stroke = '#22c55e';
                e.currentTarget.style.strokeOpacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.fill = '#090909';
                e.currentTarget.style.fillOpacity = '1';
                e.currentTarget.style.stroke = '#22c55e';
                e.currentTarget.style.strokeOpacity = '0.6';
              }}
              onClick={() => onStateClick(stateName)}
            >
              <title>{stateName}</title>
            </path>
          ))}

        {/* Render selected state last (on top) */}
        {selectedState && svgPaths.has(selectedState) && (
          <path
            key={selectedState}
            d={svgPaths.get(selectedState)}
            style={{
              fill: '#22c55e',
              fillOpacity: 0.2,
              stroke: '#22c55e',
              strokeWidth: 0.2,
              strokeOpacity: 1,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => onStateClick(selectedState)}
          >
            <title>{selectedState}</title>
          </path>
        )}
      </svg>
      <div className="text-xs text-center text-primary mt-1 font-medium">
        {selectedState}
      </div>
    </div>
  );
}
