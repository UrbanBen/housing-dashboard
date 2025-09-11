"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LGA {
  id: string;
  name: string;
  region: string;
  population: number;
}

interface LGAMapProps {
  selectedLGA: LGA | null;
  height?: string;
}

// LGA boundary coordinates (simplified polygons for demonstration)
// In a real implementation, these would come from a GIS service or stored GeoJSON data
const LGA_BOUNDARIES: { [key: string]: { center: [number, number], bounds: [[number, number], [number, number]], polygon?: [number, number][] } } = {
  // Sydney Metropolitan
  'sydney': { 
    center: [-33.8688, 151.2093], 
    bounds: [[-33.9157, 151.1669], [-33.8219, 151.2517]],
    polygon: [[-33.9157, 151.1669], [-33.9157, 151.2517], [-33.8219, 151.2517], [-33.8219, 151.1669], [-33.9157, 151.1669]]
  },
  'parramatta': { 
    center: [-33.8150, 151.0000], 
    bounds: [[-33.8650, 150.9500], [-33.7650, 151.0500]],
    polygon: [[-33.8650, 150.9500], [-33.8650, 151.0500], [-33.7650, 151.0500], [-33.7650, 150.9500], [-33.8650, 150.9500]]
  },
  'blacktown': { 
    center: [-33.7688, 150.9063], 
    bounds: [[-33.8188, 150.8563], [-33.7188, 150.9563]],
    polygon: [[-33.8188, 150.8563], [-33.8188, 150.9563], [-33.7188, 150.9563], [-33.7188, 150.8563], [-33.8188, 150.8563]]
  },
  'penrith': { 
    center: [-33.7506, 150.6940], 
    bounds: [[-33.8006, 150.6440], [-33.7006, 150.7440]],
    polygon: [[-33.8006, 150.6440], [-33.8006, 150.7440], [-33.7006, 150.7440], [-33.7006, 150.6440], [-33.8006, 150.6440]]
  },
  'liverpool': { 
    center: [-33.9213, 150.9218], 
    bounds: [[-33.9713, 150.8718], [-33.8713, 150.9718]],
    polygon: [[-33.9713, 150.8718], [-33.9713, 150.9718], [-33.8713, 150.9718], [-33.8713, 150.8718], [-33.9713, 150.8718]]
  },
  'campbelltown': { 
    center: [-34.0650, 150.8081], 
    bounds: [[-34.1150, 150.7581], [-34.0150, 150.8581]],
    polygon: [[-34.1150, 150.7581], [-34.1150, 150.8581], [-34.0150, 150.8581], [-34.0150, 150.7581], [-34.1150, 150.7581]]
  },
  'wollongong': { 
    center: [-34.4278, 150.8931], 
    bounds: [[-34.4778, 150.8431], [-34.3778, 150.9431]],
    polygon: [[-34.4778, 150.8431], [-34.4778, 150.9431], [-34.3778, 150.9431], [-34.3778, 150.8431], [-34.4778, 150.8431]]
  },
  'newcastle': { 
    center: [-32.9267, 151.7789], 
    bounds: [[-32.9767, 151.7289], [-32.8767, 151.8289]],
    polygon: [[-32.9767, 151.7289], [-32.9767, 151.8289], [-32.8767, 151.8289], [-32.8767, 151.7289], [-32.9767, 151.7289]]
  },
  'central-coast': { 
    center: [-33.4255, 151.3486], 
    bounds: [[-33.4755, 151.2986], [-33.3755, 151.3986]],
    polygon: [[-33.4755, 151.2986], [-33.4755, 151.3986], [-33.3755, 151.3986], [-33.3755, 151.2986], [-33.4755, 151.2986]]
  },
  'blue-mountains': { 
    center: [-33.7120, 150.3070], 
    bounds: [[-33.7620, 150.2570], [-33.6620, 150.3570]],
    polygon: [[-33.7620, 150.2570], [-33.7620, 150.3570], [-33.6620, 150.3570], [-33.6620, 150.2570], [-33.7620, 150.2570]]
  },
  // Default fallback for unmapped LGAs
  'default': { 
    center: [-33.8688, 151.2093], 
    bounds: [[-34.5, 150.5], [-33.0, 152.0]],
    polygon: [[-34.5, 150.5], [-34.5, 152.0], [-33.0, 152.0], [-33.0, 150.5], [-34.5, 150.5]]
  }
};

export function LGAMap({ selectedLGA, height = "200px" }: LGAMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polygonRef = useRef<L.Polygon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map if it doesn't exist
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: true,
        attributionControl: true
      });

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    // Clear existing polygon
    if (polygonRef.current) {
      mapRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    // Get LGA boundary data
    const lgaData = selectedLGA 
      ? (LGA_BOUNDARIES[selectedLGA.id] || LGA_BOUNDARIES['default'])
      : LGA_BOUNDARIES['default'];

    // Create and add polygon if boundary exists
    if (lgaData.polygon) {
      const polygon = L.polygon(lgaData.polygon as L.LatLngExpression[], {
        color: '#22c55e',
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        weight: 2,
        opacity: 0.8
      });

      polygon.addTo(mapRef.current);
      polygonRef.current = polygon;

      // Add popup with LGA information
      if (selectedLGA) {
        polygon.bindPopup(`
          <div class="text-sm">
            <div class="font-semibold text-gray-900">${selectedLGA.name}</div>
            <div class="text-gray-600">${selectedLGA.region}</div>
            <div class="text-gray-600">Pop: ${selectedLGA.population.toLocaleString()}</div>
          </div>
        `);
      }
    }

    // Fit map to LGA bounds
    const bounds = L.latLngBounds(lgaData.bounds as L.LatLngBoundsExpression);
    mapRef.current.fitBounds(bounds, { padding: [10, 10] });

    // Add a marker at the center
    const marker = L.marker(lgaData.center as L.LatLngExpression, {
      icon: L.divIcon({
        className: 'bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold',
        html: '<div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: #22c55e; color: white; border-radius: 50%; font-size: 10px;">●</div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    });

    marker.addTo(mapRef.current);

    if (selectedLGA) {
      marker.bindPopup(`
        <div class="text-sm">
          <div class="font-semibold text-gray-900">${selectedLGA.name} Centre</div>
          <div class="text-gray-600">${selectedLGA.region}</div>
        </div>
      `);
    }

    // Cleanup marker reference
    return () => {
      if (mapRef.current && marker) {
        mapRef.current.removeLayer(marker);
      }
    };

  }, [selectedLGA]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      <div 
        ref={containerRef} 
        style={{ height }}
        className="w-full rounded-lg border border-border overflow-hidden bg-muted"
      />
      {!selectedLGA && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/80 rounded-lg">
          <div className="text-center text-muted-foreground">
            <div className="text-sm font-medium">Select an LGA</div>
            <div className="text-xs">to view boundary map</div>
          </div>
        </div>
      )}
    </div>
  );
}