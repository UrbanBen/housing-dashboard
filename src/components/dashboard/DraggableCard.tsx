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
import { LGADwellingApprovalsChart, type LGADwellingApprovalsChartRef } from '@/components/charts/LGADwellingApprovalsChart';
import { MarketOverview } from './MarketOverview';
import { HousingSankeyChart } from '@/components/charts/HousingSankeyChart';
import { TestCard } from './TestCard';
import { SearchCard } from './SearchCard';
import { ABSLGAMap } from './ABSLGAMap';
import { AgeBySexCard } from './AgeBySexCard';
import { DwellingTypeCard } from './DwellingTypeCard';
import { CountryOfBirthCard } from './CountryOfBirthCard';
import { AustralianBornCard } from './AustralianBornCard';
import { IncomeCard } from './IncomeCard';
import { CitizenshipCard } from './CitizenshipCard';
import { CitizenshipTrendCard } from './CitizenshipTrendCard';
import { DADailyCard } from './DADailyCard';
import { DAWeeklyCard } from './DAWeeklyCard';
import { DAMonthlyCard } from './DAMonthlyCard';
import { DA13MonthCard } from './DA13MonthCard';
import { DAYoYCard } from './DAYoYCard';
import { DAHistoryCard } from './DAHistoryCard';
import { OCDailyCard } from './OCDailyCard';
import { OCWeeklyCard } from './OCWeeklyCard';
import { OCMonthlyCard } from './OCMonthlyCard';
import { OC13MonthCard } from './OC13MonthCard';
import { OCYoYCard } from './OCYoYCard';
import { OCHistoryCard } from './OCHistoryCard';
import { BADailyCard } from './BADailyCard';
import { BAWeeklyCard } from './BAWeeklyCard';
import { BAMonthlyCard } from './BAMonthlyCard';
import { BA13MonthCard } from './BA13MonthCard';
import { BAYoYCard } from './BAYoYCard';
import { BAHistoryCard } from './BAHistoryCard';
import { CDCHistoryCard } from './CDCHistoryCard';
import { FeedbackCard } from './FeedbackCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, TrendingDown, Activity, Home, DollarSign, Building, GitBranch, MapPin,
  Settings, Map, BarChart3, LineChart, PieChart, Users, Layout, Calendar,
  FileText
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
  isBeingDragged?: boolean;
  onCardSizeChange?: (cardId: string, size: 'small' | 'medium' | 'large' | 'xl') => void;
  isLoggedIn?: boolean;
  disableHover?: boolean;
}

