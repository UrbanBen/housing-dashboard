"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, BarChart3, Home, Building2, Square } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';
import { LGADetailsConfigForm, type LGADetailsConfig } from './LGADetailsConfigForm';
import { DataItemConfigForm, type DataItemDetailedConfig } from './DataItemConfigForm';

interface LGADetailsProps {
  selectedLGA: LGA | null;
}

// Mock data for different LGAs - in real implementation, this would come from an API
const getLGAData = (lga: LGA | null) => {
  if (!lga || lga.id === 'nsw-state') {
    // NSW State-wide aggregated data (all 128 LGAs combined)
    return {
      area: 800000, // NSW total area in km²
      buildingApprovals: 147200, // Aggregated across all NSW LGAs
      averageApprovalTime: 42,
      developmentApplications: 165300,
      approvalRate: 87,
      landReleases: 18400,
      constructionStarts: 132600,
      completions: 124800,
      medianPrice: 485000
    };
  }

  // Mock data variations based on LGA characteristics
  const baseMultiplier = (lga.population || 100000) / 100000;
  const regionMultipliers: { [key: string]: number } = {
    'Urban LGA': 1.5,
    'Rural LGA': 0.8
  };

  const regionMultiplier = regionMultipliers[lga.region] || 1;
  const finalMultiplier = baseMultiplier * regionMultiplier;

  return {
    area: lga.area || 0,
    buildingApprovals: Math.round(2840 * finalMultiplier),
    averageApprovalTime: Math.round(45 + (Math.random() - 0.5) * 20),
    developmentApplications: Math.round(3200 * finalMultiplier),
    approvalRate: Math.round(89 + (Math.random() - 0.5) * 15),
    landReleases: Math.round(450 * finalMultiplier),
    constructionStarts: Math.round(2100 * finalMultiplier),
    completions: Math.round(1850 * finalMultiplier),
    medianPrice: Math.round(485000 * (lga.region === 'Urban LGA' ? 1.8 : 0.7))
  };
};

export function LGADetails({ selectedLGA }: LGADetailsProps) {
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<LGADetailsConfig | null>(null);
  const [showDataItemForm, setShowDataItemForm] = useState(false);
  const [currentDataItem, setCurrentDataItem] = useState<{ key: string; title: string; config: DataItemDetailedConfig | null } | null>(null);

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
        avgProcessingDays: {
          enabled: true,
          title: 'Average DA Processing',
          subtitle: 'Processing Time'
        },
        developmentApplications: {
          enabled: true,
          title: 'Development Applications',
          subtitle: 'Total DAs'
        },
        landReleases: {
          enabled: true,
          title: 'Land Releases',
          subtitle: 'Lots Released'
        },
        completions: {
          enabled: true,
          title: 'Completions',
          subtitle: 'Units Completed'
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
        console.error('Failed to parse stored LGA details config:', e);
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
        console.error('Failed to parse data item config:', e);
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

  const data = getLGAData(selectedLGA);
  const config = getStoredConfig();

  // Map data item keys to their display properties
  const dataItemMap = {
    area: {
      icon: Square,
      value: `${Math.round(data.area).toLocaleString()} km²`,
      subtitle: 'Administrative Area'
    },
    avgProcessingDays: {
      icon: Clock,
      value: `${data.averageApprovalTime} days`,
      subtitle: 'Processing Time'
    },
    developmentApplications: {
      icon: BarChart3,
      value: data.developmentApplications.toLocaleString(),
      subtitle: 'Total DAs'
    },
    landReleases: {
      icon: Home,
      value: data.landReleases.toLocaleString(),
      subtitle: 'Lots Released'
    },
    completions: {
      icon: Building2,
      value: data.completions.toLocaleString(),
      subtitle: 'Units Completed'
    }
  };

  // Filter enabled data items
  const enabledItems = Object.entries(config.dataItems).filter(([_, item]) => item.enabled);

  return (
    <>
    <Card className="shadow-lg border border-border/50 h-fit cursor-pointer hover:ring-2 hover:ring-primary/50 hover:shadow-lg transition-all" onDoubleClick={handleDoubleClick}>
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