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
  | 'kpi-cards';

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
}

// Default card configuration
const defaultCards: DashboardCard[] = [
  // LGA Section
  {
    id: 'lga-lookup',
    type: 'lga-lookup',
    title: 'LGA Lookup',
    size: 'medium',
    category: 'lga',
    gridArea: 'lga-lookup'
  },
  {
    id: 'lga-details',
    type: 'lga-details',
    title: 'LGA Details',
    size: 'medium',
    category: 'lga',
    gridArea: 'lga-details'
  },
  {
    id: 'lga-insights',
    type: 'lga-insights',
    title: 'LGA Map',
    size: 'medium',
    category: 'lga',
    gridArea: 'lga-insights'
  },
  
  // Metrics Section
  {
    id: 'key-metrics',
    type: 'key-metrics',
    title: 'Key Metrics',
    size: 'xl',
    category: 'metrics',
    gridArea: 'key-metrics'
  },
  {
    id: 'lga-metrics',
    type: 'lga-metrics',
    title: 'LGA Housing Metrics',
    size: 'xl',
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
    size: 'large',
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
  {
    id: 'data-freshness',
    type: 'data-freshness',
    title: 'Data Freshness',
    size: 'small',
    category: 'metrics',
    gridArea: 'data-freshness'
  },
];

export function DraggableDashboard({ selectedLGA, onLGAChange }: DraggableDashboardProps) {
  const [cards, setCards] = useState<DashboardCard[]>(defaultCards);
  const [activeCard, setActiveCard] = useState<DashboardCard | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

  const resetLayout = () => {
    setCards(defaultCards);
    localStorage.removeItem('dashboard-layout');
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

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
      {/* Edit Mode Toggle */}
      <div className="flex items-center justify-between mb-6 px-6 py-3 bg-card/50 backdrop-blur rounded-lg border border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-sm font-medium">
              {isEditMode ? 'Edit Mode Active' : 'View Mode'}
            </span>
          </div>
          {isEditMode && (
            <div className="text-xs text-muted-foreground">
              Drag cards to rearrange • Changes save automatically
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetLayout}
            className="text-xs px-3 py-1 bg-destructive/20 text-destructive hover:bg-destructive/30 rounded transition-colors"
          >
            Reset Layout
          </button>
          <button
            onClick={toggleEditMode}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              isEditMode 
                ? 'bg-orange-500/20 text-orange-600 hover:bg-orange-500/30' 
                : 'bg-primary/20 text-primary hover:bg-primary/30'
            }`}
          >
            {isEditMode ? 'Exit Edit' : 'Edit Layout'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={cards.map(card => card.id)} strategy={rectSortingStrategy}>
          <div className={`dashboard-grid ${isEditMode ? 'edit-mode' : ''}`}>
            {cards.map((card) => (
              <DraggableCard
                key={card.id}
                card={card}
                isEditMode={isEditMode}
                selectedLGA={selectedLGA}
                onLGAChange={onLGAChange}
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
                selectedLGA={selectedLGA}
                onLGAChange={onLGAChange}
                isDragging={true}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Custom Styles */}
      <style jsx global>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
          width: 100%;
          max-width: none;
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

        /* Responsive grid adjustments for very small screens */
        @media (max-width: 767px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Let auto-fit handle larger screens naturally */

        /* Size-specific styling - default for larger screens */
        .card-size-small {
          grid-column: span 1;
        }

        .card-size-medium {
          grid-column: span 1;
        }

        .card-size-large {
          grid-column: span 2;
        }

        .card-size-xl {
          grid-column: span 3;
        }

        /* Responsive card sizing adjustments */
        @media (max-width: 767px) {
          .card-size-small,
          .card-size-medium,
          .card-size-large,
          .card-size-xl {
            grid-column: span 1;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .card-size-large,
          .card-size-xl {
            grid-column: span 2;
          }
        }

        /* For very large screens, allow even more expansion */
        @media (min-width: 1920px) {
          .card-size-xl {
            grid-column: span 4;
          }
        }

        @media (min-width: 2560px) {
          .card-size-large {
            grid-column: span 3;
          }
          .card-size-xl {
            grid-column: span 5;
          }
        }
      `}</style>
    </div>
  );
}