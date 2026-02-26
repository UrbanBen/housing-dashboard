"use client";

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DraggableCard } from './DraggableCard';
import type { LGA } from '@/components/filters/LGALookup';

// Define card types
export type CardType =
  | 'lga-lookup'
  | 'lga-details'
  | 'lga-insights'
  | 'key-metrics'
  | 'lga-metrics'
  | 'housing-pipeline'
  | 'building-approvals-chart'
  | 'lga-dwelling-approvals'
  | 'market-overview'
  | 'market-forecast'
  | 'regional-comparison'
  | 'data-freshness'
  | 'kpi-cards'
  | 'abs-geography-search'
  | 'abs-lga-map'
  | 'test-card'
  | 'search-geography-card'
  | 'age-by-sex'
  | 'dwelling-type'
  | 'country-of-birth'
  | 'australian-born'
  | 'citizenship'
  | 'citizenship-trend'
  | 'income'
  // Development Applications Comprehensive Cards
  | 'da-daily'
  | 'da-weekly'
  | 'da-monthly'
  | 'da-13-month'
  | 'da-yoy'
  | 'da-history'
  // Occupation Certificate Comprehensive Cards
  | 'oc-daily'
  | 'oc-weekly'
  | 'oc-monthly'
  | 'oc-13-month'
  | 'oc-yoy'
  | 'oc-history'
  // Building Approval Comprehensive Cards
  | 'ba-daily'
  | 'ba-weekly'
  | 'ba-monthly'
  | 'ba-13-month'
  | 'ba-yoy'
  | 'ba-history'
  // CDC Comprehensive Cards
  | 'cdc-history'
  // User Interaction Cards
  | 'feedback'
  // New template types from AdminToolbar
  | 'geography-search'
  | 'advanced-search'
  | 'interactive-map'
  | 'location-details'
  | 'heat-map'
  | 'bar-chart'
  | 'line-chart'
  | 'pie-chart'
  | 'trend-chart'
  | 'housing-affordability'
  | 'property-values'
  | 'population-metrics'
  | 'comparison-table'
  | 'time-series'
  | 'insights-panel';

export interface DashboardCard {
  id: string;
  type: CardType;
  title: string;
  gridArea?: string; // CSS grid area for complex layouts
  size: 'small' | 'medium' | 'large' | 'xl';
  category: 'lga' | 'metrics' | 'charts' | 'kpi' | 'search' | 'map' | 'data' | 'blank';
}

interface DraggableDashboardProps {
  selectedLGA: LGA | null;
  onLGAChange: (lga: LGA | null) => void;
  maxColumns: number;
  isEditMode: boolean;
  isAdminMode: boolean;
  cards: DashboardCard[];
  setCards: React.Dispatch<React.SetStateAction<DashboardCard[]>>;
  activeCard: DashboardCard | null;
  clearDragState: () => void;
  isLoggedIn?: boolean;
  disableHover?: boolean;
}

interface DroppableDashboardGridProps {
  effectiveColumns: number;
  isEditMode: boolean;
  cards: DashboardCard[];
  isAdminMode: boolean;
  selectedLGA: LGA | null;
  onLGAChange: (lga: LGA | null) => void;
  onDeleteCard: (cardId: string) => void;
  activeCard: DashboardCard | null;
  onCardSizeChange: (cardId: string, size: 'small' | 'medium' | 'large' | 'xl') => void;
  isLoggedIn?: boolean;
  disableHover?: boolean;
}

