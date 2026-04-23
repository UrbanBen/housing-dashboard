"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BarChart3, Square } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';
import { LGADetailsConfigForm, type LGADetailsConfig } from './LGADetailsConfigForm';
import { DataItemConfigForm, type DataItemDetailedConfig } from './DataItemConfigForm';
import { createComponentLogger } from '@/lib/logger';

interface LGADetailsProps {
  selectedLGA: LGA | null;
}

const logger = createComponentLogger('LGADetails');

export function LGADetails({ selectedLGA }: LGADetailsProps) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<LGADetailsConfig | null>(null);
  const [showDataItemForm, setShowDataItemForm] = useState(false);
  const [currentDataItem, setCurrentDataItem] = useState<{ key: string; title: string; config: DataItemDetailedConfig | null } | null>(null);
  const [areaData, setAreaData] = useState<number | null>(null);
  const [isLoadingArea, setIsLoadingArea] = useState(false);
  const [censusData, setCensusData] = useState<any>(null);
  const [isLoadingCensus, setIsLoadingCensus] = useState(false);

  // Get stored configuration
  const getStoredConfig = (): LGADetailsConfig => {
    const defaultConfig: LGADetailsConfig = {
      host: 'mecone-data-lake.postgres.database.azure.com',
      port: 5432,
      database: 'research&insights',
      user: 'db_admin',
      passwordPath: '/users/ben/permissions/.env.admin',
      schema: 'housing_dashboard',
      table: 'search',
      lgaNameColumn: 'lga_name24',
      filterIntegration: {
        enabled: true,
        sourceCardId: 'search-geography-card',
        sourceCardType: 'search-geography-card',
        autoRefresh: true
      },
      dataItems: {
        area: {
          enabled: true,
          title: 'Area',
          subtitle: 'Administrative Area'
        },
        populationDensity: {
          enabled: true,
          title: 'Population Density',
          subtitle: 'People per km²'
        }
      }
    };

    // Check if we're in the browser before accessing localStorage
    if (typeof window === 'undefined') {
      return defaultConfig;
    }

    const stored = localStorage.getItem('lga-details-config');
    if (stored) {
      try {
        const parsedConfig = JSON.parse(stored);
        return {
          ...defaultConfig,
          ...parsedConfig,
          filterIntegration: {
            ...defaultConfig.filterIntegration,
            ...(parsedConfig.filterIntegration || {})
          },
          dataItems: {
            ...defaultConfig.dataItems,
            ...(parsedConfig.dataItems || {})
          }
        };
      } catch (e) {
        logger.error('Failed to parse stored LGA details config', e );
      }
    }
    return defaultConfig;
  };

  // Handle double click to configure card
  const handleDoubleClick = () => {
    const config = getStoredConfig();
    setCurrentConfig(config);
    setShowConfigForm(true);
  };

  const handleSaveConfig = (newConfig: LGADetailsConfig) => {
    localStorage.setItem('lga-details-config', JSON.stringify(newConfig));
    setCurrentConfig(newConfig);
  };

  // Handle double click on individual data item
  const handleDataItemDoubleClick = (key: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const stored = localStorage.getItem(`lga-details-data-item-${key}`);
    let itemConfig: DataItemDetailedConfig | null = null;

    if (stored) {
      try {
        itemConfig = JSON.parse(stored);
      } catch (e) {
        logger.error('Failed to parse data item config', e );
      }
    }

    setCurrentDataItem({ key, title, config: itemConfig });
    setShowDataItemForm(true);
  };

  const handleSaveDataItemConfig = (config: DataItemDetailedConfig) => {
    if (!currentDataItem) return;
    localStorage.setItem(`lga-details-data-item-${currentDataItem.key}`, JSON.stringify(config));
    setShowDataItemForm(false);
    setCurrentDataItem(null);
  };

  // Fetch area data from database when LGA changes
  useEffect(() => {
    const fetchAreaData = async () => {
      if (!selectedLGA || selectedLGA.id === 'nsw-state') {
        // For NSW state-wide, use hardcoded value
        setAreaData(800000);
        return;
      }

      setIsLoadingArea(true);

      try {
        const config = getStoredConfig();
        const params = new URLSearchParams({
          action: 'getAreaData',
          schema: config.schema,
          table: config.table,
          areaColumn: 'areasqkm',
          lgaNameColumn: config.lgaNameColumn,
          lgaName: selectedLGA.name
        });

        const response = await fetch(`/api/test-search-data?${params}`);
        const result = await response.json();

        if (result.success && result.data) {
          setAreaData(result.data.area_sqkm);
        } else {
          logger.warn('Area data not found, using fallback', { error: result.error });
          setAreaData(selectedLGA.area || 0);
        }
      } catch (error) {
        logger.error('Error fetching area data', { error });
        setAreaData(selectedLGA.area || 0);
      } finally {
        setIsLoadingArea(false);
      }
    };

    fetchAreaData();
  }, [selectedLGA]);

  // Fetch census data from card_details table
  useEffect(() => {
    const fetchCensusData = async () => {
      if (!selectedLGA) {
        setCensusData(null);
        return;
      }

      setIsLoadingCensus(true);

      try {
        const lgaName = selectedLGA.id === 'nsw-state' ? 'NSW' : selectedLGA.name;
        const response = await fetch(`/api/census-data?lgaName=${encodeURIComponent(lgaName)}`);
        const result = await response.json();

        if (result.success && result.data) {
          setCensusData(result.data);
        } else {
          logger.warn('Census data not found', { error: result.error });
          setCensusData(null);
        }
      } catch (error) {
        logger.error('Error fetching census data', { error });
        setCensusData(null);
      } finally {
        setIsLoadingCensus(false);
      }
    };

    fetchCensusData();
  }, [selectedLGA]);

  const config = getStoredConfig();

  // Map data item keys to their display properties
  const dataItemMap = {
    area: {
      icon: Square,
      value: isLoadingArea ? 'Loading...' : `${Math.round(areaData || 0).toLocaleString()} km²`,
      subtitle: 'Administrative Area'
    },
    populationDensity: {
      icon: Users,
      value: isLoadingCensus ? 'Loading...' : censusData?.population_density ? `${censusData.population_density.toLocaleString()} per km²` : 'N/A',
      subtitle: 'Population Density (2026)'
    }
  };

  // Filter enabled data items
  const enabledItems = Object.entries(config.dataItems).filter(([_, item]) => item.enabled);

  return (
    <>
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50 h-fit cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-lg transition-all" onDoubleClick={handleDoubleClick}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">
              {selectedLGA ? `${selectedLGA.name} Details` : 'NSW Processing Details'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLGA ? 
                `Processing and context data for ${selectedLGA.name}` : 
                'Statewide processing metrics and context'
              }
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {enabledItems.map(([key, item]) => {
            const itemData = dataItemMap[key as keyof typeof dataItemMap];
            if (!itemData) return null;

            const Icon = itemData.icon;

            return (
              <div
                key={key}
                className="bg-primary/5 border border-primary/10 rounded-lg p-4 hover:bg-primary/10 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                onDoubleClick={(e) => handleDataItemDoubleClick(key, item.title, e)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">{item.title}</span>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {itemData.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {item.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Status */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {selectedLGA ?
            `All data filtered for ${selectedLGA.name}` :
            'Showing statewide data • Select an LGA to filter'
          }
        </div>
      </CardContent>
    </Card>

    <LGADetailsConfigForm
      isOpen={showConfigForm}
      onClose={() => setShowConfigForm(false)}
      onSave={handleSaveConfig}
      currentConfig={currentConfig}
    />

    <DataItemConfigForm
      isOpen={showDataItemForm}
      onClose={() => {
        setShowDataItemForm(false);
        setCurrentDataItem(null);
      }}
      onSave={handleSaveDataItemConfig}
      currentConfig={currentDataItem?.config || null}
      itemTitle={currentDataItem?.title || ''}
    />
    </>
  );
}