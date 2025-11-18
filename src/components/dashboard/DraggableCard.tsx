"use client";

import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Move, Trash2 } from 'lucide-react';
import type { DashboardCard } from './DraggableDashboard';
import type { LGA } from '@/components/filters/LGALookup';

// Import all the dashboard components
import { LGALookup } from '@/components/filters/LGALookup';
import { LGAMap } from '@/components/maps/LGAMap';
import { LGADetails } from './LGADetails';
import { LGAInsights } from './LGAInsights';
import { KeyMetrics } from './KeyMetrics';
import { LGAMetrics } from './LGAMetrics';
import { TrendChart, type TrendChartRef } from '@/components/charts/TrendChart';
import { LGADwellingApprovalsChart, type LGADwellingApprovalsChartRef } from '@/components/charts/LGADwellingApprovalsChart';
import { MarketOverview } from './MarketOverview';
import { HousingSankeyChart } from '@/components/charts/HousingSankeyChart';
import { TestCard } from './TestCard';
import { TestSearchCard } from './TestSearchCard';
import { ABSLGAMap } from './ABSLGAMap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, TrendingDown, Activity, Home, DollarSign, Building, GitBranch, MapPin,
  Settings, Map, BarChart3, LineChart, PieChart, Users, Grid3X3, Layout, Calendar,
  Clock, FileText, Percent, Hash
} from "lucide-react";
import { DataSourceInfo } from "@/components/ui/data-source-info";
import { ABSDataService } from "@/lib/abs-data";

interface DraggableCardProps {
  card: DashboardCard;
  isEditMode: boolean;
  isAdminMode?: boolean;
  selectedLGA: LGA | null;
  onLGAChange: (lga: LGA | null) => void;
  isDragging?: boolean;
  effectiveColumns?: number;
  onDeleteCard?: (cardId: string) => void;
}

