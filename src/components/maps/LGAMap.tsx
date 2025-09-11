"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { LGA } from '@/components/filters/LGALookup';

interface LGAMapProps {
  selectedLGA: LGA | null;
  height?: string;
}

interface BoundaryData {
  name: string;
  code: string;
  boundary: any; // GeoJSON geometry
  center: [number, number];
  bounds: [[number, number], [number, number]];
}

export function LGAMap({ selectedLGA, height = "h-64" }: LGAMapProps) {
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

      // Default view of NSW
      mapRef.current.setView([-33.4, 151.0], 7);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
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
        
        const response = await fetch(`/api/lga-boundaries?lga=${encodeURIComponent(selectedLGA.name)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setBoundaryData(data.boundaries);
        console.log('Boundary data loaded successfully:', data.boundaries.name);
        
      } catch (error) {
        console.error('Error fetching boundary data:', error);
        setBoundaryError(error instanceof Error ? error.message : 'Failed to load boundary data');
        setBoundaryData(null);
      }
    };

    fetchBoundaryData();
  }, [selectedLGA]);

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
      mapRef.current.setView([-33.4, 151.0], 7);
      return;
    }

    if (boundaryData && boundaryData.boundary) {
      try {
        // Add GeoJSON boundary
        const geoJsonLayer = leaflet.geoJSON(boundaryData.boundary, {
          style: {
            color: '#22c55e',
            fillColor: '#22c55e',
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
            <em>Code: ${boundaryData.code}</em><br/>
            <small>Real boundary data from PostGIS</small>
          `)
          .addTo(mapRef.current);

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
      mapRef.current.setView([-33.4, 151.0], 8);
      
      leaflet.marker([-33.4, 151.0])
        .bindPopup(`
          <strong>${selectedLGA.name}</strong><br/>
          <em style="color: #ef4444;">Boundary data unavailable</em><br/>
          <small>${boundaryError}</small>
        `)
        .addTo(mapRef.current)
        .openPopup();
    } else {
      // Loading state - show approximate center
      mapRef.current.setView([-33.4, 151.0], 8);
      
      leaflet.marker([-33.4, 151.0])
        .bindPopup(`<strong>${selectedLGA.name}</strong><br/><em>Loading boundary data...</em>`)
        .addTo(mapRef.current);
    }
  }, [leaflet, selectedLGA, boundaryData, boundaryError]);

  if (isLoading) {
    return (
      <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center" style={{ minHeight: '300px', maxHeight: '400px' }}>
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    );
  }

  if (!leaflet) {
    return (
      <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center" style={{ minHeight: '300px', maxHeight: '400px' }}>
        <div className="text-sm text-muted-foreground">Map not available</div>
      </div>
    );
  }

  return (
    <>
      <div 
        ref={containerRef}
        className="w-full aspect-square rounded-lg overflow-hidden border border-border"
        style={{ minHeight: '300px', maxHeight: '400px' }}
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
          Showing real boundary data for {boundaryData.name}
        </div>
      )}
    </>
  );
}