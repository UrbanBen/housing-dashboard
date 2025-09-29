"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import dynamic from 'next/dynamic';

// Dynamically import the LGAMap to avoid SSR issues with Leaflet
const LGAMap = dynamic(() => import("@/components/maps/LGAMap").then(mod => ({ default: mod.LGAMap })), {
  ssr: false,
  loading: () => <div className="h-48 bg-muted rounded-lg flex items-center justify-center">Loading map...</div>
});

import type { LGA } from '@/components/filters/LGALookup';

interface LGAInsightsProps {
  selectedLGA: LGA | null;
  effectiveColumns?: number;
}

export function LGAInsights({ selectedLGA, effectiveColumns }: LGAInsightsProps) {
  return (
    <Card className="shadow-lg border border-border/50 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">
              {selectedLGA ? `${selectedLGA.name} Boundary` : 'NSW Map View'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLGA ? 
                `Geographic boundary for ${selectedLGA.name}` : 
                'Select an LGA to view its boundaries'
              }
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* LGA Boundary Map */}
        <div className="flex-1 min-h-0">
          <LGAMap selectedLGA={selectedLGA} effectiveColumns={effectiveColumns} height="400px" />
        </div>
      </CardContent>
    </Card>
  );
}