"use client";

import React, { useState, useCallback } from "react";
import { LGALookup, type LGA } from "@/components/filters/LGALookup";
import { DraggableDashboard } from "@/components/dashboard/DraggableDashboard";

export default function DashboardPage() {
  const [selectedLGA, setSelectedLGA] = useState<LGA | null>(null);
  const [maxColumns, setMaxColumns] = useState<number>(6);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Stabilize the LGA change callback to prevent infinite loops
  const handleLGAChange = useCallback((lga: LGA | null) => {
    setSelectedLGA(lga);
  }, []);
  
  const resetLayout = () => {
    // This will be passed to DraggableDashboard
    window.dispatchEvent(new CustomEvent('resetDashboardLayout'));
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
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
                <h2 className="text-lg font-semibold text-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)] glow-text">Housing Dashboard</h2>
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
                      Admin Mode - Double-click cards to configure
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

      <div className="w-full px-6 py-8">
        {/* Draggable Dashboard */}
        <DraggableDashboard
          selectedLGA={selectedLGA}
          onLGAChange={handleLGAChange}
          maxColumns={maxColumns}
          isEditMode={isEditMode}
          isAdminMode={isAdminMode}
        />

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()} • Data sources: Australian Bureau of Statistics (ABS), Multiple MLS feeds, Census Bureau, Federal Reserve
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}