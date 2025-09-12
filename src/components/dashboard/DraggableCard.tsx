"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Move } from 'lucide-react';
import type { DashboardCard } from './DraggableDashboard';
import type { LGA } from '@/components/filters/LGALookup';

// Import all the dashboard components
import { LGALookup } from '@/components/filters/LGALookup';
import { LGADetails } from './LGADetails';
import { LGAInsights } from './LGAInsights';
import { KeyMetrics } from './KeyMetrics';
import { LGAMetrics } from './LGAMetrics';
import { TrendChart } from '@/components/charts/TrendChart';
import { MarketOverview } from './MarketOverview';
import { HousingSankeyChart } from '@/components/charts/HousingSankeyChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Home, DollarSign, Building, GitBranch } from "lucide-react";
import { DataSourceInfo } from "@/components/ui/data-source-info";
import { ABSDataService } from "@/lib/abs-data";

interface DraggableCardProps {
  card: DashboardCard;
  isEditMode: boolean;
  selectedLGA: LGA | null;
  onLGAChange: (lga: LGA | null) => void;
  isDragging?: boolean;
}

export function DraggableCard({ 
  card, 
  isEditMode, 
  selectedLGA, 
  onLGAChange, 
  isDragging = false 
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
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
        return <LGADetails selectedLGA={selectedLGA} />;

      case 'lga-insights':
        return <LGAInsights selectedLGA={selectedLGA} />;

      case 'key-metrics':
        return <KeyMetrics selectedLGA={selectedLGA} />;

      case 'lga-metrics':
        return <LGAMetrics selectedLGA={selectedLGA} />;

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
                  Live Data Flow
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

      case 'building-approvals-chart':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-xl">
                      Building Approvals Trends
                      {selectedLGA && (
                        <span className="text-base font-normal text-muted-foreground ml-2">
                          - {selectedLGA.name}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      {selectedLGA 
                        ? `Monthly dwelling unit approvals in ${selectedLGA.name} (Database)`
                        : 'Monthly dwelling unit approvals across NSW (Database)'
                      }
                    </CardDescription>
                  </div>
                </div>
                <DataSourceInfo dataSource={ABSDataService.getDataSource()} />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <TrendChart selectedLGA={selectedLGA} />
            </CardContent>
          </Card>
        );

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`draggable-card card-size-${card.size} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
    >
      {isEditMode && (
        <div 
          className="drag-handle absolute top-2 right-2 z-10 p-2 bg-background/80 backdrop-blur rounded cursor-move hover:bg-background"
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      {isEditMode && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-primary/20 text-primary text-xs rounded">
          {card.title}
        </div>
      )}

      <div className={isEditMode ? 'pointer-events-none' : ''}>
        {renderCardContent()}
      </div>
    </div>
  );
}