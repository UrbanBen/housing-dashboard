"use client";

import React, { useState, useCallback, useEffect } from "react";
import { LGALookup, type LGA } from "@/components/filters/LGALookup";
import { DraggableDashboard, type DashboardCard, type CardType } from "@/components/dashboard/DraggableDashboard";
import { DraggableCard } from "@/components/dashboard/DraggableCard";
import { AdminToolbar } from "@/components/dashboard/AdminToolbar";
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

// Default card configuration
const defaultCards: DashboardCard[] = [
  // LGA Section
  {
    id: 'search-geography-card',
    type: 'search-geography-card',
    title: 'Search Geography',
    size: 'small',
    category: 'lga',
    gridArea: 'search-geography-card'
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
    id: 'abs-lga-map',
    type: 'abs-lga-map',
    title: 'ABS LGA Map',
    size: 'small',
    category: 'lga',
    gridArea: 'abs-lga-map'
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
    size: 'large',
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

  // Test Card
  {
    id: 'test-card',
    type: 'test-card',
    title: 'Test',
    size: 'small',
    category: 'lga',
    gridArea: 'test-card'
  },

  // Age by Sex
  {
    id: 'age-by-sex',
    type: 'age-by-sex',
    title: 'Age by Sex',
    size: 'small',
    category: 'charts',
    gridArea: 'age-by-sex'
  },
];

export default function DashboardPage() {
  const [selectedLGA, setSelectedLGA] = useState<LGA | null>(null);
  const [maxColumns, setMaxColumns] = useState<number>(6);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [cards, setCards] = useState<DashboardCard[]>(defaultCards);
  const [activeCard, setActiveCard] = useState<DashboardCard | null>(null);

  // Debug: Log selectedLGA changes
  useEffect(() => {
    console.log('[DashboardPage] selectedLGA changed:', selectedLGA);
    const dwellingApprovalCards = cards.filter(c => c.type === 'lga-dwelling-approvals');
    if (dwellingApprovalCards.length > 0) {
      console.log('[DashboardPage] Found lga-dwelling-approvals cards:', dwellingApprovalCards);
    }
  }, [selectedLGA, cards]);

  // Load saved layout on component mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout');
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        console.log('[DashboardPage] Loading cards from localStorage:', parsedLayout);
        const dwellingCards = parsedLayout.filter((c: DashboardCard) => c.type === 'lga-dwelling-approvals');
        if (dwellingCards.length > 0) {
          console.log('[DashboardPage] Found lga-dwelling-approvals cards in localStorage:', dwellingCards);
        }
        setCards(parsedLayout);
      } catch (error) {
        console.error('Failed to load saved dashboard layout:', error);
      }
    }
  }, []);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Stabilize the LGA change callback to prevent infinite loops
  const handleLGAChange = useCallback((lga: LGA | null) => {
    setSelectedLGA(lga);
  }, []);
  
  const resetLayout = () => {
    console.log('Reset Layout clicked');
    setCards(defaultCards);
    localStorage.removeItem('dashboard-layout');
  };

  const toggleEditMode = () => {
    console.log('Toggle Edit Mode clicked');
    setIsEditMode(!isEditMode);
  };

  // Clear drag state helper function
  const clearDragState = useCallback(() => {
    setActiveTemplate(null);
    setActiveCard(null);
  }, []);

  // Drag event handlers
  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag start:', event);
    if (event.active.data.current?.type === 'template') {
      setActiveTemplate(event.active.data.current.template);
    } else {
      // Handle existing card drag
      const activeCard = cards.find(card => card.id === event.active.id);
      setActiveCard(activeCard || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🎯 Drag end event:', {
      activeId: event.active.id,
      overId: event.over?.id,
      activeData: event.active.data.current,
      overData: event.over?.data.current
    });

    const { active, over } = event;
    clearDragState();

    if (!over) {
      console.log('⚠️ No drop target detected');
      return;
    }

    // Handle dropping templates from admin toolbar
    if (active.data.current?.type === 'template') {
      console.log('📦 Template drop detected:', active.data.current.template);

      // Check if dropped on dashboard grid or on another card
      if (over.id === 'dashboard-grid' || cards.some(card => card.id === over.id)) {
        const template = active.data.current.template;
        const newCard: DashboardCard = {
          id: `${template.id}-${Date.now()}`,
          type: template.id as CardType,
          title: template.title,
          size: 'small',
          category: template.category,
          ...template.defaultConfig
        };

        console.log('✅ Adding new card:', newCard);
        if (newCard.type === 'lga-dwelling-approvals') {
          console.log('[DEBUG lga-dwelling-approvals] Card created from library template with type:', newCard.type);
        }

        setCards(currentCards => {
          let newCards: DashboardCard[];

          // If dropped on a specific card, insert after that card
          if (over.id !== 'dashboard-grid') {
            const overIndex = currentCards.findIndex(card => card.id === over.id);
            if (overIndex !== -1) {
              // Insert after the card we dropped on
              newCards = [
                ...currentCards.slice(0, overIndex + 1),
                newCard,
                ...currentCards.slice(overIndex + 1)
              ];
              console.log(`📍 Inserted card at position ${overIndex + 1}`);
            } else {
              // Fallback: add to end
              newCards = [...currentCards, newCard];
            }
          } else {
            // Dropped on grid itself, add to end
            newCards = [...currentCards, newCard];
          }

          localStorage.setItem('dashboard-layout', JSON.stringify(newCards));
          console.log('💾 Updated cards:', newCards.length, 'cards');
          return newCards;
        });
      } else {
        console.log('❌ Drop target not valid:', over.id);
      }
      return;
    }

    // Handle existing card reordering
    if (active.id === over.id) return;

    setCards(currentCards => {
      const activeIndex = currentCards.findIndex(card => card.id === active.id);
      const overIndex = currentCards.findIndex(card => card.id === over.id);

      if (activeIndex === -1) return currentCards; // Card not found

      const newCards = [...currentCards];
      const [movedCard] = newCards.splice(activeIndex, 1);
      newCards.splice(overIndex, 0, movedCard);

      // Save layout to localStorage
      localStorage.setItem('dashboard-layout', JSON.stringify(newCards));

      return newCards;
    });
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation Bar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/mosaic-logo.svg" 
                alt="MOSAIC By Mecone Logo" 
                className="h-10 w-40"
              />
              <div>
                <h2 className="text-lg font-semibold text-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)] glow-text">Housing Analytics</h2>
                <p className="text-sm text-muted-foreground">Analytic Insights and Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isAdminMode && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                  <span className="text-sm font-medium text-orange-500 orange-glow-pulse">
                    Edit Mode - Drag cards from sidebar
                  </span>
                  <style jsx>{`
                    @keyframes glowPulse {
                      0%, 100% {
                        text-shadow: 0 0 10px rgb(249 115 22 / 0.5), 0 0 20px rgb(249 115 22 / 0.3);
                      }
                      50% {
                        text-shadow: 0 0 20px rgb(249 115 22 / 0.8), 0 0 30px rgb(249 115 22 / 0.5);
                      }
                    }
                    .orange-glow-pulse {
                      animation: glowPulse 2s ease-in-out infinite;
                    }
                  `}</style>
                </div>
              )}

              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Max Columns:</label>
                <select
                  value={maxColumns}
                  onChange={(e) => setMaxColumns(Number(e.target.value))}
                  className="text-xs px-2 py-1 bg-card border border-border rounded hover:bg-accent transition-colors"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setIsAdminMode(!isAdminMode);
                  setIsEditMode(!isEditMode);
                }}
                className={`text-xs px-3 py-1 rounded transition-colors ${
                  isAdminMode
                    ? 'bg-[#00FF41]/20 text-[#00FF41] hover:bg-[#00FF41]/30'
                    : 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30'
                }`}
              >
                {isAdminMode ? 'Exit Edit' : 'Edit'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* DndContext wrapping both AdminToolbar and Dashboard */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full">
          {/* Admin Toolbar - appears when admin mode is enabled */}
          <AdminToolbar isVisible={isAdminMode} onResetLayout={resetLayout} />

          <div className={`flex-1 w-full px-6 py-8 overflow-auto ${isEditMode ? 'bg-orange-500/10' : ''}`}>
            {/* Draggable Dashboard */}
            <DraggableDashboard
              selectedLGA={selectedLGA}
              onLGAChange={handleLGAChange}
              maxColumns={maxColumns}
              isEditMode={isEditMode}
              isAdminMode={isAdminMode}
              cards={cards}
              setCards={setCards}
              activeCard={activeCard}
              clearDragState={clearDragState}
            />
          </div>
        </div>

        {/* Drag Overlay for templates and cards being dragged */}
        <DragOverlay>
          {activeTemplate ? (
            <div className="dashboard-card-overlay" style={{ width: '350px' }}>
              <DraggableCard
                card={{
                  id: `preview-${activeTemplate.id}`,
                  type: activeTemplate.id as CardType,
                  title: activeTemplate.title,
                  size: 'small',
                  category: activeTemplate.category,
                  ...activeTemplate.defaultConfig
                }}
                isEditMode={false}
                isAdminMode={isAdminMode}
                selectedLGA={selectedLGA}
                onLGAChange={handleLGAChange}
                isDragging={true}
                effectiveColumns={6}
              />
            </div>
          ) : activeCard ? (
            <div className="dashboard-card-overlay">
              <DraggableCard
                card={activeCard}
                isEditMode={false}
                isAdminMode={isAdminMode}
                selectedLGA={selectedLGA}
                onLGAChange={handleLGAChange}
                isDragging={true}
                effectiveColumns={6}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-border">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()} • Data sources: Multiple MLS feeds, Australian Bureau of Statistics (ABS), Census Bureau, Federal Reserve
          </p>
        </div>
      </div>
    </div>
  );
}