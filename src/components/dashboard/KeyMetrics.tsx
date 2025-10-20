"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, TrendingUp, Users, MapPin, BarChart3, Square, Database, AlertCircle, Target } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';
import { KeyMetricsConfigForm } from './KeyMetricsConfigForm';

interface KeyMetricsProps {
  selectedLGA: LGA | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface AreaData {
  lga_name: string;
  area_sqkm: number;
}

interface AccordTargetData {
  lga_name: string;
  accord_target: number;
}

interface BuildingApprovalsData {
  lga_name: string;
  total_dwellings: number | null;
  new_houses: number | null;
  new_other: number | null;
  value_total_res: number | null;
}

interface ConnectionInfo {
  host: string;
  port: number;
  database: string;
  user: string;
  schema: string;
  table: string;
}

interface KeyMetricsConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  passwordPath: string;
  schema: string;
  table: string;
  areaColumn: string;
  accordTargetColumn: string;
  lgaNameColumn: string;
  buildingApprovals: {
    enabled: boolean;
    schema: string;
    table: string;
    lgaNameColumn: string;
    totalDwellingsColumn: string;
    newHousesColumn: string;
    newOtherColumn: string;
    valueTotalResColumn: string;
  };
  filterIntegration: {
    enabled: boolean;
    sourceCardId: string;
    sourceCardType: 'search-geography-card' | 'lga-lookup' | 'custom';
    autoRefresh: boolean;
  };
}

// Get LGA data - combines real database data with defaults
const getLGAData = (
  lga: LGA | null,
  areaData: AreaData | null = null,
  accordTargetData: AccordTargetData | null = null,
  buildingApprovalsData: BuildingApprovalsData | null = null
) => {
  // Use area from database if available, otherwise use mock data
  const areaValue = areaData?.area_sqkm || lga?.area || 0;

  // Use accord target from database if available
  const accordTargetValue = accordTargetData?.accord_target || null;

  // Use building approvals data from database if available
  const totalDwellings = buildingApprovalsData?.total_dwellings || null;
  const newHouses = buildingApprovalsData?.new_houses || null;
  const newOther = buildingApprovalsData?.new_other || null;
  const valueTotalRes = buildingApprovalsData?.value_total_res || null;

  return {
    buildingApprovals: totalDwellings,
    newHouses: newHouses,
    newOther: newOther,
    valueTotalRes: valueTotalRes,
    area: areaValue,
    accordTarget: accordTargetValue
  };
};

