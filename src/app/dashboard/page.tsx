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

  // Duplicated cards using ABS Census 2024 data from Mosaic_pro
  {
    id: 'abs-lga-map',
    type: 'abs-lga-map',
    title: 'ABS LGA Map',
    size: 'small',
    category: 'lga',
    gridArea: 'abs-lga-map'
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

  // Secondary Search Card
  {
    id: 'lga-lookup',
    type: 'lga-lookup',
    title: 'Secondary Search',
    size: 'small',
    category: 'lga',
    gridArea: 'lga-lookup'
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

  // Load saved layout on component mount
  useEffect(() => {
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
    console.log('Drag end:', event);
    const { active, over } = event;
    setActiveTemplate(null);
    setActiveCard(null);

    if (!over) return;

    // Handle dropping templates from admin toolbar
    if (active.data.current?.type === 'template') {
      // Check if dropped on dashboard grid or on another card
      if (over.id === 'dashboard-grid' || cards.some(card => card.id === over.id)) {
        const template = active.data.current.template;
        const newCard: DashboardCard = {
          id: `${template.id}-${Date.now()}`,
          type: template.id as CardType,
          title: template.title,
          size: 'medium',
          category: template.category,
          ...template.defaultConfig
        };

        setCards(currentCards => {
          const newCards = [...currentCards, newCard];
          localStorage.setItem('dashboard-layout', JSON.stringify(newCards));
          return newCards;
        });
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
    <div className={`min-h-screen ${isAdminMode ? 'bg-purple-900' : 'bg-black'}`}>
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-sm font-medium">
                    {isEditMode ? 'Edit Mode' : 'View Mode'}
                  </span>
                </div>

                {isAdminMode && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                    <span className="text-sm font-medium text-purple-600">
                      Admin Mode - Click any card to configure data source
                    </span>
                  </div>
                )}
              </div>
              
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
                <button
                  onClick={() => setIsAdminMode(!isAdminMode)}
                  className={`text-xs px-3 py-1 rounded transition-colors ${
                    isAdminMode
                      ? 'bg-purple-500/20 text-purple-600 hover:bg-purple-500/30'
                      : 'bg-muted/20 text-muted-foreground hover:bg-muted/30'
                  }`}
                >
                  {isAdminMode ? 'Exit Admin' : 'Admin Mode'}
                </button>
              </div>
              
              <span className="text-xs bg-highlight/10 text-highlight px-3 py-1 rounded-full font-medium animate-pulse">
                ● LIVE DATA
              </span>
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
        {/* Admin Toolbar - appears when admin mode is enabled */}
        <AdminToolbar isVisible={isAdminMode} />

        <div className="w-full px-6 py-8">
          {/* Main Dashboard Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Housing Market Analytics</h1>
            <p className="text-lg text-muted-foreground">Comprehensive housing data analysis and market intelligence</p>
          </div>

          {/* Draggable Dashboard */}
          <DraggableDashboard
            selectedLGA={selectedLGA}
            onLGAChange={handleLGAChange}
            maxColumns={maxColumns}
            isEditMode={isEditMode}
            isAdminMode={isAdminMode}
            cards={cards}
            setCards={setCards}
          />
        </div>

        {/* Drag Overlay for templates and cards being dragged */}
        <DragOverlay>
          {activeTemplate ? (
            <div className="transform rotate-3 shadow-2xl border-2 border-primary bg-card rounded-lg p-3 opacity-90">
              <div className="flex flex-col items-center gap-1">
                <activeTemplate.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{activeTemplate.title}</span>
              </div>
            </div>
          ) : activeCard ? (
            <div className="dashboard-card-overlay">
              <DraggableCard
                card={activeCard}
                isEditMode={true}
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