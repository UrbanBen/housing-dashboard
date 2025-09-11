"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Home, Users, MapPin } from "lucide-react";
import dynamic from 'next/dynamic';

// Dynamically import the LGAMap to avoid SSR issues with Leaflet
const LGAMap = dynamic(() => import("@/components/maps/LGAMap").then(mod => ({ default: mod.LGAMap })), {
  ssr: false,
  loading: () => <div className="h-48 bg-muted rounded-lg flex items-center justify-center">Loading map...</div>
});

import type { LGA } from '@/components/filters/LGALookup';

interface LGAInsightsProps {
  selectedLGA: LGA | null;
}

// Mock data for different LGAs - in real implementation, this would come from an API
const getLGAData = (lga: LGA | null) => {
  if (!lga) {
    return {
      buildingApprovals: 2840,
      averageApprovalTime: 45,
      developmentApplications: 3200,
      approvalRate: 89,
      landReleases: 450,
      constructionStarts: 2100,
      completions: 1850,
      medianPrice: 485000
    };
  }

  // Mock data variations based on LGA characteristics
  const baseMultiplier = (lga.population || 100000) / 100000;
  const regionMultipliers: { [key: string]: number } = {
    'Sydney Metro': 1.5,
    'Central Coast': 0.8,
    'Hunter': 0.9,
    'Illawarra': 0.85,
    'Central West': 0.6,
    'North Coast': 0.7,
    'Far West': 0.3
  };

  const regionMultiplier = regionMultipliers[lga.region] || 1;
  const finalMultiplier = baseMultiplier * regionMultiplier;

  return {
    buildingApprovals: Math.round(2840 * finalMultiplier),
    averageApprovalTime: Math.round(45 + (Math.random() - 0.5) * 20),
    developmentApplications: Math.round(3200 * finalMultiplier),
    approvalRate: Math.round(89 + (Math.random() - 0.5) * 15),
    landReleases: Math.round(450 * finalMultiplier),
    constructionStarts: Math.round(2100 * finalMultiplier),
    completions: Math.round(1850 * finalMultiplier),
    medianPrice: Math.round(485000 * (lga.region === 'Sydney Metro' ? 1.8 : 
                    lga.region === 'Central Coast' ? 0.9 : 
                    lga.region === 'Hunter' ? 0.7 : 
                    lga.region === 'Illawarra' ? 0.8 : 0.6))
  };
};

export function LGAInsights({ selectedLGA }: LGAInsightsProps) {
  const data = getLGAData(selectedLGA);

  return (
    <Card className="shadow-lg border border-border/50 h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">
              {selectedLGA ? `${selectedLGA.name} Insights` : 'NSW State Overview'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLGA ? 
                `Housing metrics for ${selectedLGA.name}` : 
                'Statewide housing development metrics'
              }
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LGA Boundary Map */}
        <div className="mb-4">
          <LGAMap selectedLGA={selectedLGA} height="300px" />
        </div>

        {/* Processing Times */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-foreground mb-3">Processing Metrics</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Average DA Processing</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{data.averageApprovalTime} days</span>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${Math.min((60 - data.averageApprovalTime) / 60 * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Development Applications</span>
              <span className="text-sm font-medium text-foreground">{data.developmentApplications.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Land Releases</span>
              <span className="text-sm font-medium text-foreground">{data.landReleases.toLocaleString()} lots</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Completions</span>
              <span className="text-sm font-medium text-foreground">{data.completions.toLocaleString()} units</span>
            </div>
          </div>
        </div>

        {/* Population Context (if LGA selected) */}
        {selectedLGA && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-foreground mb-3">LGA Context</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Population</span>
                <div className="font-medium text-foreground">
                  {selectedLGA.population ? selectedLGA.population.toLocaleString() : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Region</span>
                <div className="font-medium text-foreground">{selectedLGA.region}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Units per 1,000</span>
                <div className="font-medium text-foreground">
                  {selectedLGA.population ? ((data.buildingApprovals / selectedLGA.population) * 1000).toFixed(1) : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Completion Rate</span>
                <div className="font-medium text-foreground">
                  {Math.round((data.completions / data.constructionStarts) * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Status */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {selectedLGA ? 
            `All data filtered for ${selectedLGA.name}` : 
            'Showing statewide data • Select an LGA to filter'
          }
        </div>
      </CardContent>
    </Card>
  );
}