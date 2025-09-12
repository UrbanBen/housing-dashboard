"use client";

import React, { useState } from "react";
import { LGALookup, type LGA } from "@/components/filters/LGALookup";
import { DraggableDashboard } from "@/components/dashboard/DraggableDashboard";

export default function DashboardPage() {
  const [selectedLGA, setSelectedLGA] = useState<LGA | null>(null);

  return (
    <div className="min-h-screen bg-background">
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
              <span className="text-xs bg-highlight/10 text-highlight px-3 py-1 rounded-full font-medium animate-pulse">
                ● LIVE DATA
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-6xl text-[#00FF41] glow-text mb-3">Housing Dashboard</h1>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            Housing trend analysis and insights to inform decision-making and public transparency
          </p>
        </div>

        {/* Draggable Dashboard */}
        <DraggableDashboard 
          selectedLGA={selectedLGA} 
          onLGAChange={setSelectedLGA} 
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