export function DraggableCard({
  card,
  isEditMode,
  isAdminMode = false,
  selectedLGA,
  onLGAChange,
  isDragging = false,
  effectiveColumns = 4,
  onDeleteCard,
  isBeingDragged = false,
  onCardSizeChange,
  isLoggedIn = true,
  disableHover = false
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isSortableDragging ? 0.5 : 1,
    willChange: isDragging ? 'transform' : 'auto',
  };

  const renderCardContent = () => {
    // Helper to get card className with conditional hover effects
    const getCardClassName = (additionalClasses = '') => {
      const baseClasses = 'bg-card/50 backdrop-blur-sm shadow-lg border border-border/50 transition-all';
      const hoverClasses = disableHover ? '' : 'hover:ring-2 hover:ring-primary/50 hover:shadow-xl';
      return `${baseClasses} ${hoverClasses} ${additionalClasses}`.trim();
    };

    switch (card.type) {
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

      case 'lga-dwelling-approvals': {
        // Data Source: Database research&insights, Schema housing_dashboard, Table building_approvals_nsw_lga
        // Shows LGA-specific dwelling approvals (requires database permissions)
        console.log('[DraggableCard lga-dwelling-approvals] Rendering with selectedLGA:', selectedLGA);
        const chartRef = useRef<LGADwellingApprovalsChartRef>(null);

        return (
          <Card className={getCardClassName()}>
            <CardHeader
              className="pb-4 cursor-pointer"
              onDoubleClick={() => chartRef.current?.openConfig()}
              title="Double-click to configure"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LineChart className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-xl">
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
          <Card className={getCardClassName()}>
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

      case 'market-forecast':
        return (
          <Card className={getCardClassName()}>
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
          <Card className={getCardClassName()}>
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
          <Card className={getCardClassName('min-h-[200px]')}>
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

      case 'location-details':
        return (
                      <LGADetails selectedLGA={selectedLGA} />

        );

      case 'housing-affordability':
        return (
          <Card className={getCardClassName()}>
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
          <Card className={getCardClassName()}>
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
          <Card className={getCardClassName()}>
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

      case 'feedback':
        return <FeedbackCard selectedLGA={selectedLGA} />;

      case 'search-geography-card':
        return (
          <SearchCard
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
            selectedLGA={selectedLGA}
            onLGAChange={onLGAChange}
          />
        );

      case 'age-by-sex':
        return (
          <AgeBySexCard
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'dwelling-type':
        return (
          <DwellingTypeCard
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'country-of-birth':
        return (
          <CountryOfBirthCard
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'australian-born':
        return (
          <AustralianBornCard
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'citizenship':
        return (
          <CitizenshipCard
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'citizenship-trend':
        return (
          <CitizenshipTrendCard
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'income':
        return (
          <IncomeCard
            selectedLGA={selectedLGA}
            isAdminMode={isAdminMode}
            onAdminClick={() => {}}
          />
        );

      case 'da-daily':
        return <DADailyCard selectedLGA={selectedLGA} />;

      case 'da-weekly':
        return <DAWeeklyCard selectedLGA={selectedLGA} />;

      case 'da-monthly':
        return <DAMonthlyCard selectedLGA={selectedLGA} />;

      case 'da-13-month':
        return <DA13MonthCard selectedLGA={selectedLGA} />;

      case 'da-yoy':
        return <DAYoYCard selectedLGA={selectedLGA} />;

      case 'da-history':
        return <DAHistoryCard selectedLGA={selectedLGA} cardWidth={card.size} />;

      case 'oc-daily':
        return <OCDailyCard selectedLGA={selectedLGA} />;

      case 'oc-weekly':
        return <OCWeeklyCard selectedLGA={selectedLGA} />;

      case 'oc-monthly':
        return <OCMonthlyCard selectedLGA={selectedLGA} />;

      case 'oc-13-month':
        return <OC13MonthCard selectedLGA={selectedLGA} />;

      case 'oc-yoy':
        return <OCYoYCard selectedLGA={selectedLGA} />;

      case 'oc-history':
        return <OCHistoryCard selectedLGA={selectedLGA} cardWidth={card.size} />;

      case 'ba-daily':
        return <BADailyCard selectedLGA={selectedLGA} />;

      case 'ba-weekly':
        return <BAWeeklyCard selectedLGA={selectedLGA} />;

      case 'ba-monthly':
        return <BAMonthlyCard selectedLGA={selectedLGA} />;

      case 'ba-13-month':
        return <BA13MonthCard selectedLGA={selectedLGA} />;

      case 'ba-yoy':
        return <BAYoYCard selectedLGA={selectedLGA} />;

      case 'ba-history':
        return <BAHistoryCard selectedLGA={selectedLGA} cardWidth={card.size} />;

      case 'cdc-history':
        return <CDCHistoryCard selectedLGA={selectedLGA} cardWidth={card.size} />;

      default:
        return (
          <Card className={getCardClassName()}>
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
    // Special override for kpi-cards - always 1 column
    if (card.id === 'kpi-cards') {
      return 1;
    }

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

      // DIAGNOSTIC LOGGING
      console.log(`🔍 Card: ${card.id} (size: ${card.size})`, {
        offsetHeight: cardHeight,
        calculatedRowSpan,
        gridHeight: calculatedRowSpan * (rowHeight + gap),
        scrollHeight: cardRef.current.scrollHeight,
        clientHeight: cardRef.current.clientHeight,
        boundingRect: cardRef.current.getBoundingClientRect().height
      });

      setRowSpan(calculatedRowSpan);
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
          gridRow: `span ${rowSpan}`,
          position: 'relative'
        }}
        className={`draggable-card ${isDragging ? 'dragging' : ''} outline-none focus:outline-none focus-visible:outline-none`}
        data-card-id={card.id}
        data-size={card.size}
        suppressHydrationWarning={true}
        {...(isAdminMode ? {} : attributes)}
      >
      {/* Drag Handle - Always visible, positioned to avoid conflicts */}
      {!isSortableDragging && (
        <div
          className={`absolute top-2 z-10 p-2 bg-background/80 backdrop-blur rounded cursor-move hover:bg-background transition-all opacity-60 hover:opacity-100 ${
            isEditMode ? 'right-14' : 'right-2'
          }`}
          {...listeners}
          title="Drag to rearrange"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Delete Button - Only in Edit Mode (except for search cards) */}
      {isEditMode && !isSortableDragging && card.type !== 'search-geography-card' && card.type !== 'lga-lookup' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isBeingDragged) {
              setShowDeleteConfirm(true);
            }
          }}
          disabled={isBeingDragged}
          className={`absolute top-2 right-2 z-10 p-2 backdrop-blur rounded transition-all ${
            isBeingDragged
              ? 'bg-gray-500/50 cursor-not-allowed opacity-50'
              : 'bg-red-500/80 cursor-pointer hover:bg-red-600 opacity-80 hover:opacity-100'
          }`}
          title={isBeingDragged ? "Cannot delete while dragging" : "Delete card"}
        >
          <Trash2 className="h-4 w-4 text-white" />
        </button>
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

      {/* Grid Span Controls - Only for specific cards in Edit Mode */}
      {isEditMode && !isSortableDragging && onCardSizeChange && ['housing-pipeline', 'building-approvals-chart', 'market-overview', 'age-by-sex', 'dwelling-type', 'da-history', 'oc-history', 'ba-history', 'cdc-history'].includes(card.type) && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 flex gap-1 bg-background/90 backdrop-blur border border-border rounded-lg p-1 shadow-lg pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCardSizeChange(card.id, 'small');
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors pointer-events-auto ${
              card.size === 'small'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
            title="1 column wide"
          >
            1
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCardSizeChange(card.id, 'medium');
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors pointer-events-auto ${
              card.size === 'medium'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
            title="2 columns wide"
          >
            2
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCardSizeChange(card.id, 'large');
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors pointer-events-auto ${
              card.size === 'large'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
            title="3 columns wide"
          >
            3
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCardSizeChange(card.id, 'xl');
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors pointer-events-auto ${
              card.size === 'xl'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
            title="4 columns wide"
          >
            4
          </button>
        </div>
      )}


      <div className={`relative ${isEditMode ? 'pointer-events-none' : (isAdminMode ? 'pointer-events-auto' : '')}`}>
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
                      // Close modal first to prevent setState on unmounted component
                      setShowDeleteConfirm(false);

                      // Delete card on next tick after modal closes
                      if (onDeleteCard) {
                        setTimeout(() => {
                          onDeleteCard(card.id);
                        }, 0);
                      }
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