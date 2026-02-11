"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LGALookup, type LGA } from "@/components/filters/LGALookup";
import { DraggableDashboard, type DashboardCard, type CardType } from "@/components/dashboard/DraggableDashboard";
import { DraggableCard } from "@/components/dashboard/DraggableCard";
import { AdminToolbar } from "@/components/dashboard/AdminToolbar";
import { LoginModal } from "@/components/auth/LoginModal";
import { canAccessCard } from "@/lib/tiers";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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

  // Development Applications Comprehensive Cards
  {
    id: 'da-daily',
    type: 'da-daily',
    title: 'DA Daily Activity',
    size: 'small',
    category: 'charts',
    gridArea: 'da-daily'
  },
  {
    id: 'da-weekly',
    type: 'da-weekly',
    title: 'DA Weekly Trends',
    size: 'small',
    category: 'charts',
    gridArea: 'da-weekly'
  },
  {
    id: 'da-monthly',
    type: 'da-monthly',
    title: 'DA Monthly Summary',
    size: 'small',
    category: 'charts',
    gridArea: 'da-monthly'
  },
  {
    id: 'da-13-month',
    type: 'da-13-month',
    title: 'DA 13-Month Overview',
    size: 'small',
    category: 'charts',
    gridArea: 'da-13-month'
  },
  {
    id: 'da-yoy',
    type: 'da-yoy',
    title: 'DA Year-over-Year',
    size: 'small',
    category: 'charts',
    gridArea: 'da-yoy'
  },
  {
    id: 'da-history',
    type: 'da-history',
    title: 'DA Complete History',
    size: 'small',
    category: 'charts',
    gridArea: 'da-history'
  },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedLGA, setSelectedLGA] = useState<LGA | null>({
    id: 'New South Wales',
    name: 'New South Wales',
    region: 'State/Territory',
    population: null
  });
  const [maxColumns, setMaxColumns] = useState<number>(6);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [cards, setCards] = useState<DashboardCard[]>(defaultCards);
  const [activeCard, setActiveCard] = useState<DashboardCard | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Authentication check - allow access without login for now (free tier)
  // In production, you might want to require auth for all users
  const userTier = session?.user?.tier || 'free';

  // Determine if user is logged in (stable during loading states)
  const isLoggedIn = status === 'authenticated' && !!session;
  const isUnauthenticated = status === 'unauthenticated';

  // Show login modal when definitely unauthenticated (not during loading)
  useEffect(() => {
    if (isUnauthenticated) {
      setShowLoginModal(true);
    } else if (isLoggedIn) {
      setShowLoginModal(false);
    }
    // Don't change modal state during 'loading' status
  }, [isLoggedIn, isUnauthenticated]);

  // Track theme changes for logo styling
  useEffect(() => {
    const updateTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // Filter cards based on user's tier
  const accessibleCards = cards.filter(card =>
    canAccessCard(userTier, card.type)
  );

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    setShowLoginModal(true);
  };

  // Debug: Log selectedLGA changes
  useEffect(() => {
    console.log('[DashboardPage] selectedLGA changed:', selectedLGA);
    const dwellingApprovalCards = cards.filter(c => c.type === 'lga-dwelling-approvals');
    if (dwellingApprovalCards.length > 0) {
      console.log('[DashboardPage] Found lga-dwelling-approvals cards:', dwellingApprovalCards);
    }
  }, [selectedLGA, cards]);

  // Load user preferences (layout, theme, etc.)
  useEffect(() => {
    const loadPreferences = async () => {
      if (isLoggedIn && session?.user?.email) {
        // Load from API for logged-in users
        try {
          const response = await fetch('/api/user-preferences');
          if (response.ok) {
            const prefs = await response.json();
            console.log('[DashboardPage] Loaded preferences from API:', prefs);

            if (prefs.dashboardLayout && prefs.dashboardLayout.length > 0) {
              setCards(prefs.dashboardLayout);
            }
            if (prefs.maxColumns) {
              setMaxColumns(prefs.maxColumns);
            }
            if (prefs.lastSelectedLGA) {
              setSelectedLGA(prefs.lastSelectedLGA);
            }
          }
        } catch (error) {
          console.error('[DashboardPage] Failed to load preferences from API:', error);
          // Fallback to localStorage on error
          loadFromLocalStorage();
        }
      } else {
        // Load from localStorage for non-logged-in users
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      const savedLayout = localStorage.getItem('dashboard-layout');
      if (savedLayout) {
        try {
          const parsedLayout = JSON.parse(savedLayout);
          console.log('[DashboardPage] Loading cards from localStorage:', parsedLayout);
          setCards(parsedLayout);
        } catch (error) {
          console.error('Failed to load saved dashboard layout:', error);
        }
      }
    };

    loadPreferences();
  }, [isLoggedIn, session?.user?.email]);

  // Save preferences when they change (debounced)
  useEffect(() => {
    const savePreferences = async () => {
      if (isLoggedIn && session?.user?.email) {
        // Save to API for logged-in users
        try {
          await fetch('/api/user-preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dashboardLayout: cards,
              maxColumns,
              lastSelectedLGA: selectedLGA
            })
          });
          console.log('[DashboardPage] Saved preferences to API');
        } catch (error) {
          console.error('[DashboardPage] Failed to save preferences to API:', error);
        }
      } else {
        // Save to localStorage for non-logged-in users
        localStorage.setItem('dashboard-layout', JSON.stringify(cards));
      }
    };

    // Debounce saves by 500ms to avoid too many API calls
    const timeoutId = setTimeout(savePreferences, 500);
    return () => clearTimeout(timeoutId);
  }, [cards, maxColumns, selectedLGA, isLoggedIn, session?.user?.email]);

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
  
  const resetLayout = async () => {
    console.log('Reset Layout clicked');
    setCards(defaultCards);

    if (isLoggedIn && session?.user?.email) {
      // Reset in API for logged-in users
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dashboardLayout: defaultCards,
            maxColumns: 6,
            lastSelectedLGA: null
          })
        });
      } catch (error) {
        console.error('Failed to reset layout in API:', error);
      }
    } else {
      // Reset in localStorage for non-logged-in users
      localStorage.removeItem('dashboard-layout');
    }
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
    <div className="min-h-screen relative">
      {/* Fixed gradient background - Dark mode only */}
      <div className="fixed inset-0 dark:bg-gradient-to-tl dark:from-[#00FF41]/20 dark:via-black dark:to-black pointer-events-none light:hidden" style={{ zIndex: 0 }} />

      {/* Fixed gradient background - Light mode only */}
      <div
        className="fixed inset-0 pointer-events-none dark:hidden"
        style={{
          zIndex: 0,
          background: 'linear-gradient(to bottom right, #FAFBF0 0%, #FAFBF0 50%, #00D37F 100%)'
        }}
      />

      {/* Navigation Bar */}
      <nav className="border-b border-border bg-card relative" style={{ zIndex: 10 }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2
                className="text-[#223222] dark:text-[#00FF41] dark:drop-shadow-[0_0_10px_rgba(0,255,65,0.5)] dark:glow-text tracking-wide"
                style={{
                  fontFamily: '"DIN", "DIN Alternate", "DINPro", "FF DIN", "Helvetica Neue", "Arial", sans-serif',
                  fontSize: '2.2rem',
                  fontWeight: 300,
                  letterSpacing: '0.05em'
                }}
              >
                Spatio Dash
              </h2>
              <div
                className="rounded-md bg-transparent border-4"
                style={{
                  width: '3.56rem',
                  height: '2.2rem',
                  borderRadius: '4px',
                  borderColor: isDarkMode ? '#00FF41' : '#223222',
                  boxShadow: isDarkMode
                    ? '0 0 12px rgba(0, 255, 65, 0.8), 0 0 24px rgba(0, 255, 65, 0.5)'
                    : 'none'
                }}
              />
              <p className="text-sm text-muted-foreground ml-2">Analytic Insights and Intelligence</p>
            </div>
            <div className="flex items-center gap-4">
              {/* User Profile and Tier Display */}
              {session ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{session.user.name || session.user.email}</p>
                    <p className="text-xs">
                      {userTier === 'pro' ? (
                        <span className="pro-tier-glow">
                          {userTier.toUpperCase()} Tier
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {userTier.toUpperCase()} Tier
                        </span>
                      )}
                      {userTier !== 'pro' && (
                        <span
                          className="ml-2 text-primary cursor-pointer hover:underline"
                          onClick={() => router.push('/pricing')}
                        >
                          Upgrade
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleSignOut}
                    className="h-10 font-semibold bg-card border border-border hover:bg-accent transition-colors"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => router.push('/login')}
                  className="font-semibold shadow-lg hover:shadow-xl transition-all border-2"
                  style={{
                    borderColor: isDarkMode ? '#00FF41' : '#223222',
                    color: isDarkMode ? '#00FF41' : '#223222',
                    boxShadow: isDarkMode ? '0 0 8px rgba(0, 255, 65, 0.5)' : 'none'
                  }}
                >
                  Sign In
                </Button>
              )}

              {/* Theme Toggle */}
              <ThemeToggle />

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
                <label className="text-sm text-muted-foreground">Max Columns:</label>
                <select
                  value={maxColumns}
                  onChange={(e) => setMaxColumns(Number(e.target.value))}
                  className="h-10 px-4 py-2 text-sm bg-card border border-border rounded hover:bg-accent transition-colors font-semibold"
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
                className={`h-10 px-4 py-2 text-sm font-semibold rounded transition-colors ${
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

      {/* Floating Exit Edit Button - Only visible in Admin/Edit Mode */}
      {isAdminMode && (
        <button
          onClick={() => {
            setIsAdminMode(false);
            setIsEditMode(false);
          }}
          className="fixed top-24 right-6 z-50 h-12 px-6 py-3 text-sm font-bold rounded-lg shadow-2xl transition-all duration-300 ease-in-out bg-[#00FF41]/20 text-[#00FF41] hover:bg-[#00FF41]/30 border-2 border-[#00FF41] hover:shadow-[0_0_20px_rgba(0,255,65,0.5)] backdrop-blur-sm animate-slide-in-right"
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <style jsx>{`
            @keyframes slideInRight {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}</style>
          Exit Edit Mode
        </button>
      )}

      {/* DndContext wrapping both AdminToolbar and Dashboard */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full relative" style={{ zIndex: 10 }}>
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
              isLoggedIn={isLoggedIn}
              disableHover={showLoginModal}
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
                isLoggedIn={isLoggedIn}
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
                isLoggedIn={isLoggedIn}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-border relative" style={{ zIndex: 10 }}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()} • Data sources: Multiple MLS feeds, Australian Bureau of Statistics (ABS), Census Bureau, Federal Reserve
          </p>
        </div>
      </div>

      {/* Login Modal */}
      <div className="relative" style={{ zIndex: 9999 }}>
        <LoginModal isOpen={showLoginModal} />
      </div>
    </div>
  );
}