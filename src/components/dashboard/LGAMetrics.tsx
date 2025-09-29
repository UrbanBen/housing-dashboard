"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Home, Building2, Users, Target, Clock, CheckCircle } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';

interface LGAMetricsProps {
  selectedLGA: LGA | null;
}

interface LGAMetricsData {
  buildingApprovals: {
    current: number;
    change: number;
    trend: 'up' | 'down';
  };
  housingTarget: {
    target: number;
    progress: number;
    progressPercent: number;
  };
  developmentApplications: {
    submitted: number;
    approved: number;
    approvalRate: number;
    avgProcessingDays: number;
  };
  constructionActivity: {
    starts: number;
    completions: number;
    pipeline: number;
  };
  demographics: {
    population: number | null;
    populationGrowth: number;
    householdsSize: number;
  };
}

// Generate realistic metrics based on LGA data
const generateLGAMetrics = (lga: LGA | null): LGAMetricsData => {
  if (!lga || lga.id === 'nsw-state') {
    // NSW State-wide aggregated metrics (all 128 LGAs combined)
    return {
      buildingApprovals: { current: 147200, change: 8.3, trend: 'up' },
      housingTarget: { target: 250000, progress: 147200, progressPercent: 58.9 },
      developmentApplications: { submitted: 165300, approved: 143811, approvalRate: 87.0, avgProcessingDays: 42 },
      constructionActivity: { starts: 132600, completions: 124800, pipeline: 287400 },
      demographics: { population: 8200000, populationGrowth: 1.2, householdsSize: 2.6 }
    };
  }

  // Generate metrics based on LGA characteristics
  const baseMultiplier = (lga.population || 100000) / 100000;
  const regionMultipliers: { [key: string]: number } = {
    'Sydney Metro': 1.8,
    'Central Coast': 0.9,
    'Hunter': 1.1,
    'Illawarra': 0.95,
    'Central West': 0.7,
    'North Coast': 0.8,
    'Regional NSW': 0.6,
    'Far West': 0.4,
    'New England': 0.5,
    'Riverina': 0.6
  };

  const regionMultiplier = regionMultipliers[lga.region] || 0.8;
  const finalMultiplier = baseMultiplier * regionMultiplier;

  // Calculate realistic metrics
  const buildingApprovals = Math.round(285 * finalMultiplier);
  const targetMultiplier = lga.housingTarget ? lga.housingTarget / 1000 : finalMultiplier * 10;
  
  return {
    buildingApprovals: {
      current: buildingApprovals,
      change: Math.round((Math.random() * 30 - 10) * 10) / 10, // -10% to +20%
      trend: Math.random() > 0.3 ? 'up' : 'down'
    },
    housingTarget: {
      target: lga.housingTarget || Math.round(1000 * targetMultiplier),
      progress: buildingApprovals,
      progressPercent: Math.round((buildingApprovals / (lga.housingTarget || 1000)) * 100 * 10) / 10
    },
    developmentApplications: {
      submitted: Math.round(480 * finalMultiplier),
      approved: Math.round(430 * finalMultiplier),
      approvalRate: Math.round((85 + Math.random() * 10) * 10) / 10,
      avgProcessingDays: Math.round(35 + Math.random() * 25)
    },
    constructionActivity: {
      starts: Math.round(240 * finalMultiplier),
      completions: Math.round(220 * finalMultiplier),
      pipeline: Math.round(520 * finalMultiplier)
    },
    demographics: {
      population: lga.population,
      populationGrowth: Math.round((0.5 + Math.random() * 2.5) * 10) / 10,
      householdsSize: Math.round((2.2 + Math.random() * 0.8) * 10) / 10
    }
  };
};

export function LGAMetrics({ selectedLGA }: LGAMetricsProps) {
  const [metrics, setMetrics] = useState<LGAMetricsData>(() => generateLGAMetrics(selectedLGA));

  useEffect(() => {
    setMetrics(generateLGAMetrics(selectedLGA));
  }, [selectedLGA]);

  return (
    <Card className="shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          {selectedLGA ? `${selectedLGA.name} Housing Metrics` : 'NSW Housing Metrics'}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {selectedLGA 
            ? `Detailed housing and development metrics for ${selectedLGA.name}`
            : 'State-wide housing and development overview'
          }
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Building Approvals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Home className="h-5 w-5 text-primary" />
              {metrics.buildingApprovals.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {metrics.buildingApprovals.current.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mb-1">Building Approvals</div>
            <div className={`text-xs ${metrics.buildingApprovals.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.buildingApprovals.change >= 0 ? '+' : ''}{metrics.buildingApprovals.change}% from last year
            </div>
          </div>

          <div className="bg-chart-2/5 border border-chart-2/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-5 w-5 text-chart-2" />
              <div className="text-xs bg-chart-2/20 text-chart-2 px-2 py-1 rounded">
                {metrics.housingTarget.progressPercent}%
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {metrics.housingTarget.target.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mb-1">Housing Target (5yr)</div>
            <div className="w-full bg-chart-2/10 rounded-full h-2">
              <div 
                className="bg-chart-2 h-2 rounded-full" 
                style={{ width: `${Math.min(metrics.housingTarget.progressPercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-chart-3/5 border border-chart-3/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-chart-3" />
              <div className="text-xs bg-chart-3/20 text-chart-3 px-2 py-1 rounded">
                {metrics.developmentApplications.approvalRate}%
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {metrics.developmentApplications.approved.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mb-1">DA Approvals</div>
            <div className="text-xs text-chart-3">
              {metrics.developmentApplications.submitted.toLocaleString()} submitted
            </div>
          </div>
        </div>

        {/* Construction Activity */}
        <div className="border-t pt-4">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Construction Activity
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{metrics.constructionActivity.starts.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Construction Starts</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{metrics.constructionActivity.completions.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Completions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{metrics.constructionActivity.pipeline.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Development Pipeline</div>
            </div>
          </div>
        </div>

        {/* Processing & Demographics */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Processing Times
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Average DA Processing</span>
                  <span className="font-medium">{metrics.developmentApplications.avgProcessingDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Approval Rate</span>
                  <span className="font-medium">{metrics.developmentApplications.approvalRate}%</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Demographics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Population</span>
                  <span className="font-medium">
                    {metrics.demographics.population 
                      ? metrics.demographics.population.toLocaleString()
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Population Growth</span>
                  <span className="font-medium text-green-600">+{metrics.demographics.populationGrowth}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Household Size</span>
                  <span className="font-medium">{metrics.demographics.householdsSize}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {selectedLGA && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            Data shown for {selectedLGA.name}, {selectedLGA.region} • Updated monthly
          </div>
        )}
      </CardContent>
    </Card>
  );
}