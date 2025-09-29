"use client";

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableCard } from './DraggableCard';
import type { LGA } from '@/components/filters/LGALookup';
import type { ABSLGA } from '@/components/filters/ABSLGALookup';

// Define card types
export type CardType =
  | 'lga-lookup'
  | 'lga-details'
  | 'lga-insights'
  | 'key-metrics'
  | 'lga-metrics'
  | 'housing-pipeline'
  | 'building-approvals-chart'
  | 'market-overview'
  | 'market-forecast'
  | 'regional-comparison'
  | 'data-freshness'
  | 'kpi-cards'
  | 'abs-geography-search'
  | 'abs-lga-map';

export interface DashboardCard {
  id: string;
  type: CardType;
  title: string;
  gridArea?: string; // CSS grid area for complex layouts
  size: 'small' | 'medium' | 'large' | 'xl';
  category: 'lga' | 'metrics' | 'charts' | 'kpi';
}

interface DraggableDashboardProps {
  selectedLGA: LGA | null;
  onLGAChange: (lga: LGA | null) => void;
  maxColumns: number;
  isEditMode: boolean;
  isAdminMode: boolean;
}

// Default card configuration
const defaultCards: DashboardCard[] = [
  // LGA Section
  {
    id: 'lga-lookup',
    type: 'lga-lookup',
    title: 'Search Geography',
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
    size: 'medium',
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
    size: 'small',
    category: 'charts',
    gridArea: 'building-chart'
  },
  {
    id: 'market-overview',
    type: 'market-overview',
    title: 'Market Overview',
    size: 'medium',
    category: 'charts',
    gridArea: 'market-overview'
  },
  
  // KPI Cards
  {
    id: 'kpi-cards',
    type: 'kpi-cards',
    title: 'KPI Cards',
    size: 'xl',
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

  // Duplicated cards using ABS Census 2024 data from Mosaic_pro
  {
    id: 'abs-geography-search',
    type: 'abs-geography-search',
    title: 'ABS Geography Search',
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
];

export function DraggableDashboard({ selectedLGA, onLGAChange, maxColumns, isEditMode, isAdminMode }: DraggableDashboardProps) {
  const [cards, setCards] = useState<DashboardCard[]>(defaultCards);
  const [activeCard, setActiveCard] = useState<DashboardCard | null>(null);
  const [selectedABSLGA, setSelectedABSLGA] = useState<ABSLGA | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeCard = cards.find(card => card.id === active.id);
    setActiveCard(activeCard || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) return;

    setCards(currentCards => {
      const activeIndex = currentCards.findIndex(card => card.id === active.id);
      const overIndex = currentCards.findIndex(card => card.id === over.id);

      const newCards = [...currentCards];
      const [movedCard] = newCards.splice(activeIndex, 1);
      newCards.splice(overIndex, 0, movedCard);

      // Save layout to localStorage
      localStorage.setItem('dashboard-layout', JSON.stringify(newCards));
      
      return newCards;
    });
  };

  // Calculate effective columns based on screen size and max setting
  const getEffectiveColumns = React.useCallback(() => {
    if (typeof window === 'undefined') return 1;
    
    const width = window.innerWidth;
    let naturalColumns = 1;
    
    if (width >= 3440) naturalColumns = 6;
    else if (width >= 2560) naturalColumns = 5;
    else if (width >= 1920) naturalColumns = 4;
    else if (width >= 1024) naturalColumns = 3;
    else if (width >= 768) naturalColumns = 2;
    else naturalColumns = 1;
    
    return Math.min(naturalColumns, maxColumns);
  }, [maxColumns]);

  // Force re-render when window resizes or maxColumns changes
  const [effectiveColumns, setEffectiveColumns] = React.useState(1);

  React.useEffect(() => {
    const updateColumns = () => {
      const newColumns = getEffectiveColumns();
      console.log('Updating columns:', { width: window.innerWidth, maxColumns, naturalColumns: Math.min(6, Math.max(1, Math.floor(window.innerWidth / 350))), effectiveColumns: newColumns });
      setEffectiveColumns(newColumns);
    };

    updateColumns(); // Initial calculation
    
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [getEffectiveColumns]);

  // Load saved layout on component mount
  React.useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout');
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        setCards(parsedLayout);
      } catch (error) {
        console.error('Failed to load saved dashboard layout:', error);
      }
    }
  }, []);

  // Listen for reset layout event from parent
  React.useEffect(() => {
    const handleResetLayout = () => {
      setCards(defaultCards);
      localStorage.removeItem('dashboard-layout');
    };

    window.addEventListener('resetDashboardLayout', handleResetLayout);
    return () => window.removeEventListener('resetDashboardLayout', handleResetLayout);
  }, []);


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
      {isEditMode && (
        <div className="mb-6 px-6 py-3 bg-orange-500/10 backdrop-blur rounded-lg border border-orange-500/20">
          <div className="text-sm text-orange-600 font-medium">
            ✏️ Edit Mode Active - Drag cards to rearrange • Changes save automatically
          </div>
        </div>
      )}

      <div suppressHydrationWarning={true}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
        <SortableContext items={cards.map(card => card.id)} strategy={rectSortingStrategy}>
          <div 
            className={`dashboard-grid ${isEditMode ? 'edit-mode' : ''}`} 
            style={{
              gridTemplateColumns: `repeat(${effectiveColumns}, 1fr)`,
              '--effective-columns': effectiveColumns
            } as React.CSSProperties}
          >
            {cards.map((card) => (
              <DraggableCard
                key={card.id}
                card={card}
                isEditMode={isEditMode}
                isAdminMode={isAdminMode}
                selectedLGA={selectedLGA}
                onLGAChange={onLGAChange}
                selectedABSLGA={selectedABSLGA}
                onABSLGAChange={setSelectedABSLGA}
                effectiveColumns={effectiveColumns}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard ? (
            <div className="dashboard-card-overlay">
              <DraggableCard
                card={activeCard}
                isEditMode={true}
                isAdminMode={isAdminMode}
                selectedLGA={selectedLGA}
                onLGAChange={onLGAChange}
                isDragging={true}
                effectiveColumns={effectiveColumns}
              />
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .dashboard-grid {
          display: grid;
          grid-auto-rows: 20px; /* Small row units for fine-grained control */
          grid-auto-flow: dense;
          column-gap: 2rem;
          row-gap: 1rem;
          width: 100%;
          max-width: none;
          align-items: start;
        }

        .dashboard-grid .draggable-card {
          align-self: start;
        }

        .dashboard-grid.edit-mode .draggable-card {
          border: 2px dashed hsl(var(--border));
          background: hsl(var(--card) / 0.8);
          transition: all 0.2s ease;
        }

        .dashboard-grid.edit-mode .draggable-card:hover {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3);
        }

        .dashboard-card-overlay {
          transform: rotate(3deg);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          border: 2px solid hsl(var(--primary));
        }


        /* Card sizing now handled in JavaScript */
      `}</style>
    </div>
  );
}