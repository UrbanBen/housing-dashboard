"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Settings, Database, RefreshCw, AlertCircle } from "lucide-react";
import { LGAMap } from '@/components/maps/LGAMap';
import { ABSLGAMapConfigForm } from './ABSLGAMapConfigForm';
import type { LGA } from '@/components/filters/LGALookup';

interface ABSLGAMapProps {
  selectedLGA: LGA | null;
  effectiveColumns: number;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
  filterSourceCardId?: string; // ID of the card providing filter data
}

interface MapConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordPath: string;
  schema: string;
  table: string;
  geometryColumn: string;
  lgaNameColumn: string;
  lgaCodeColumn: string;
  filterIntegration: {
    enabled: boolean;
    sourceCardId: string;
    sourceCardType: 'search-geography-card' | 'lga-lookup' | 'custom';
    lgaNameColumn: string;
    lgaCodeColumn: string;
    autoRefresh: boolean;
  };
}

export function ABSLGAMap({
  selectedLGA: externalSelectedLGA,
  effectiveColumns,
  isAdminMode = false,
  onAdminClick,
  filterSourceCardId = 'search-geography-card'
}: ABSLGAMapProps) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<MapConfig | null>(null);
  const [selectedLGA, setSelectedLGA] = useState<LGA | null>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<any>(null);

  // Load configuration
  const getStoredConfig = (): MapConfig => {
    const stored = localStorage.getItem('abs-lga-map-config');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored map config:', e);
      }
    }
    return {
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: 'db_admin',
      passwordPath: '/users/ben/permissions/.env.admin',
      schema: 'housing_dashboard',
      table: 'search',
      geometryColumn: 'wkb_geometry',
      lgaNameColumn: 'lga_name24',
      lgaCodeColumn: 'lga_code24',
      filterIntegration: {
        enabled: true,
        sourceCardId: 'search-geography-card',
        sourceCardType: 'search-geography-card',
        lgaNameColumn: 'lga_name24',
        lgaCodeColumn: 'lga_code24',
        autoRefresh: true
      }
    };
  };

  // Fetch geometry data for selected LGA
  const fetchLGAGeometry = async (lgaName: string, lgaData: LGA) => {
    if (!lgaName) return;

    setIsLoading(true);
    setError(null);

    try {
      const config = getStoredConfig();

      const params = new URLSearchParams({
        schema: config.schema,
        table: config.table,
        geometryColumn: config.geometryColumn,
        lgaNameColumn: config.lgaNameColumn,
        lgaName: lgaName,
        passwordPath: config.passwordPath
      });

      const response = await fetch(`/api/lga-geometry?${params}`);
      const result = await response.json();

      if (result.success) {
        setMapData(result);
        setConnection(result.connection);

        // Set selectedLGA with geometry attached AFTER fetch completes
        setSelectedLGA({
          ...lgaData,
          geometry: result.data?.geometry || result.geometry
        });
      } else {
        setError(result.error || 'Failed to fetch geometry data');
        setConnection(result.connection || null);
        setSelectedLGA(lgaData); // Set without geometry on error
      }
    } catch (err) {
      console.error('Error fetching LGA geometry:', err);
      setError(err instanceof Error ? err.message : 'Network error');
      setSelectedLGA(lgaData); // Set without geometry on error
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for Test Search card selection changes
  useEffect(() => {
    const handleTestSearchSelection = (event: CustomEvent) => {
      const config = getStoredConfig();

      if (config.filterIntegration.enabled &&
          config.filterIntegration.sourceCardId === 'search-geography-card') {
        const { lgaName, lgaCode } = event.detail;

        console.log('[ABSLGAMap] Received LGA selection:', { lgaName, lgaCode });

        const lgaData = {
          id: lgaCode || '',
          name: lgaName,
          region: 'NSW',
          population: null
        };

        if (config.filterIntegration.autoRefresh) {
          fetchLGAGeometry(lgaName, lgaData);
        } else {
          setSelectedLGA(lgaData);
        }
      }
    };

    // Listen for the custom event from Test Search card
    window.addEventListener('search-geography-lga-selected' as any, handleTestSearchSelection as any);

    return () => {
      window.removeEventListener('search-geography-lga-selected' as any, handleTestSearchSelection as any);
    };
  }, []);

  // Update when external selectedLGA changes - always use it and fetch from database
  useEffect(() => {
    if (externalSelectedLGA?.name) {
      fetchLGAGeometry(externalSelectedLGA.name, externalSelectedLGA);
    }
  }, [externalSelectedLGA]);

  // Handle double click to configure
  const handleDoubleClick = () => {
    const config = getStoredConfig();
    setCurrentConfig(config);
    setShowConfigForm(true);
    onAdminClick?.();
  };

  const handleSaveConfig = (newConfig: MapConfig) => {
    // Save config to localStorage
    localStorage.setItem('abs-lga-map-config', JSON.stringify(newConfig));
    setCurrentConfig(newConfig);

    // If auto-refresh is enabled and we have a selected LGA, fetch its geometry
    if (newConfig.filterIntegration.autoRefresh && selectedLGA?.name) {
      fetchLGAGeometry(selectedLGA.name, selectedLGA);
    }
  };

  const handleRefresh = () => {
    if (selectedLGA?.name) {
      fetchLGAGeometry(selectedLGA.name, selectedLGA);
    }
  };

  return (
    <>
    <Card
      className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-lg transition-all"
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">
                {selectedLGA?.name ? `${selectedLGA.name} LGA Boundary` : 'Boundary Map'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Interactive map with database boundaries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-muted rounded-sm transition-colors"
              title="Refresh map"
              disabled={!selectedLGA}
            >
              <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {error ? (
          <div className="flex items-center text-destructive p-4">
            <AlertCircle className="h-5 w-5 mr-2" />
            <div>
              <div className="font-medium">Error loading map</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        ) : (
          <>
            {/* Map component */}
            <LGAMap
              selectedLGA={selectedLGA ? {
                ...selectedLGA,
                geometry: mapData?.data?.geometry || mapData?.geometry || selectedLGA.geometry,
              } : null}
              effectiveColumns={effectiveColumns}
              height="400px"
            />
          </>
        )}
      </CardContent>
    </Card>

    <ABSLGAMapConfigForm
      isOpen={showConfigForm}
      onClose={() => setShowConfigForm(false)}
      onSave={handleSaveConfig}
      currentConfig={currentConfig}
    />
    </>
  );
}