export function KeyMetrics({ selectedLGA: externalSelectedLGA, isAdminMode = false, onAdminClick }: KeyMetricsProps) {
  const [selectedLGA, setSelectedLGA] = useState(externalSelectedLGA);
  const [areaData, setAreaData] = useState<AreaData | null>(null);
  const [accordTargetData, setAccordTargetData] = useState<AccordTargetData | null>(null);
  const [buildingApprovalsData, setBuildingApprovalsData] = useState<BuildingApprovalsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAccordTarget, setIsLoadingAccordTarget] = useState(false);
  const [isLoadingBuildingApprovals, setIsLoadingBuildingApprovals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accordTargetError, setAccordTargetError] = useState<string | null>(null);
  const [buildingApprovalsError, setBuildingApprovalsError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<KeyMetricsConfig | null>(null);

  // Get stored configuration
  const getStoredConfig = (): KeyMetricsConfig => {
    const defaultConfig: KeyMetricsConfig = {
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: 'db_admin',
      passwordPath: '/users/ben/permissions/.env.admin',
      schema: 'housing_dashboard',
      table: 'search',
      areaColumn: 'areasqkm',
      accordTargetColumn: 'accord_target',
      lgaNameColumn: 'lga_name24',
      buildingApprovals: {
        enabled: true,
        schema: 'housing_dashboard',
        table: 'abs_nsw_lga_fytd',
        lgaNameColumn: 'lga_name',
        totalDwellingsColumn: 'total_dwellings',
        newHousesColumn: 'new_houses',
        newOtherColumn: 'new_other',
        valueTotalResColumn: 'value_total_res'
      },
      filterIntegration: {
        enabled: true,
        sourceCardId: 'search-geography-card',
        sourceCardType: 'search-geography-card',
        autoRefresh: true
      }
    };

    const stored = localStorage.getItem('key-metrics-config');
    if (stored) {
      try {
        const parsedConfig = JSON.parse(stored);
        // Merge with defaults to handle backward compatibility
        return {
          ...defaultConfig,
          ...parsedConfig,
          buildingApprovals: {
            ...defaultConfig.buildingApprovals,
            ...(parsedConfig.buildingApprovals || {})
          },
          filterIntegration: {
            ...defaultConfig.filterIntegration,
            ...(parsedConfig.filterIntegration || {})
          }
        };
      } catch (e) {
        console.error('Failed to parse stored key metrics config:', e);
      }
    }
    return defaultConfig;
  };

  // Fetch area data from database
  const fetchAreaData = async (lgaName: string) => {
    if (!lgaName) return;

    setIsLoading(true);
    setError(null);

    try {
      const config = getStoredConfig();

      const params = new URLSearchParams({
        action: 'getAreaData',
        schema: config.schema,
        table: config.table,
        areaColumn: config.areaColumn,
        lgaNameColumn: config.lgaNameColumn,
        lgaName: lgaName
      });

      const response = await fetch(`/api/test-search-data?${params}`);
      const result = await response.json();

      if (result.success) {
        setAreaData(result.data);
        setConnection(result.connection);
      } else {
        setError(result.error || 'Failed to fetch area data');
        setConnection(result.connection || null);
      }
    } catch (err) {
      console.error('Error fetching area data:', err);
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch accord target data from database
  const fetchAccordTargetData = async (lgaName: string) => {
    if (!lgaName) return;

    setIsLoadingAccordTarget(true);
    setAccordTargetError(null);

    try {
      const config = getStoredConfig();

      const params = new URLSearchParams({
        action: 'getAccordTargetData',
        schema: config.schema,
        table: config.table,
        accordTargetColumn: config.accordTargetColumn,
        lgaNameColumn: config.lgaNameColumn,
        lgaName: lgaName
      });

      const response = await fetch(`/api/test-search-data?${params}`);
      const result = await response.json();

      if (result.success) {
        setAccordTargetData(result.data);
        setConnection(result.connection);
      } else {
        setAccordTargetError(result.error || 'Failed to fetch accord target data');
        setConnection(result.connection || null);
      }
    } catch (err) {
      console.error('Error fetching accord target data:', err);
      setAccordTargetError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoadingAccordTarget(false);
    }
  };

  // Fetch building approvals data from abs_nsw_lga_fytd table
  const fetchBuildingApprovalsData = async (lgaName: string) => {
    if (!lgaName) return;

    const config = getStoredConfig();

    // Skip if building approvals is disabled
    if (!config.buildingApprovals.enabled) {
      console.log('[KeyMetrics] Building approvals data is disabled in config');
      return;
    }

    setIsLoadingBuildingApprovals(true);
    setBuildingApprovalsError(null);

    try {
      const params = new URLSearchParams({
        action: 'getBuildingApprovalsData',
        schema: config.buildingApprovals.schema,
        table: config.buildingApprovals.table,
        lgaNameColumn: config.buildingApprovals.lgaNameColumn,
        lgaName: lgaName
      });

      console.log('[KeyMetrics] Fetching building approvals data:', {
        lgaName,
        schema: config.buildingApprovals.schema,
        table: config.buildingApprovals.table
      });

      const response = await fetch(`/api/test-search-data?${params}`);
      const result = await response.json();

      if (result.success) {
        setBuildingApprovalsData(result.data);
        setConnection(result.connection);
        console.log('[KeyMetrics] Building approvals data loaded:', result.data);
      } else {
        setBuildingApprovalsError(result.error || 'Failed to fetch building approvals data');
        setConnection(result.connection || null);
        console.error('[KeyMetrics] Building approvals error:', result.error);
      }
    } catch (err) {
      console.error('Error fetching building approvals data:', err);
      setBuildingApprovalsError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoadingBuildingApprovals(false);
    }
  };

  // Listen for Test Search card selection changes
  useEffect(() => {
    const handleTestSearchSelection = (event: CustomEvent) => {
      const config = getStoredConfig();

      if (config.filterIntegration.enabled &&
          config.filterIntegration.sourceCardId === 'search-geography-card') {
        const { lgaName, lgaCode } = event.detail;

        console.log('[KeyMetrics] Received LGA selection:', { lgaName, lgaCode });

        setSelectedLGA({
          id: lgaCode || lgaName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: lgaName,
          region: 'NSW'
        } as LGA);

        if (config.filterIntegration.autoRefresh) {
          fetchAreaData(lgaName);
          fetchAccordTargetData(lgaName);
          fetchBuildingApprovalsData(lgaName);
        }
      }
    };

    // Listen for the custom event from Test Search card
    window.addEventListener('search-geography-lga-selected' as any, handleTestSearchSelection as any);

    return () => {
      window.removeEventListener('search-geography-lga-selected' as any, handleTestSearchSelection as any);
    };
  }, []);

  // Update when external selectedLGA changes (from other sources)
  useEffect(() => {
    const config = getStoredConfig();

    // Only use external selection if filter integration is disabled or from a different source
    if (!config.filterIntegration.enabled ||
        config.filterIntegration.sourceCardType !== 'search-geography-card') {
      setSelectedLGA(externalSelectedLGA);

      if (externalSelectedLGA?.name && config.filterIntegration.autoRefresh) {
        fetchAreaData(externalSelectedLGA.name);
        fetchAccordTargetData(externalSelectedLGA.name);
        fetchBuildingApprovalsData(externalSelectedLGA.name);
      }
    }
  }, [externalSelectedLGA]);

  // Handle double click for admin mode
  const handleDoubleClick = () => {
    if (isAdminMode) {
      const config = getStoredConfig();
      setCurrentConfig(config);
      setShowConfigForm(true);
      onAdminClick?.();
    }
  };

  const handleSaveConfig = (newConfig: KeyMetricsConfig) => {
    // Save config to localStorage
    localStorage.setItem('key-metrics-config', JSON.stringify(newConfig));
    setCurrentConfig(newConfig);

    // If auto-refresh is enabled and we have a selected LGA, fetch its data
    if (newConfig.filterIntegration.autoRefresh && selectedLGA?.name) {
      fetchAreaData(selectedLGA.name);
      fetchAccordTargetData(selectedLGA.name);
      fetchBuildingApprovalsData(selectedLGA.name);
    }
  };

  const data = getLGAData(selectedLGA, areaData, accordTargetData, buildingApprovalsData);

  return (
    <>
    <Card
      className={`shadow-lg border border-border/50 ${
        isAdminMode ? 'cursor-pointer hover:ring-2 hover:ring-purple-500 hover:shadow-purple-500/25 hover:shadow-lg transition-all' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-xl">
                {selectedLGA ? `${selectedLGA.name} Key Metrics` : 'NSW Key Metrics'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLGA ?
                  `Core housing indicators for ${selectedLGA.name}` :
                  'Statewide core housing indicators'
                }
              </p>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            {connection ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span className="text-xs text-muted-foreground">No connection</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Building Approvals (Total Dwellings)</span>
              {isLoadingBuildingApprovals && (
                <Database className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {buildingApprovalsError && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {isLoadingBuildingApprovals ? '...' : (data.buildingApprovals !== null ? data.buildingApprovals.toLocaleString() : 'N/A')}
            </div>
            <div className="text-xs text-muted-foreground">
              {buildingApprovalsError ? 'Database error' : 'FYTD Total Dwellings'}
            </div>
          </div>

          <div className="bg-chart-2/10 border border-chart-2/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-5 w-5" style={{ color: 'hsl(var(--chart-2))' }} />
              <span className="text-sm font-medium text-muted-foreground">New Houses</span>
              {isLoadingBuildingApprovals && (
                <Database className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {buildingApprovalsError && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {isLoadingBuildingApprovals ? '...' : (data.newHouses !== null ? data.newHouses.toLocaleString() : 'N/A')}
            </div>
            <div className="text-xs text-muted-foreground">
              {buildingApprovalsError ? 'Database error' : 'FYTD New Houses'}
            </div>
          </div>

          <div className="bg-chart-3/10 border border-chart-3/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-5 w-5" style={{ color: 'hsl(var(--chart-3))' }} />
              <span className="text-sm font-medium text-muted-foreground">New Other Dwellings</span>
              {isLoadingBuildingApprovals && (
                <Database className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {buildingApprovalsError && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {isLoadingBuildingApprovals ? '...' : (data.newOther !== null ? data.newOther.toLocaleString() : 'N/A')}
            </div>
            <div className="text-xs text-muted-foreground">
              {buildingApprovalsError ? 'Database error' : 'FYTD New Other'}
            </div>
          </div>

          <div className="bg-highlight/10 border border-highlight/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-highlight" />
              <span className="text-sm font-medium text-muted-foreground">Total Residential Value</span>
              {isLoadingBuildingApprovals && (
                <Database className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {buildingApprovalsError && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {isLoadingBuildingApprovals ? '...' : (data.valueTotalRes !== null ? `$${(data.valueTotalRes / 1000).toFixed(1)}M` : 'N/A')}
            </div>
            <div className="text-xs text-muted-foreground">
              {buildingApprovalsError ? 'Database error' : 'FYTD Total Value'}
            </div>
          </div>

          <div className="bg-chart-4/10 border border-chart-4/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Square className="h-5 w-5" style={{ color: 'hsl(var(--chart-4))' }} />
              <span className="text-sm font-medium text-muted-foreground">Area</span>
              {isLoading && (
                <Database className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {error && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {isLoading ? '...' : data.area.toLocaleString()} km²
            </div>
            <div className="text-xs text-muted-foreground">
              {error ? 'Database error' : 'Administrative Area'}
            </div>
          </div>

          <div className="bg-chart-4/10 border border-chart-4/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5" style={{ color: 'hsl(var(--chart-4))' }} />
              <span className="text-sm font-medium text-muted-foreground">National Housing Accord Target</span>
              {isLoadingAccordTarget && (
                <Database className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {accordTargetError && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {isLoadingAccordTarget ? '...' : (data.accordTarget ? data.accordTarget.toLocaleString() : 'N/A')}
            </div>
            <div className="text-xs text-muted-foreground">
              {accordTargetError ? 'Database error' :
               accordTargetData ? (accordTargetData.accord_target !== null ? 'Housing Target' : 'No target data available') :
               'No database connection'}
            </div>
          </div>
        </div>

        {/* Filter Status */}
        <div className="text-xs text-muted-foreground text-center pt-4 mt-4 border-t">
          {selectedLGA ?
            `Key metrics for ${selectedLGA.name}` :
            'Statewide key metrics • Select an LGA to filter'
          }
          {connection && (
            <div className="mt-1 flex items-center justify-center gap-1">
              <Database className="h-3 w-3" />
              <span>Connected to {connection.database} {connection.schema}.{connection.table}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <KeyMetricsConfigForm
      isOpen={showConfigForm}
      onClose={() => setShowConfigForm(false)}
      onSave={handleSaveConfig}
      currentConfig={currentConfig}
    />
    </>
  );
}