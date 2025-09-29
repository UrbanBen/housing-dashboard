"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Move } from 'lucide-react';
import type { DashboardCard } from './DraggableDashboard';
import type { LGA } from '@/components/filters/LGALookup';
import type { ABSLGA } from '@/components/filters/ABSLGALookup';

// Import all the dashboard components
import { LGALookup } from '@/components/filters/LGALookup';
import { ABSLGALookup } from '@/components/filters/ABSLGALookup';
import { ABSLGAMap } from '@/components/maps/ABSLGAMap';
import { LGADetails } from './LGADetails';
import { LGAInsights } from './LGAInsights';
import { KeyMetrics } from './KeyMetrics';
import { LGAMetrics } from './LGAMetrics';
import { TrendChart } from '@/components/charts/TrendChart';
import { MarketOverview } from './MarketOverview';
import { HousingSankeyChart } from '@/components/charts/HousingSankeyChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Home, DollarSign, Building, GitBranch, MapPin } from "lucide-react";
import { DataSourceInfo } from "@/components/ui/data-source-info";
import { ABSDataService } from "@/lib/abs-data";
import { AdminConfigForm } from './AdminConfigForm';

interface DraggableCardProps {
  card: DashboardCard;
  isEditMode: boolean;
  isAdminMode?: boolean;
  selectedLGA: LGA | null;
  onLGAChange: (lga: LGA | null) => void;
  selectedABSLGA?: ABSLGA | null;
  onABSLGAChange?: (lga: ABSLGA | null) => void;
  isDragging?: boolean;
  effectiveColumns?: number;
}

