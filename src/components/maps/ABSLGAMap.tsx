"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { ABSLGA } from '@/components/filters/ABSLGALookup';

interface ABSLGAMapProps {
  selectedLGA: ABSLGA | null;
  height?: string;
  effectiveColumns?: number;
}

interface ABSBoundaryData {
  name: string;
  code: string;
  state: string;
  area_sqkm?: number;
  boundary: any; // GeoJSON geometry
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

export function ABSLGAMap({ selectedLGA, height, effectiveColumns }: ABSLGAMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [leaflet, setLeaflet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [boundaryData, setBoundaryData] = useState<ABSBoundaryData | null>(null);
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

        // Default view of Australia for ABS data
        mapRef.current.setView([-25.0, 135.0], 5);
      } catch (error) {
        console.error('Error initializing ABS map:', error);
        mapRef.current = null;
      }
    }

    return () => {
      // Safer cleanup - check if map still exists and container is still mounted
      if (mapRef.current && mapRef.current._container && mapRef.current._container.parentNode) {
        try {
          mapRef.current.remove();
        } catch (error) {
          console.warn('Map cleanup warning:', error);
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
        console.log('Fetching ABS boundary data for:', selectedLGA.name);

        const response = await fetch(`/api/abs-census-lga?lga=${encodeURIComponent(selectedLGA.name)}&geometry=true`);
        const data = await response.json();

        if (response.ok && data.boundaries) {
          setBoundaryData(data.boundaries);
          console.log('ABS boundary data loaded successfully:', data.boundaries.name);
        } else {
          throw new Error(data.error || 'No boundary data available');
        }

      } catch (error) {
        console.error('Error fetching ABS boundary data:', error);
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
            console.warn('Map resize warning:', error);
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
          console.warn('Map effectiveColumns resize warning:', error);
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
      // Reset to Australia view when no LGA selected
      mapRef.current.setView([-25.0, 135.0], 5);
      return;
    }

    if (boundaryData) {
      try {
        // Handle ABS LGA boundaries
        if (boundaryData.boundary) {
          // Add GeoJSON boundary
          const geoJsonLayer = leaflet.geoJSON(boundaryData.boundary, {
            style: {
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            }
          }).addTo(mapRef.current);

          // Fit map to boundary
          mapRef.current.fitBounds(geoJsonLayer.getBounds(), { padding: [10, 10] });

          // Add marker at center with popup
          leaflet.marker(boundaryData.center)
            .bindPopup(`
              <strong>${boundaryData.name}</strong><br/>
              <em>ABS Code: ${boundaryData.code}</em><br/>
              <em>State: ${boundaryData.state}</em><br/>
              ${boundaryData.area_sqkm ? `<em>Area: ${boundaryData.area_sqkm.toFixed(1)} km²</em><br/>` : ''}
              <small>ABS Census 2024 - Mosaic_pro Database</small>
            `)
            .addTo(mapRef.current);
        } else {
          // Fallback to bounds if no boundary geometry
          if (boundaryData.bounds) {
            const bounds = leaflet.latLngBounds(boundaryData.bounds as [[number, number], [number, number]]);
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });

            leaflet.marker(boundaryData.center)
              .bindPopup(`
                <strong>${selectedLGA.name}</strong><br/>
                <em>ABS Code: ${selectedLGA.code}</em><br/>
                <em>State: ${selectedLGA.state}</em><br/>
                <small>ABS Census 2024 data available</small>
              `)
              .addTo(mapRef.current);
          }
        }

      } catch (error) {
        console.error('Error rendering ABS boundary:', error);
        // Fallback to center point
        mapRef.current.setView([-25.0, 135.0], 5);

        leaflet.marker([-25.0, 135.0])
          .bindPopup(`<strong>${selectedLGA.name}</strong><br/><em>Boundary rendering error</em>`)
          .addTo(mapRef.current);
      }
    } else if (boundaryError) {
      // Show error state with default Australia view
      mapRef.current.setView([-25.0, 135.0], 5);

      leaflet.marker([-25.0, 135.0])
        .bindPopup(`
          <strong>${selectedLGA.name}</strong><br/>
          <em style="color: #ef4444;">Boundary data unavailable</em><br/>
          <small>${boundaryError}</small>
        `)
        .addTo(mapRef.current)
        .openPopup();
    } else {
      // Loading state - show approximate center
      mapRef.current.setView([-25.0, 135.0], 5);

      leaflet.marker([-25.0, 135.0])
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
        <div className="text-sm text-muted-foreground">Loading ABS map...</div>
      </div>
    );
  }

  if (!leaflet) {
    return (
      <div
        className="w-full bg-muted rounded-lg flex items-center justify-center"
        style={{ height: height || '100%', minHeight: '250px' }}
      >
        <div className="text-sm text-muted-foreground">ABS map not available</div>
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
          Select an LGA from ABS Census 2024 data to view its boundaries
        </div>
      )}
      {selectedLGA && boundaryError && (
        <div className="text-xs text-red-500 mt-2 text-center">
          Unable to load ABS boundary data: {boundaryError}
        </div>
      )}
      {selectedLGA && boundaryData && (
        <div className="text-xs text-blue-600 mt-2 text-center">
          {boundaryData.name} - ABS Census 2024 (Mosaic_pro Database)
        </div>
      )}
    </>
  );
}