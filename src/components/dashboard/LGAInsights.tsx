"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Home, Users, MapPin } from "lucide-react";
import { LGAMap } from "@/components/maps/LGAMap";

interface LGA {
  id: string;
  name: string;
  region: string;
  population: number;
}

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
  const baseMultiplier = lga.population / 100000;
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
          <LGAMap selectedLGA={selectedLGA} height="200px" />
        </div>
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Building Approvals</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{data.buildingApprovals.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Last 12 months</div>
          </div>

          <div className="bg-chart-2/10 border border-chart-2/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4" style={{ color: 'hsl(var(--chart-2))' }} />
              <span className="text-xs font-medium text-muted-foreground">Approval Rate</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{data.approvalRate}%</div>
            <div className="text-xs text-muted-foreground">DA Success Rate</div>
          </div>

          <div className="bg-chart-3/10 border border-chart-3/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" style={{ color: 'hsl(var(--chart-3))' }} />
              <span className="text-xs font-medium text-muted-foreground">Construction Starts</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{data.constructionStarts.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">YTD Units</div>
          </div>

          <div className="bg-highlight/10 border border-highlight/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-highlight" />
              <span className="text-xs font-medium text-muted-foreground">Median Price</span>
            </div>
            <div className="text-2xl font-bold text-foreground">${(data.medianPrice / 1000).toFixed(0)}k</div>
            <div className="text-xs text-muted-foreground">Latest Quarter</div>
          </div>
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
                <div className="font-medium text-foreground">{selectedLGA.population.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Region</span>
                <div className="font-medium text-foreground">{selectedLGA.region}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Units per 1,000</span>
                <div className="font-medium text-foreground">
                  {((data.buildingApprovals / selectedLGA.population) * 1000).toFixed(1)}
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