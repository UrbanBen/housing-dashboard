"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, TrendingUp, Users, MapPin, BarChart3 } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';

interface KeyMetricsProps {
  selectedLGA: LGA | null;
}

// Mock data for different LGAs - in real implementation, this would come from an API
const getLGAData = (lga: LGA | null) => {
  if (!lga) {
    return {
      buildingApprovals: 2840,
      approvalRate: 89,
      constructionStarts: 2100,
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
    approvalRate: Math.round(89 + (Math.random() - 0.5) * 15),
    constructionStarts: Math.round(2100 * finalMultiplier),
    medianPrice: Math.round(485000 * (lga.region === 'Sydney Metro' ? 1.8 : 
                    lga.region === 'Central Coast' ? 0.9 : 
                    lga.region === 'Hunter' ? 0.7 : 
                    lga.region === 'Illawarra' ? 0.8 : 0.6))
  };
};

export function KeyMetrics({ selectedLGA }: KeyMetricsProps) {
  const data = getLGAData(selectedLGA);

  return (
    <Card className="shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">
              {selectedLGA ? `${selectedLGA.name} Key Metrics` : 'NSW Key Metrics'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLGA ? 
                `Core housing indicators for ${selectedLGA.name}` : 
                'Statewide core housing indicators'
              }
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Building Approvals</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{data.buildingApprovals.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Last 12 months</div>
          </div>

          <div className="bg-chart-2/10 border border-chart-2/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5" style={{ color: 'hsl(var(--chart-2))' }} />
              <span className="text-sm font-medium text-muted-foreground">Approval Rate</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{data.approvalRate}%</div>
            <div className="text-xs text-muted-foreground">DA Success Rate</div>
          </div>

          <div className="bg-chart-3/10 border border-chart-3/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5" style={{ color: 'hsl(var(--chart-3))' }} />
              <span className="text-sm font-medium text-muted-foreground">Construction Starts</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">{data.constructionStarts.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">YTD Units</div>
          </div>

          <div className="bg-highlight/10 border border-highlight/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-highlight" />
              <span className="text-sm font-medium text-muted-foreground">Median Price</span>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">${(data.medianPrice / 1000).toFixed(0)}k</div>
            <div className="text-xs text-muted-foreground">Latest Quarter</div>
          </div>
        </div>

        {/* Filter Status */}
        <div className="text-xs text-muted-foreground text-center pt-4 mt-4 border-t">
          {selectedLGA ? 
            `Key metrics for ${selectedLGA.name}` : 
            'Statewide key metrics • Select an LGA to filter'
          }
        </div>
      </CardContent>
    </Card>
  );
}