function DroppableDashboardGrid({
  effectiveColumns,
  isEditMode,
  cards,
  isAdminMode,
  selectedLGA,
  onLGAChange,
  onDeleteCard,
  activeCard,
  onCardSizeChange,
  isLoggedIn = true,
  disableHover = false
}: DroppableDashboardGridProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'dashboard-grid',
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        dashboard-grid
        ${isEditMode ? 'edit-mode' : ''}
        ${isOver && !isEditMode ? 'bg-[#00FF41]/10 border-2 border-dashed border-[#00FF41]' : ''}
        ${isAdminMode && !isEditMode ? 'border-2 border-dashed border-[#00FF41]/30 min-h-[60vh] rounded-lg p-4' : ''}
        transition-all duration-300 ease-in-out
      `}
      style={{
        gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
        '--effective-columns': effectiveColumns,
        transition: 'all 0.2s ease'
      } as React.CSSProperties}
      suppressHydrationWarning={true}
    >
      {cards.length === 0 && isAdminMode && (
        <div className="col-span-full flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-[#00FF41] mb-2">Drop Cards Here</h3>
            <p className="text-gray-400">Drag cards from the sidebar to build your dashboard</p>
          </div>
        </div>
      )}
      {cards.map((card) => {
        if (card.type === 'lga-dwelling-approvals') {
          console.log('[DroppableDashboardGrid] Rendering lga-dwelling-approvals card:', {
            cardId: card.id,
            cardType: card.type,
            selectedLGA: selectedLGA
          });
        }
        return (
          <DraggableCard
            key={card.id}
            card={card}
            isEditMode={isEditMode}
            isAdminMode={isAdminMode}
            selectedLGA={selectedLGA}
            onLGAChange={onLGAChange}
            effectiveColumns={effectiveColumns}
            onDeleteCard={onDeleteCard}
            isBeingDragged={activeCard?.id === card.id}
            onCardSizeChange={onCardSizeChange}
            isLoggedIn={isLoggedIn}
            disableHover={disableHover}
          />
        );
      })}
    </div>
  );
}

// Default card configuration
const defaultCards: DashboardCard[] = [
  // Search Section (Required - Cannot be deleted)
  {
    id: 'search-geography-card',
    type: 'search-geography-card',
    title: 'Search Geography',
    size: 'small',
    category: 'search',
    gridArea: 'search-geography'
  },

  // LGA Section
  {
    id: 'lga-lookup',
    type: 'lga-lookup',
    title: 'LGA Lookup',
    size: 'small',
    category: 'lga',
    gridArea: 'lga-lookup'
  },
  {
    id: 'lga-details',
    type: 'lga-details',
    title: 'LGA Details',
    size: 'small',
    category: 'lga',
    gridArea: 'lga-details'
  },
  {
    id: 'lga-insights',
    type: 'lga-insights',
    title: 'LGA Map',
    size: 'small',
    category: 'lga',
    gridArea: 'lga-insights'
  },
  
  // Metrics Section
  {
    id: 'key-metrics',
    type: 'key-metrics',
    title: 'Key Metrics',
    size: 'small',
    category: 'metrics',
    gridArea: 'key-metrics'
  },
  {
    id: 'lga-metrics',
    type: 'lga-metrics',
    title: 'LGA Housing Metrics',
    size: 'small',
    category: 'metrics',
    gridArea: 'lga-metrics'
  },
  
  // Pipeline
  {
    id: 'housing-pipeline',
    type: 'housing-pipeline',
    title: 'Housing Development Pipeline',
    size: 'xl',
    category: 'charts',
    gridArea: 'housing-pipeline'
  },
  
  // Charts Section
  {
    id: 'building-approvals-chart',
    type: 'building-approvals-chart',
    title: 'Building Approvals Trends',
    size: 'medium',
    category: 'charts',
    gridArea: 'building-chart'
  },
  {
    id: 'market-overview',
    type: 'market-overview',
    title: 'Market Overview',
    size: 'large',
    category: 'charts',
    gridArea: 'market-overview'
  },
  
  // KPI Cards
  {
    id: 'kpi-cards',
    type: 'kpi-cards',
    title: 'KPI Cards',
    size: 'small',
    category: 'kpi',
    gridArea: 'kpi-cards'
  },
  
  // Analytics Cards
  {
    id: 'market-forecast',
    type: 'market-forecast',
    title: 'Market Forecast',
    size: 'small',
    category: 'metrics',
    gridArea: 'market-forecast'
  },
  {
    id: 'regional-comparison',
    type: 'regional-comparison',
    title: 'Regional Comparison',
    size: 'small',
    category: 'metrics',
    gridArea: 'regional-comparison'
  },
  {
    id: 'data-freshness',
    type: 'data-freshness',
    title: 'Data Freshness',
    size: 'small',
    category: 'metrics',
    gridArea: 'data-freshness'
  },

  // Duplicated cards using ABS Census 2024 data from Mosaic_pro
  {
    id: 'abs-geography-search',
    type: 'abs-geography-search',
    title: 'Secondary Search',
    size: 'small',
    category: 'lga',
    gridArea: 'abs-geography-search'
  },
  {
    id: 'abs-lga-map',
    type: 'abs-lga-map',
    title: 'ABS LGA Map',
    size: 'small',
    category: 'lga',
    gridArea: 'abs-lga-map'
  },
  {
    id: 'age-by-sex',
    type: 'age-by-sex',
    title: 'Age by Sex',
    size: 'small',
    category: 'charts',
    gridArea: 'age-by-sex'
  },
  {
    id: 'dwelling-type',
    type: 'dwelling-type',
    title: 'Dwelling Type',
    size: 'small',
    category: 'charts',
    gridArea: 'dwelling-type'
  },
  {
    id: 'country-of-birth',
    type: 'country-of-birth',
    title: 'Country of Birth',
    size: 'small',
    category: 'charts',
    gridArea: 'country-of-birth'
  },
];

export function DraggableDashboard({ selectedLGA, onLGAChange, maxColumns, isEditMode, isAdminMode, cards, setCards, activeCard, clearDragState, isLoggedIn = true, disableHover = false }: DraggableDashboardProps) {

  // Handle card deletion
  const handleDeleteCard = React.useCallback((cardId: string) => {
    // Clear any active drag state before deleting
    clearDragState();

    // Check if the card being deleted is currently being dragged
    if (activeCard?.id === cardId) {
      console.warn('[DraggableDashboard] Attempted to delete card that is currently being dragged');
      return;
    }

    setCards(currentCards => {
      const newCards = currentCards.filter(card => card.id !== cardId);
      localStorage.setItem('dashboard-layout', JSON.stringify(newCards));
      return newCards;
    });
  }, [setCards, clearDragState, activeCard]);

  // Handle card size change
  const handleCardSizeChange = React.useCallback((cardId: string, size: 'small' | 'medium' | 'large' | 'xl') => {
    setCards(currentCards => {
      const newCards = currentCards.map(card =>
        card.id === cardId ? { ...card, size } : card
      );
      localStorage.setItem('dashboard-layout', JSON.stringify(newCards));
      return newCards;
    });
  }, [setCards]);

  // Calculate effective columns based on screen size and max setting
  const getEffectiveColumns = React.useCallback(() => {
    if (typeof window === 'undefined') return Math.min(4, maxColumns);

    const width = window.innerWidth;
    let naturalColumns = 1;

    if (width >= 3440) naturalColumns = 6;
    else if (width >= 2560) naturalColumns = 5;
    else if (width >= 1920) naturalColumns = 4;
    else if (width >= 1400) naturalColumns = 3;
    else if (width >= 768) naturalColumns = 2;
    else naturalColumns = 1;

    return Math.min(naturalColumns, maxColumns);
  }, [maxColumns]);

  // Use a consistent initial value for both server and client to prevent hydration mismatch
  const [effectiveColumns, setEffectiveColumns] = React.useState(4);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    // Only update columns after mount to prevent hydration mismatch
    if (!mounted) return;

    const updateColumns = () => {
      const newColumns = getEffectiveColumns();
      console.log('Updating columns:', { width: window.innerWidth, maxColumns, naturalColumns: Math.min(6, Math.max(1, Math.floor(window.innerWidth / 350))), effectiveColumns: newColumns });
      setEffectiveColumns(newColumns);
    };

    // Update columns immediately after mount
    updateColumns();

    window.addEventListener('resize', updateColumns);
    return () => {
      window.removeEventListener('resize', updateColumns);
    };
  }, [getEffectiveColumns, maxColumns, mounted]);



  // Group cards by category for better organization
  const groupedCards = React.useMemo(() => {
    const groups: Record<string, DashboardCard[]> = {};
    cards.forEach(card => {
      if (!groups[card.category]) {
        groups[card.category] = [];
      }
      groups[card.category].push(card);
    });
    return groups;
  }, [cards]);

  return (
    <div className="w-full">
      <div suppressHydrationWarning={true}>
        <SortableContext items={cards.map(card => card.id)} strategy={rectSortingStrategy}>
          <DroppableDashboardGrid
            effectiveColumns={effectiveColumns}
            isEditMode={isEditMode}
            cards={cards}
            isAdminMode={isAdminMode}
            selectedLGA={selectedLGA}
            onLGAChange={onLGAChange}
            onDeleteCard={handleDeleteCard}
            activeCard={activeCard}
            onCardSizeChange={handleCardSizeChange}
            isLoggedIn={isLoggedIn}
            disableHover={disableHover}
          />
        </SortableContext>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .dashboard-grid {
          display: grid;
          grid-auto-rows: 20px; /* Small row units for fine-grained control */
          grid-auto-flow: row;
          column-gap: 2rem;
          row-gap: 1rem;
          width: 100%;
          max-width: none;
          align-items: start;
          transition: none !important;
        }

        .dashboard-grid .draggable-card {
          align-self: start;
          border-radius: 0.75rem;
          transition: opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0s !important;
          min-width: 0;
          transition-property: opacity, border-color, box-shadow;
          transition-duration: 0.2s;
          transition-timing-function: ease;
        }

        .dashboard-grid .draggable-card.dragging {
          z-index: 1000;
          pointer-events: none;
        }

        .dashboard-grid .draggable-card > * {
          transition: none !important;
        }

        .dashboard-grid.edit-mode .draggable-card {
          border: 2px solid rgb(249 115 22 / 0.5);
          background: hsl(var(--card) / 0.95);
          border-radius: 0.75rem;
          box-shadow: 0 0 0 1px rgb(249 115 22 / 0.2);
        }

        .dashboard-grid.edit-mode .draggable-card:hover {
          border-color: rgb(249 115 22 / 0.8);
          box-shadow: 0 0 0 2px rgb(249 115 22 / 0.4);
          border-radius: 0.75rem;
        }

        .dashboard-card-overlay {
          transform: rotate(3deg);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 2px solid hsl(var(--primary));
          border-radius: 0.75rem;
        }


        /* Card sizing now handled in JavaScript */
      `}</style>
    </div>
  );
}