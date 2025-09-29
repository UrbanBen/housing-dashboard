"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { LGA } from '@/components/filters/LGALookup';

interface LGAMapProps {
  selectedLGA: LGA | null;
  height?: string;
  effectiveColumns?: number; // Add this to trigger resize when columns change
}

interface BoundaryData {
  name: string;
  code: string;
  boundary: any; // GeoJSON geometry
  center: [number, number];
  bounds: [[number, number], [number, number]];
  urbanity?: string; // Optional urbanity field from NSW Spatial Services
}

// Helper function to filter NSW polygons to exclude remote islands
function filterMainlandPolygons(geometry: any, leaflet: any): any {
  if (!geometry || geometry.type !== 'MultiPolygon') {
    return geometry; // Return as-is if not a MultiPolygon
  }

  // NSW mainland bounds (excluding remote islands)
  const mainlandBounds = {
    north: -28.5,   // Northern border
    south: -37.0,   // Southern border
    west: 141.0,    // Western border
    east: 153.0     // Eastern border (excludes Lord Howe Island at ~159°E)
  };

  const filteredCoordinates = geometry.coordinates.filter((polygon: number[][][]) => {
    // Check the first coordinate ring of each polygon
    const firstRing = polygon[0];
    if (!firstRing || firstRing.length === 0) return false;

    // Calculate polygon bounds
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    for (const coord of firstRing) {
      const [lng, lat] = coord;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    // Include polygon if it overlaps with mainland bounds
    const overlapsMainland = !(
      maxLng < mainlandBounds.west ||    // Polygon is completely west
      minLng > mainlandBounds.east ||    // Polygon is completely east
      maxLat < mainlandBounds.south ||   // Polygon is completely south
      minLat > mainlandBounds.north      // Polygon is completely north
    );

    return overlapsMainland;
  });

  // Return filtered geometry
  return {
    type: 'MultiPolygon',
    coordinates: filteredCoordinates
  };
}

export function LGAMap({ selectedLGA, height, effectiveColumns }: LGAMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [leaflet, setLeaflet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [boundaryData, setBoundaryData] = useState<BoundaryData | null>(null);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  // Dynamic import of Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import('leaflet');
        
        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        });
        
        setLeaflet(L);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
        setIsLoading(false);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!leaflet || !containerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      try {
        mapRef.current = leaflet.map(containerRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          dragging: true,
          touchZoom: false
        });

        // Add base layer
        leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18
        }).addTo(mapRef.current);

        // Default view of NSW - centered on mainland (excludes remote islands)
        mapRef.current.setView([-32.5, 147.0], 6);
      } catch (error) {
        console.error('Error initializing LGA map:', error);
        mapRef.current = null;
      }
    }

    return () => {
      // Safer cleanup - check if map still exists and container is still mounted
      if (mapRef.current && mapRef.current._container && mapRef.current._container.parentNode) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('LGA map cleanup warning:', error);
        }
        mapRef.current = null;
      }
    };
  }, [leaflet]);

  // Fetch boundary data when LGA changes
  useEffect(() => {
    if (!selectedLGA) {
      setBoundaryData(null);
      setBoundaryError(null);
      return;
    }

    const fetchBoundaryData = async () => {
      try {
        setBoundaryError(null);
        console.log('Fetching boundary data for:', selectedLGA.name);
        
        // Handle NSW state-wide view
        if (selectedLGA.id === 'nsw-state') {
          try {
            console.log('Fetching NSW boundary from ABS ASGS2021...');
            
            // Fetch NSW boundary from ABS using state_code_2021 = '1' for NSW
            const absResponse = await fetch(
              'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/STE/MapServer/0/query?' +
              'where=state_code_2021=%271%27&' +
              'outFields=state_code_2021,state_name_2021,area_albers_sqkm&' +
              'returnGeometry=true&' +
              'f=geojson&' +
              'outSR=4326'
            );
            
            if (absResponse.ok) {
              const absData = await absResponse.json();
              console.log('ABS NSW boundary response:', absData);
              
              if (absData.features && absData.features.length > 0) {
                const nswFeature = absData.features[0];
                console.log('NSW feature:', nswFeature);
                
                setBoundaryData({
                  name: 'New South Wales',
                  code: 'NSW',
                  boundary: nswFeature.geometry, // GeoJSON geometry from ABS shape field
                  center: [-32.5, 147.0] as [number, number], // Mainland NSW center (excludes remote islands)
                  bounds: [[-37.0, 141.0], [-28.5, 153.0]] as [[number, number], [number, number]], // Mainland NSW bounds only
                  urbanity: 'S'
                });
                console.log('NSW boundary loaded successfully from ABS');
                return;
              }
            }
            
            console.warn('ABS NSW boundary not available, using fallback bounds');
            // Fallback if ABS fails
            setBoundaryData({
              name: 'New South Wales',
              code: 'NSW',
              boundary: null,
              center: [-32.5, 147.0] as [number, number],
              bounds: [[-37.0, 141.0], [-28.5, 153.0]] as [[number, number], [number, number]],
              urbanity: 'S'
            });
            return;
            
          } catch (error) {
            console.error('Error fetching NSW boundary from ABS:', error);
            // Fallback if ABS fails
            setBoundaryData({
              name: 'New South Wales',
              code: 'NSW',
              boundary: null,
              center: [-32.5, 147.0] as [number, number],
              bounds: [[-37.0, 141.0], [-28.5, 153.0]] as [[number, number], [number, number]],
              urbanity: 'S'
            });
            return;
          }
        }
        
        // Try ArcGIS service first (preferred source - official ABS ASGS2021 with geometry)
        let response = await fetch(`/api/arcgis-lga?lga=${encodeURIComponent(selectedLGA.name)}&geometry=true`);
        let data = await response.json();

        if (response.ok && data.boundaries && data.boundaries.boundary) {
          setBoundaryData(data.boundaries);
          console.log('ArcGIS boundary data loaded successfully:', data.boundaries.name);
          return;
        }

        // Fallback to NSW Spatial Services
        console.log('ArcGIS data not available, trying NSW Spatial Services...');
        response = await fetch(`/api/nsw-boundaries?lga=${encodeURIComponent(selectedLGA.name)}&geometry=true`);
        data = await response.json();

        if (response.ok && data.boundaries && data.boundaries.boundary) {
          setBoundaryData(data.boundaries);
          console.log('NSW Spatial boundary data loaded successfully:', data.boundaries.name);
          return;
        }

        // Fallback to our simplified boundary data
        console.log('NSW Spatial data not available, trying fallback...');
        response = await fetch(`/api/lga-boundaries?lga=${encodeURIComponent(selectedLGA.name)}`);
        data = await response.json();

        if (response.ok && data.boundaries) {
          setBoundaryData(data.boundaries);
          console.log('Fallback boundary data loaded successfully:', data.boundaries.name);
          return;
        }
        
        throw new Error(data.error || 'No boundary data available');
        
      } catch (error) {
        console.error('Error fetching boundary data:', error);
        setBoundaryError(error instanceof Error ? error.message : 'Failed to load boundary data');
        setBoundaryData(null);
      }
    };

    fetchBoundaryData();
  }, [selectedLGA]);

  // Handle map resize when container changes or columns change
  useEffect(() => {
    if (!mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current && mapRef.current._container && mapRef.current._container.parentNode) {
        // Give DOM time to update
        setTimeout(() => {
          try {
            if (mapRef.current && mapRef.current._container) {
              mapRef.current.invalidateSize();
            }
          } catch (error) {
            console.warn('LGA map resize warning:', error);
          }
        }, 100);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Trigger resize when effectiveColumns changes (card width changes)
  useEffect(() => {
    if (mapRef.current && mapRef.current._container && mapRef.current._container.parentNode) {
      // Wait for layout to update, then invalidate map size
      setTimeout(() => {
        try {
          if (mapRef.current && mapRef.current._container) {
            mapRef.current.invalidateSize();
          }
        } catch (error) {
          console.warn('LGA map effectiveColumns resize warning:', error);
        }
      }, 200);
    }
  }, [effectiveColumns]);

  // Update map when boundary data changes
  useEffect(() => {
    if (!leaflet || !mapRef.current) return;

    // Clear existing layers (except base map)
    mapRef.current.eachLayer((layer: any) => {
      if (layer.options && !layer.options.attribution) {
        mapRef.current.removeLayer(layer);
      }
    });

    if (!selectedLGA) {
      // Reset to NSW view when no LGA selected
      mapRef.current.setView([-32.5, 147.0], 6);
      return;
    }

    if (boundaryData) {
      try {
        // Handle NSW state-wide view (no specific boundary, show bounds)
        if (boundaryData.code === 'NSW' && !boundaryData.boundary) {
          const bounds = leaflet.latLngBounds(boundaryData.bounds as [[number, number], [number, number]]);
          mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          
          // Add marker at center with popup for NSW state-wide
          leaflet.marker(boundaryData.center)
            .bindPopup(`
              <strong>${boundaryData.name}</strong><br/>
              <em>State-wide View</em><br/>
              <small>Showing all NSW LGAs - Official NSW Spatial Data</small>
            `)
            .addTo(mapRef.current);
        } 
        // Handle specific LGA boundaries
        else if (boundaryData.boundary) {
          // Handle NSW state boundary specially to exclude remote islands
          if (boundaryData.code === 'NSW') {
            // Filter NSW boundary to exclude remote islands (Lord Howe Island, etc.)
            const filteredBoundary = filterMainlandPolygons(boundaryData.boundary, leaflet);

            // Add filtered GeoJSON boundary
            if (filteredBoundary) {
              leaflet.geoJSON(filteredBoundary, {
                style: {
                  color: '#22c55e',
                  fillColor: '#22c55e',
                  fillOpacity: 0.2,
                  weight: 2
                }
              }).addTo(mapRef.current);
            }

            // Use predefined mainland bounds instead of fitting to full boundary
            const bounds = leaflet.latLngBounds(boundaryData.bounds as [[number, number], [number, number]]);
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          } else {
            // Regular LGA boundaries - use normal processing
            const geoJsonLayer = leaflet.geoJSON(boundaryData.boundary, {
              style: {
                color: '#22c55e',
                fillColor: '#22c55e',
                fillOpacity: 0.2,
                weight: 2
              }
            }).addTo(mapRef.current);

            // Fit map to boundary for regular LGAs
            mapRef.current.fitBounds(geoJsonLayer.getBounds(), { padding: [10, 10] });
          }

          // Add marker at center with popup
          leaflet.marker(boundaryData.center)
            .bindPopup(`
              <strong>${boundaryData.name}</strong><br/>
              <em>Code: ${boundaryData.code}</em><br/>
              <small>${boundaryData.urbanity === 'S' ? 'State-wide View<br/>Official ABS ASGS2021 Boundary Data (Mainland Only)' : boundaryData.urbanity === 'U' ? 'Urban LGA<br/>NSW Spatial Services Data' : 'Rural LGA<br/>NSW Spatial Services Data'}</small>
            `)
            .addTo(mapRef.current);
        }

      } catch (error) {
        console.error('Error rendering boundary:', error);
        // Fallback to bounds if GeoJSON fails
        if (boundaryData.bounds) {
          const bounds = leaflet.latLngBounds(boundaryData.bounds as [[number, number], [number, number]]);
          mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          
          leaflet.marker(boundaryData.center)
            .bindPopup(`<strong>${selectedLGA.name}</strong><br/><em>Boundary data error</em>`)
            .addTo(mapRef.current);
        }
      }
    } else if (boundaryError) {
      // Show error state with default NSW view
      mapRef.current.setView([-32.5, 147.0], 6);

      leaflet.marker([-32.5, 147.0])
        .bindPopup(`
          <strong>${selectedLGA.name}</strong><br/>
          <em style="color: #ef4444;">Boundary data unavailable</em><br/>
          <small>${boundaryError}</small>
        `)
        .addTo(mapRef.current)
        .openPopup();
    } else {
      // Loading state - show approximate center
      mapRef.current.setView([-32.5, 147.0], 6);

      leaflet.marker([-32.5, 147.0])
        .bindPopup(`<strong>${selectedLGA.name}</strong><br/><em>Loading boundary data...</em>`)
        .addTo(mapRef.current);
    }
  }, [leaflet, selectedLGA, boundaryData, boundaryError]);

  if (isLoading) {
    return (
      <div 
        className="w-full bg-muted rounded-lg flex items-center justify-center"
        style={{ height: height || '100%', minHeight: '250px' }}
      >
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  if (!leaflet) {
    return (
      <div 
        className="w-full bg-muted rounded-lg flex items-center justify-center"
        style={{ height: height || '100%', minHeight: '250px' }}
      >
        <div className="text-sm text-muted-foreground">Map not available</div>
      </div>
    );
  }


  return (
    <>
      <div 
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden border border-border"
        style={{ height: height || '100%', minHeight: '250px' }}
      />
      {!selectedLGA && (
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Select an LGA to view its boundaries
        </div>
      )}
      {selectedLGA && boundaryError && (
        <div className="text-xs text-red-500 mt-2 text-center">
          Unable to load boundary data: {boundaryError}
        </div>
      )}
      {selectedLGA && boundaryData && (
        <div className="text-xs text-green-600 mt-2 text-center">
          {boundaryData.urbanity ? `${boundaryData.urbanity === 'U' ? 'Urban' : 'Rural'} LGA: ` : ''}{boundaryData.name} - Official NSW Spatial Data
        </div>
      )}
    </>
  );
}