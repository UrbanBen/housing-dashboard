"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, BarChart3 } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';

interface LGADetailsProps {
  selectedLGA: LGA | null;
}

// Mock data for different LGAs - in real implementation, this would come from an API
const getLGAData = (lga: LGA | null) => {
  if (!lga || lga.id === 'nsw-state') {
    // NSW State-wide aggregated data (all 128 LGAs combined)
    return {
      buildingApprovals: 147200, // Aggregated across all NSW LGAs
      averageApprovalTime: 42,
      developmentApplications: 165300,
      approvalRate: 87,
      landReleases: 18400,
      constructionStarts: 132600,
      completions: 124800,
      medianPrice: 485000
    };
  }

  // Mock data variations based on LGA characteristics
  const baseMultiplier = (lga.population || 100000) / 100000;
  const regionMultipliers: { [key: string]: number } = {
    'Urban LGA': 1.5,
    'Rural LGA': 0.8
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
    medianPrice: Math.round(485000 * (lga.region === 'Urban LGA' ? 1.8 : 0.7))
  };
};

export function LGADetails({ selectedLGA }: LGADetailsProps) {
  const data = getLGAData(selectedLGA);

  return (
    <Card className="shadow-lg border border-border/50 h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">
              {selectedLGA ? `${selectedLGA.name} Details` : 'NSW Processing Details'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLGA ? 
                `Processing and context data for ${selectedLGA.name}` : 
                'Statewide processing metrics and context'
              }
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Times */}
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Processing Metrics
          </h4>
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

        {/* LGA Context (if LGA selected) */}
        {selectedLGA && (
          <div className="border-t pt-4">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              {selectedLGA.id === 'nsw-state' ? 'NSW State Context' : 'LGA Context'}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedLGA.id === 'nsw-state' ? (
                // NSW State-wide context
                <>
                  <div>
                    <span className="text-muted-foreground">Population</span>
                    <div className="font-medium text-foreground">
                      8.2M (approx)
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">LGAs</span>
                    <div className="font-medium text-foreground">
                      128 Total
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Units per 1,000</span>
                    <div className="font-medium text-foreground">
                      18.0
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completion Rate</span>
                    <div className="font-medium text-foreground">
                      {Math.round((data.completions / data.constructionStarts) * 100)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Urban LGAs</span>
                    <div className="font-medium text-foreground text-xs">
                      43 Urban
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Rural LGAs</span>
                    <div className="font-medium text-foreground">
                      85 Rural
                    </div>
                  </div>
                </>
              ) : (
                // Individual LGA context
                <>
                  <div>
                    <span className="text-muted-foreground">Population</span>
                    <div className="font-medium text-foreground">
                      {selectedLGA.population ? selectedLGA.population.toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type</span>
                    <div className="font-medium text-foreground">
                      {selectedLGA.urbanity === 'U' ? 'Urban' : 'Rural'}
                    </div>
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
                  <div>
                    <span className="text-muted-foreground">Council</span>
                    <div className="font-medium text-foreground text-xs">
                      {selectedLGA.councilName?.replace(' COUNCIL', '') || selectedLGA.region}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ABS Code</span>
                    <div className="font-medium text-foreground">
                      {selectedLGA.id}
                    </div>
                  </div>
                </>
              )}
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