export function DraggableCard({
  card,
  isEditMode,
  isAdminMode = false,
  selectedLGA,
  onLGAChange,
  isDragging = false,
  effectiveColumns = 4,
  onDeleteCard
}: DraggableCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rowSpan, setRowSpan] = React.useState(1);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    disabled: false, // Allow dragging to rearrange cards
    animateLayoutChanges: () => false,
  });

  // Debug logging
  React.useEffect(() => {
    console.log('[DraggableCard] Render state:', {
      cardId: card.id,
      cardTitle: card.title,
      isEditMode,
      isAdminMode,
      isSortableDragging,
      shouldShowDelete: isEditMode && !isSortableDragging
    });
  }, [isEditMode, isAdminMode, isSortableDragging, card.id, card.title]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isSortableDragging ? 0.5 : 1,
    willChange: isDragging ? 'transform' : 'auto',
  };

  const renderCardContent = () => {
    switch (card.type) {
      case 'lga-lookup':
        return (
                      <LGALookup
              selectedLGA={selectedLGA}
              onLGAChange={onLGAChange}
            />
          
        );

      case 'lga-details':
        return (
                      <LGADetails selectedLGA={selectedLGA} />
          
        );

      case 'lga-insights':
        return (
                      <LGAInsights selectedLGA={selectedLGA} effectiveColumns={effectiveColumns} />
          
        );

      case 'key-metrics':
        return (
          <KeyMetrics
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'lga-metrics':
        return (
                      <LGAMetrics selectedLGA={selectedLGA} />
          
        );

      case 'housing-pipeline':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-6 w-6 text-primary" />
                  <div>
                                          <CardTitle className="text-xl">Housing Development Pipeline</CardTitle>
                    
                                          <CardDescription className="text-base mt-1">
                        End-to-end flow from land release through to building completion
                      </CardDescription>
                    
                  </div>
                </div>
                                  <div className="text-xs bg-highlight/10 text-highlight px-3 py-1 rounded-full font-medium">
                    Active Pipeline
                  </div>
                
              </div>
            </CardHeader>
            <CardContent className="pt-2">
                              <div className="h-96">
                  <HousingSankeyChart />
                </div>
              
            </CardContent>
          </Card>
        );

      case 'building-approvals-chart': {
        // Data Source: Database mosaic_pro, Schema public, Table abs_building_approvals_lga
        // Currently showing NSW state-wide totals (LGA filtering to be implemented)
        const chartRef = useRef<TrendChartRef>(null);

        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader
              className="pb-4 cursor-pointer"
              onDoubleClick={() => chartRef.current?.openConfig()}
              title="Double-click to configure"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-primary" />
                  <div>
                                          <CardTitle className="text-xl">
                        Building Approvals
                        {selectedLGA && (
                          <span className="text-base font-normal text-muted-foreground ml-2">
                            - {selectedLGA.name}
                          </span>
                        )}
                      </CardTitle>

                                          <CardDescription className="text-base mt-1">
                        {selectedLGA
                          ? `Monthly dwelling approvals in ${selectedLGA.name}`
                          : 'Monthly dwelling approvals across NSW (Jul 2021 - Dec 2024)'
                        }
                      </CardDescription>

                  </div>
                </div>
                                  <DataSourceInfo dataSource={ABSDataService.getDataSource()} />

              </div>
            </CardHeader>
            <CardContent className="pt-2">
                              <TrendChart ref={chartRef} selectedLGA={selectedLGA} />

            </CardContent>
          </Card>
        );
      }

      case 'lga-dwelling-approvals': {
        // Data Source: Database research&insights, Schema housing_dashboard, Table building_approvals_nsw_lga
        // Shows LGA-specific dwelling approvals (requires database permissions)
        console.log('[DraggableCard lga-dwelling-approvals] Rendering with selectedLGA:', selectedLGA);
        const chartRef = useRef<LGADwellingApprovalsChartRef>(null);

        return (
          <Card className="shadow-lg border-2 border-[#00FF41]/30 hover:border-[#00FF41] transition-colors">
            <CardHeader
              className="pb-4 cursor-pointer"
              onDoubleClick={() => chartRef.current?.openConfig()}
              title="Double-click to configure"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LineChart className="h-6 w-6 text-[#00FF41]" />
                  <div>
                    <CardTitle className="text-xl text-white">
                      Dwelling Approvals by LGA
                      {selectedLGA && (
                        <span className="text-base font-normal text-muted-foreground ml-2">
                          - {selectedLGA.name}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      {selectedLGA
                        ? `Number of approved dwellings in ${selectedLGA.name}`
                        : 'Select an LGA to view dwelling approvals'
                      }
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <LGADwellingApprovalsChart ref={chartRef} selectedLGA={selectedLGA} />
            </CardContent>
          </Card>
        );
      }

      case 'market-overview':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center gap-3 text-xl">
                  <Activity className="h-6 w-6 text-chart-2" />
                  Market Overview
                </CardTitle>
              
                              <CardDescription className="text-base">
                  Key housing market indicators and health metrics comparison
                </CardDescription>
              
            </CardHeader>
            <CardContent className="pt-2">
                              <MarketOverview />
              
            </CardContent>
          </Card>
        );

      case 'kpi-cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Median Home Price</CardTitle>
                  <DollarSign className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">$485,200</div>
                  <p className="text-sm flex items-center text-primary">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +2.4% from last month
                  </p>
                </CardContent>
              </Card>
            

                          <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-chart-2/5 to-transparent"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Market Velocity</CardTitle>
                  <Activity className="h-5 w-5 text-chart-2" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">18 days</div>
                  <p className="text-sm flex items-center text-chart-2">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    -3 days from last month
                  </p>
                </CardContent>
              </Card>
            

                          <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-chart-3/5 to-transparent"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Housing Inventory</CardTitle>
                  <Home className="h-5 w-5 text-chart-3" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">2,847</div>
                  <p className="text-sm flex items-center text-chart-3">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +8.2% from last month
                  </p>
                </CardContent>
              </Card>
            

                          <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-highlight/5 to-transparent"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Price-to-Income Ratio</CardTitle>
                  <TrendingUp className="h-5 w-5 text-highlight" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">4.2x</div>
                  <p className="text-sm flex items-center text-highlight">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +0.3 from last quarter
                  </p>
                </CardContent>
              </Card>
            
          </div>
        );

      case 'market-forecast':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Market Forecast
                </CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                                  <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="text-sm font-medium text-foreground">Next Quarter</span>
                    <span className="font-bold text-lg text-primary">+3.2%</span>
                  </div>
                
                                  <div className="flex justify-between items-center p-3 rounded-lg bg-chart-2/5 border border-chart-2/10">
                    <span className="text-sm font-medium text-foreground">Next Year</span>
                    <span className="font-bold text-lg text-chart-2">+12.8%</span>
                  </div>
                
                                  <div className="flex justify-between items-center p-3 rounded-lg bg-highlight/5 border border-highlight/10">
                    <span className="text-sm font-medium text-foreground">Confidence Level</span>
                    <span className="font-bold text-xl text-highlight animate-pulse">85%</span>
                  </div>
                
              </div>
            </CardContent>
          </Card>
        );

      case 'regional-comparison':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Home className="h-5 w-5 text-chart-3" />
                  Regional Comparison
                </CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Metro Average</span>
                    <span className="font-bold text-lg text-foreground">$467,100</span>
                  </div>
                
                                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                    <span className="text-sm font-medium text-muted-foreground">State Average</span>
                    <span className="font-bold text-lg text-foreground">$421,900</span>
                  </div>
                
                                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                    <span className="text-sm font-medium text-muted-foreground">National Average</span>
                    <span className="font-bold text-lg text-foreground">$398,500</span>
                  </div>
                
              </div>
            </CardContent>
          </Card>
        );

      case 'data-freshness':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-chart-4" />
                  Data Freshness
                </CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Price Data</span>
                    <span className="text-sm bg-primary/15 text-primary px-3 py-1.5 rounded-full font-semibold">
                      Real-time
                    </span>
                  </div>
                
                                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Inventory</span>
                    <span className="text-sm bg-chart-2/15 text-chart-2 px-3 py-1.5 rounded-full font-semibold">
                      Daily
                    </span>
                  </div>
                
                                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Market Stats</span>
                    <span className="text-sm bg-chart-3/15 text-chart-3 px-3 py-1.5 rounded-full font-semibold">
                      Weekly
                    </span>
                  </div>
                
              </div>
            </CardContent>
          </Card>
        );

      case 'abs-geography-search':
        return (
                      <LGALookup
              selectedLGA={selectedLGA || null}
              onLGAChange={onLGAChange || (() => {})}
            />
          
        );

      case 'abs-lga-map':
        return (
          <ABSLGAMap
            selectedLGA={selectedLGA || null}
            effectiveColumns={effectiveColumns}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
            filterSourceCardId="search-geography-card"
          />
        );

      // New template types from AdminToolbar
      case 'blank-card':
        return (
          <Card className="shadow-lg border border-border/50 min-h-[200px]">
            <CardHeader>
                              <CardTitle>Blank Card</CardTitle>
              
                              <CardDescription>Click to configure data source and content</CardDescription>
              
            </CardHeader>
            <CardContent className="flex items-center justify-center h-32">
                              <div className="text-center text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2" />
                  <p>Configure this card</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'geography-search':
        return (
                      <LGALookup
              selectedLGA={selectedLGA}
              onLGAChange={onLGAChange}
            />
          
        );

      case 'interactive-map':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Interactive Map
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Map className="h-12 w-12 mx-auto mb-2" />
                    <p>Interactive Map Component</p>
                    <p className="text-xs">Configure data source to display boundaries</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'location-details':
        return (
                      <LGADetails selectedLGA={selectedLGA} />
          
        );

      case 'bar-chart':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Bar Chart
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Bar Chart Visualization</p>
                    <p className="text-xs">Configure data source and display options</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'line-chart':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Line Chart
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <LineChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Line Chart Visualization</p>
                    <p className="text-xs">Configure data source for time series</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'pie-chart':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Pie Chart
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-2" />
                    <p>Pie Chart Visualization</p>
                    <p className="text-xs">Configure data source for proportional breakdown</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'trend-chart':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trend Analysis
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                    <p>Advanced Trend Analysis</p>
                    <p className="text-xs">Configure data source with forecasting</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'housing-affordability':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Housing Affordability
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <p className="text-2xl font-bold">3.2x</p>
                      <p className="text-sm text-muted-foreground">Price-to-Income Ratio</p>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <p className="text-2xl font-bold">28%</p>
                      <p className="text-sm text-muted-foreground">Mortgage Stress Rate</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Configure data source for live affordability metrics</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'property-values':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Property Values
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="space-y-4">
                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <p className="text-3xl font-bold">$850,000</p>
                    <p className="text-sm text-muted-foreground">Median House Price</p>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Configure data source for property valuations</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'population-metrics':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Population Data
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <p className="text-2xl font-bold">125,000</p>
                      <p className="text-sm text-muted-foreground">Total Population</p>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <p className="text-2xl font-bold">2.1%</p>
                      <p className="text-sm text-muted-foreground">Growth Rate</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Configure data source for demographics</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'development-stats':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Development Statistics
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <p className="text-2xl font-bold">1,200</p>
                      <p className="text-sm text-muted-foreground">Housing Target</p>
                    </div>
                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                      <p className="text-2xl font-bold">450</p>
                      <p className="text-sm text-muted-foreground">Units Approved</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Configure data source for construction data</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'data-table':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  Data Table
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Grid3X3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Data Table Component</p>
                    <p className="text-xs">Configure data source for tabular display</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'comparison-table':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Comparison Table
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Layout className="h-12 w-12 mx-auto mb-2" />
                    <p>Area Comparison Component</p>
                    <p className="text-xs">Configure data source for side-by-side comparisons</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'time-series':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Time Series
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="h-48 bg-muted/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2" />
                    <p>Historical Data Visualization</p>
                    <p className="text-xs">Configure data source for time-based analysis</p>
                  </div>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'progress-tracker':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Progress Tracker
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="space-y-4">
                  <div className="bg-muted/20 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Housing Target Progress</span>
                      <span className="text-sm font-bold">38%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '38%' }}></div>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Configure data source for goal tracking</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'insights-panel':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Insights Panel
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="space-y-3">
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-sm">🏠 Housing demand is outpacing supply by 15%</p>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <p className="text-sm">📈 Property values increased 8.2% this quarter</p>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Configure data source for AI-generated insights</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'percentage-display':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Percentage Display
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="text-center p-6">
                  <p className="text-6xl font-bold text-primary">85%</p>
                  <p className="text-sm text-muted-foreground mt-2">Configure metric name and data source</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'counter-display':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Counter Display
                </CardTitle>
              
            </CardHeader>
            <CardContent>
                              <div className="text-center p-6">
                  <p className="text-6xl font-bold text-primary">1,247</p>
                  <p className="text-sm text-muted-foreground mt-2">Configure counter name and data source</p>
                </div>
              
            </CardContent>
          </Card>
        );

      case 'test-card':
        return (
          <TestCard
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
            title="Test"
          />
        );

      case 'search-geography-card':
        return (
          <TestSearchCard
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
            selectedLGA={selectedLGA}
            onLGAChange={onLGAChange}
          />
        );

      default:
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <CardTitle>Unknown Card Type</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Card type "{card.type}" not implemented</p>
            </CardContent>
          </Card>
        );
    }
  };

  const getColumnSpan = () => {
    const baseSpan = {
      'small': 1,
      'medium': 2,
      'large': 3,
      'xl': 4
    }[card.size] || 1;

    return Math.min(baseSpan, effectiveColumns);
  };

  // Calculate row span based on actual content height
  const updateRowSpan = React.useCallback(() => {
    if (cardRef.current) {
      // Special override for housing-pipeline card
      if (card.id === 'housing-pipeline') {
        setRowSpan(15);
        console.log(`🔍 Card: ${card.id} (size: ${card.size}) - FORCED to 15 rows`);
        return;
      }

      // Special override for kpi-cards card
      if (card.id === 'kpi-cards') {
        setRowSpan(4);
        console.log(`🔍 Card: ${card.id} (size: ${card.size}) - FORCED to 4 rows`);
        return;
      }

      const cardHeight = cardRef.current.offsetHeight;
      const gap = 16; // 1rem gap
      const rowHeight = 20; // grid-auto-rows value

      // Calculate how many 20px rows this card needs
      const calculatedRowSpan = Math.ceil((cardHeight + gap) / (rowHeight + gap));

      // Expected rowSpan based on min-height for each size
      const expectedRowSpan = {
        small: Math.ceil((240 + gap) / (rowHeight + gap)),   // ~7 rows
        medium: Math.ceil((412 + gap) / (rowHeight + gap)),  // ~12 rows
        large: Math.ceil((784 + gap) / (rowHeight + gap)),   // ~22 rows
        xl: Math.ceil((1056 + gap) / (rowHeight + gap))      // ~30 rows
      }[card.size] || calculatedRowSpan;

      // Use the maximum of calculated or expected to ensure card doesn't shrink
      const finalRowSpan = Math.max(calculatedRowSpan, expectedRowSpan);

      // DIAGNOSTIC LOGGING
      console.log(`🔍 Card: ${card.id} (size: ${card.size})`, {
        offsetHeight: cardHeight,
        calculatedRowSpan,
        expectedRowSpan,
        finalRowSpan,
        expectedMinHeight: {
          small: 240,
          medium: 412,
          large: 784,
          xl: 1056
        }[card.size],
        scrollHeight: cardRef.current.scrollHeight,
        clientHeight: cardRef.current.clientHeight,
        boundingRect: cardRef.current.getBoundingClientRect().height
      });

      setRowSpan(finalRowSpan);
    }
  }, [card.id, card.size]);

  // Update row span when component mounts and when content changes
  React.useEffect(() => {
    updateRowSpan();

    // Set up ResizeObserver to update when card content changes
    const resizeObserver = new ResizeObserver(updateRowSpan);
    if (cardRef.current) {
      resizeObserver.observe(cardRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [updateRowSpan, selectedLGA, effectiveColumns]);


  // Combined ref callback
  const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    cardRef.current = node;
  }, [setNodeRef]);

  return (
    <>
      <div
        ref={combinedRef}
        style={{
          ...style,
          gridColumn: `span ${getColumnSpan()}`,
          gridRowEnd: `span ${rowSpan}`
        }}
        className={`draggable-card ${isDragging ? 'dragging' : ''}`}
        data-card-id={card.id}
        data-size={card.size}
        suppressHydrationWarning={true}
        {...(isAdminMode ? {} : attributes)}
      >
      {/* Edit Mode Controls - Delete and Drag Handle */}
      {isEditMode && !isSortableDragging && (
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-2 bg-red-500/80 backdrop-blur rounded cursor-pointer hover:bg-red-600 transition-all opacity-80 hover:opacity-100"
            title="Delete card"
          >
            <Trash2 className="h-4 w-4 text-white" />
          </button>

          {/* Drag Handle - Small grab area */}
          <div
            className="p-2 bg-background/80 backdrop-blur rounded cursor-move hover:bg-background transition-all opacity-60 hover:opacity-100"
            {...listeners}
            title="Drag to rearrange"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {!isEditMode && !isSortableDragging && (
        <div
          className="drag-handle absolute top-2 right-2 z-10 p-2 bg-background/80 backdrop-blur rounded cursor-move hover:bg-background transition-all opacity-60 hover:opacity-100"
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {isAdminMode && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-purple-500/90 text-white text-xs rounded flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Click to configure
        </div>
      )}


      <div className={isEditMode ? 'pointer-events-none' : (isAdminMode ? 'pointer-events-auto' : '')}>
        {renderCardContent()}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-background border-2 border-red-500/50 rounded-lg p-6 max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-500/20 rounded-full">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">Delete Card?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Are you sure you want to delete "{card.title}"? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (onDeleteCard) {
                        onDeleteCard(card.id);
                      }
                      setShowDeleteConfirm(false);
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>


    </>
  );
}