export function DraggableCard({
  card,
  isEditMode,
  isAdminMode = false,
  selectedLGA,
  onLGAChange,
  selectedABSLGA,
  onABSLGAChange,
  isDragging = false,
  effectiveColumns = 4
}: DraggableCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [rowSpan, setRowSpan] = React.useState(1);
  const [showAdminForm, setShowAdminForm] = React.useState(false);
  const [selectedDataItem, setSelectedDataItem] = React.useState<string | undefined>(undefined);
  const [selectedDataItems, setSelectedDataItems] = React.useState<Set<string>>(new Set());

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    disabled: isAdminMode, // Disable dragging in admin mode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const renderCardContent = () => {
    switch (card.type) {
      case 'lga-lookup':
        return (
          <AdminClickableWrapper dataItemName="Geography Search Component" className="p-1 -m-1">
            <LGALookup
              selectedLGA={selectedLGA}
              onLGAChange={onLGAChange}
            />
          </AdminClickableWrapper>
        );

      case 'lga-details':
        return (
          <AdminClickableWrapper dataItemName="LGA Details Component" className="p-1 -m-1">
            <LGADetails selectedLGA={selectedLGA} />
          </AdminClickableWrapper>
        );

      case 'lga-insights':
        return (
          <AdminClickableWrapper dataItemName="LGA Map Component" className="p-1 -m-1">
            <LGAInsights selectedLGA={selectedLGA} effectiveColumns={effectiveColumns} />
          </AdminClickableWrapper>
        );

      case 'key-metrics':
        return (
          <AdminClickableWrapper dataItemName="Key Metrics Component" className="p-1 -m-1">
            <KeyMetrics selectedLGA={selectedLGA} />
          </AdminClickableWrapper>
        );

      case 'lga-metrics':
        return (
          <AdminClickableWrapper dataItemName="LGA Metrics Component" className="p-1 -m-1">
            <LGAMetrics selectedLGA={selectedLGA} />
          </AdminClickableWrapper>
        );

      case 'housing-pipeline':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-6 w-6 text-primary" />
                  <div>
                    <AdminClickableWrapper dataItemName="Pipeline Title" className="p-1 -m-1">
                      <CardTitle className="text-xl">Housing Development Pipeline</CardTitle>
                    </AdminClickableWrapper>
                    <AdminClickableWrapper dataItemName="Pipeline Description" className="p-1 -m-1">
                      <CardDescription className="text-base mt-1">
                        End-to-end flow from land release through to building completion
                      </CardDescription>
                    </AdminClickableWrapper>
                  </div>
                </div>
                <AdminClickableWrapper dataItemName="Data Flow Status" className="p-1 -m-1">
                  <div className="text-xs bg-highlight/10 text-highlight px-3 py-1 rounded-full font-medium">
                    Live Data Flow
                  </div>
                </AdminClickableWrapper>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <AdminClickableWrapper dataItemName="Sankey Chart Data" className="p-1 -m-1">
                <div className="h-96">
                  <HousingSankeyChart />
                </div>
              </AdminClickableWrapper>
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
                    <AdminClickableWrapper dataItemName="Chart Title" className="p-1 -m-1">
                      <CardTitle className="text-xl">
                        Building Approvals Trends
                        {selectedLGA && (
                          <span className="text-base font-normal text-muted-foreground ml-2">
                            - {selectedLGA.name}
                          </span>
                        )}
                      </CardTitle>
                    </AdminClickableWrapper>
                    <AdminClickableWrapper dataItemName="Chart Description" className="p-1 -m-1">
                      <CardDescription className="text-base mt-1">
                        {selectedLGA
                          ? `Monthly dwelling unit approvals in ${selectedLGA.name} (Database)`
                          : 'Monthly dwelling unit approvals across NSW (Database)'
                        }
                      </CardDescription>
                    </AdminClickableWrapper>
                  </div>
                </div>
                <AdminClickableWrapper dataItemName="Data Source" className="p-1 -m-1">
                  <DataSourceInfo dataSource={ABSDataService.getDataSource()} />
                </AdminClickableWrapper>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <AdminClickableWrapper dataItemName="Trend Chart Data" className="p-1 -m-1">
                <TrendChart selectedLGA={selectedLGA} />
              </AdminClickableWrapper>
            </CardContent>
          </Card>
        );

      case 'market-overview':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
              <AdminClickableWrapper dataItemName="Market Overview Title" className="p-1 -m-1">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Activity className="h-6 w-6 text-chart-2" />
                  Market Overview
                </CardTitle>
              </AdminClickableWrapper>
              <AdminClickableWrapper dataItemName="Market Overview Description" className="p-1 -m-1">
                <CardDescription className="text-base">
                  Key housing market indicators and health metrics comparison
                </CardDescription>
              </AdminClickableWrapper>
            </CardHeader>
            <CardContent className="pt-2">
              <AdminClickableWrapper dataItemName="Market Overview Data" className="p-1 -m-1">
                <MarketOverview />
              </AdminClickableWrapper>
            </CardContent>
          </Card>
        );

      case 'kpi-cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <AdminClickableWrapper dataItemName="Median Home Price KPI" className="p-1 -m-1">
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
            </AdminClickableWrapper>

            <AdminClickableWrapper dataItemName="Market Velocity KPI" className="p-1 -m-1">
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
            </AdminClickableWrapper>

            <AdminClickableWrapper dataItemName="Housing Inventory KPI" className="p-1 -m-1">
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
            </AdminClickableWrapper>

            <AdminClickableWrapper dataItemName="Price-to-Income Ratio KPI" className="p-1 -m-1">
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
            </AdminClickableWrapper>
          </div>
        );

      case 'market-forecast':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <AdminClickableWrapper dataItemName="Market Forecast Title" className="p-1 -m-1">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Market Forecast
                </CardTitle>
              </AdminClickableWrapper>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <AdminClickableWrapper dataItemName="Next Quarter Forecast" className="p-1 -m-1">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="text-sm font-medium text-foreground">Next Quarter</span>
                    <span className="font-bold text-lg text-primary">+3.2%</span>
                  </div>
                </AdminClickableWrapper>
                <AdminClickableWrapper dataItemName="Next Year Forecast" className="p-1 -m-1">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-chart-2/5 border border-chart-2/10">
                    <span className="text-sm font-medium text-foreground">Next Year</span>
                    <span className="font-bold text-lg text-chart-2">+12.8%</span>
                  </div>
                </AdminClickableWrapper>
                <AdminClickableWrapper dataItemName="Confidence Level" className="p-1 -m-1">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-highlight/5 border border-highlight/10">
                    <span className="text-sm font-medium text-foreground">Confidence Level</span>
                    <span className="font-bold text-xl text-highlight animate-pulse">85%</span>
                  </div>
                </AdminClickableWrapper>
              </div>
            </CardContent>
          </Card>
        );

      case 'regional-comparison':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <AdminClickableWrapper dataItemName="Regional Comparison Title" className="p-1 -m-1">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Home className="h-5 w-5 text-chart-3" />
                  Regional Comparison
                </CardTitle>
              </AdminClickableWrapper>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <AdminClickableWrapper dataItemName="Metro Average" className="p-1 -m-1">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Metro Average</span>
                    <span className="font-bold text-lg text-foreground">$467,100</span>
                  </div>
                </AdminClickableWrapper>
                <AdminClickableWrapper dataItemName="State Average" className="p-1 -m-1">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                    <span className="text-sm font-medium text-muted-foreground">State Average</span>
                    <span className="font-bold text-lg text-foreground">$421,900</span>
                  </div>
                </AdminClickableWrapper>
                <AdminClickableWrapper dataItemName="National Average" className="p-1 -m-1">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-card border border-border">
                    <span className="text-sm font-medium text-muted-foreground">National Average</span>
                    <span className="font-bold text-lg text-foreground">$398,500</span>
                  </div>
                </AdminClickableWrapper>
              </div>
            </CardContent>
          </Card>
        );

      case 'data-freshness':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader>
              <AdminClickableWrapper dataItemName="Data Freshness Title" className="p-1 -m-1">
                <CardTitle className="text-xl text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5 text-chart-4" />
                  Data Freshness
                </CardTitle>
              </AdminClickableWrapper>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <AdminClickableWrapper dataItemName="Price Data Status" className="p-1 -m-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Price Data</span>
                    <span className="text-sm bg-primary/15 text-primary px-3 py-1.5 rounded-full font-semibold">
                      Real-time
                    </span>
                  </div>
                </AdminClickableWrapper>
                <AdminClickableWrapper dataItemName="Inventory Status" className="p-1 -m-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Inventory</span>
                    <span className="text-sm bg-chart-2/15 text-chart-2 px-3 py-1.5 rounded-full font-semibold">
                      Daily
                    </span>
                  </div>
                </AdminClickableWrapper>
                <AdminClickableWrapper dataItemName="Market Stats Status" className="p-1 -m-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Market Stats</span>
                    <span className="text-sm bg-chart-3/15 text-chart-3 px-3 py-1.5 rounded-full font-semibold">
                      Weekly
                    </span>
                  </div>
                </AdminClickableWrapper>
              </div>
            </CardContent>
          </Card>
        );

      case 'abs-geography-search':
        return (
          <AdminClickableWrapper dataItemName="ABS Geography Search Component" className="p-1 -m-1">
            <ABSLGALookup
              selectedLGA={selectedABSLGA || null}
              onLGAChange={onABSLGAChange || (() => {})}
            />
          </AdminClickableWrapper>
        );

      case 'abs-lga-map':
        return (
          <Card className="shadow-lg border border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-6 w-6 text-primary" />
                <div>
                  <AdminClickableWrapper dataItemName="ABS LGA Map Title" className="p-1 -m-1">
                    <CardTitle className="text-xl">ABS LGA Map</CardTitle>
                  </AdminClickableWrapper>
                  <AdminClickableWrapper dataItemName="ABS LGA Map Description" className="p-1 -m-1">
                    <p className="text-sm text-muted-foreground mt-1">
                      Interactive map with ABS Census 2024 boundaries from Mosaic_pro
                    </p>
                  </AdminClickableWrapper>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <AdminClickableWrapper dataItemName="ABS LGA Map Component" className="p-1 -m-1">
                <ABSLGAMap
                  selectedLGA={selectedABSLGA || null}
                  effectiveColumns={effectiveColumns}
                  height="400px"
                />
              </AdminClickableWrapper>
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
      const cardHeight = cardRef.current.offsetHeight;
      const gap = 16; // 1rem gap
      const rowHeight = 20; // grid-auto-rows value
      
      // Calculate how many 20px rows this card needs
      const calculatedRowSpan = Math.ceil((cardHeight + gap) / (rowHeight + gap));
      setRowSpan(calculatedRowSpan);
    }
  }, []);

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

  // Keyboard shortcuts for admin mode
  React.useEffect(() => {
    if (!isAdminMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return; // Only handle if not in input field

      if (e.key === 'Escape') {
        // Clear all selections
        setSelectedDataItems(new Set());
      } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        // Select all items in this card
        e.preventDefault();
        const allDataItems = new Set<string>();

        // Collect all data item names from the current card
        // This is a simplified approach - in practice you'd want to collect dynamically
        switch (card.type) {
          case 'kpi-cards':
            allDataItems.add('Median Home Price KPI');
            allDataItems.add('Market Velocity KPI');
            allDataItems.add('Housing Inventory KPI');
            allDataItems.add('Price-to-Income Ratio KPI');
            break;
          case 'market-forecast':
            allDataItems.add('Market Forecast Title');
            allDataItems.add('Next Quarter Forecast');
            allDataItems.add('Next Year Forecast');
            allDataItems.add('Confidence Level');
            break;
          // Add other cases as needed
        }

        if (allDataItems.size > 0) {
          setSelectedDataItems(allDataItems);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAdminMode, card.type]);

  // Single click handler for selection in admin mode
  const handleClick = (e?: React.MouseEvent, dataItem?: string) => {
    if (isAdminMode && dataItem) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      setSelectedDataItems(prev => {
        const newSet = new Set(prev);
        if (e?.ctrlKey || e?.metaKey) {
          // Multi-select with Ctrl/Cmd
          if (newSet.has(dataItem)) {
            newSet.delete(dataItem);
          } else {
            newSet.add(dataItem);
          }
        } else {
          // Single select
          newSet.clear();
          newSet.add(dataItem);
        }
        return newSet;
      });
    }
  };

  // Double-click handler for admin mode
  const handleDoubleClick = (e?: React.MouseEvent, dataItem?: string) => {
    console.log('Double click detected:', { isAdminMode, dataItem });
    if (isAdminMode) {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      setSelectedDataItem(dataItem);
      setShowAdminForm(true);
      console.log('Admin form should open with dataItem:', dataItem);
    }
  };

  // Create a wrapper component for clickable data items
  const AdminClickableWrapper = ({ children, dataItemName, className = "" }: {
    children: React.ReactNode;
    dataItemName: string;
    className?: string;
  }) => {
    if (!isAdminMode) {
      return <>{children}</>;
    }

    const isSelected = selectedDataItems.has(dataItemName);

    return (
      <div
        className={`${className} ${isAdminMode ? `cursor-pointer hover:bg-purple-100 hover:ring-1 hover:ring-purple-300 rounded transition-all ${isSelected ? 'bg-purple-200 ring-2 ring-purple-400 shadow-lg' : ''}` : ''}`}
        onClick={(e) => {
          console.log('AdminClickableWrapper click:', dataItemName);
          handleClick(e, dataItemName);
        }}
        onDoubleClick={(e) => {
          console.log('AdminClickableWrapper double click:', dataItemName);
          handleDoubleClick(e, dataItemName);
        }}
        title={`Click to select, double-click to configure: ${dataItemName} ${isSelected ? '(Selected)' : ''}`}
      >
        {children}
      </div>
    );
  };

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
        className={`draggable-card ${isDragging ? 'dragging' : ''} ${isAdminMode ? 'cursor-pointer hover:ring-2 hover:ring-purple-500/50' : ''}`}
        data-card-id={card.id}
        suppressHydrationWarning={true}
        onDoubleClick={(e) => handleDoubleClick(e)}
        {...(isAdminMode ? {} : attributes)}
      >
      {isEditMode && !isAdminMode && (
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

      {isAdminMode && selectedDataItems.size > 0 && (
        <div className="absolute top-2 right-16 z-10 px-3 py-1 bg-purple-500/90 text-white text-xs rounded-full border border-purple-300 shadow-lg">
          {selectedDataItems.size} selected
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDataItems(new Set());
            }}
            className="ml-2 hover:bg-purple-600 rounded px-1"
            title="Clear selection"
          >
            ×
          </button>
        </div>
      )}

      <div className={isEditMode ? 'pointer-events-none' : (isAdminMode ? 'pointer-events-auto' : '')}>
        {renderCardContent()}
      </div>
      </div>

      {showAdminForm && (
        <AdminConfigForm
          card={card}
          dataItem={selectedDataItem}
          onClose={() => {
            setShowAdminForm(false);
            setSelectedDataItem(undefined);
          }}
          onSave={(config) => {
            console.log('Admin config saved for card:', card.id, 'dataItem:', selectedDataItem, config);
            // TODO: Implement config persistence and application
          }}
        />
      )}
    </>
  );
}