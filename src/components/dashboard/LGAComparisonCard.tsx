"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCompare, TrendingUp } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface LGAComparisonCardProps {
  selectedLGA: LGA | null;
}

interface ComparisonMetric {
  metric: string;
  [key: string]: number | string; // Dynamic LGA names as keys
}

interface LGAProfile {
  name: string;
  color: string;
}

export function LGAComparisonCard({ selectedLGA }: LGAComparisonCardProps) {
  const [comparisonData, setComparisonData] = useState<ComparisonMetric[]>([]);
  const [lgaProfiles, setLgaProfiles] = useState<LGAProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate mock comparison data
  useEffect(() => {
    const generateMockData = () => {
      if (!selectedLGA) {
        setComparisonData([]);
        setLgaProfiles([]);
        return;
      }

      setIsLoading(true);

      // Define LGAs to compare with distinct colors
      const profiles: LGAProfile[] = [
        { name: selectedLGA.name, color: '#3b82f6' },
        { name: 'Comparable LGA 1', color: '#8b5cf6' },
        { name: 'Comparable LGA 2', color: '#10b981' }
      ];

      setLgaProfiles(profiles);

      // Define metrics for comparison (normalized to 0-100 scale)
      const metrics: ComparisonMetric[] = [
        {
          metric: 'Population Growth',
          [selectedLGA.name]: 85,
          'Comparable LGA 1': 72,
          'Comparable LGA 2': 68
        },
        {
          metric: 'Building Approvals',
          [selectedLGA.name]: 78,
          'Comparable LGA 1': 82,
          'Comparable LGA 2': 75
        },
        {
          metric: 'Affordability',
          [selectedLGA.name]: 65,
          'Comparable LGA 1': 70,
          'Comparable LGA 2': 58
        },
        {
          metric: 'Infrastructure',
          [selectedLGA.name]: 72,
          'Comparable LGA 1': 68,
          'Comparable LGA 2': 80
        },
        {
          metric: 'Development Activity',
          [selectedLGA.name]: 88,
          'Comparable LGA 1': 75,
          'Comparable LGA 2': 82
        },
        {
          metric: 'Market Demand',
          [selectedLGA.name]: 80,
          'Comparable LGA 1': 78,
          'Comparable LGA 2': 72
        }
      ];

      setComparisonData(metrics);
      setIsLoading(false);
    };

    generateMockData();
  }, [selectedLGA]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <GitCompare className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">
              LGA Benchmark Comparison
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedLGA ? `${selectedLGA.name} vs comparable LGAs` : 'Multi-metric comparison'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoading && comparisonData.length > 0 && (
          <>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mb-4">
              {lgaProfiles.map((profile) => (
                <div key={profile.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: profile.color }}
                  />
                  <span className="text-sm font-medium">{profile.name}</span>
                </div>
              ))}
            </div>

            {/* Radar Chart */}
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={comparisonData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`Score: ${value}/100`, '']}
                  />
                  {lgaProfiles.map((profile) => (
                    <Radar
                      key={profile.name}
                      name={profile.name}
                      dataKey={profile.name}
                      stroke={profile.color}
                      fill={profile.color}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Comparison Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Metric</th>
                    {lgaProfiles.map((profile) => (
                      <th
                        key={profile.name}
                        className="text-center py-2 px-3 font-semibold"
                        style={{ color: profile.color }}
                      >
                        {profile.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row) => (
                    <tr key={row.metric} className="border-b border-border/50">
                      <td className="py-2 px-3 text-muted-foreground">{row.metric}</td>
                      {lgaProfiles.map((profile) => {
                        const value = row[profile.name] as number;
                        const isHighest = lgaProfiles.every(
                          (p) => (row[p.name] as number) <= value
                        );
                        return (
                          <td
                            key={profile.name}
                            className="text-center py-2 px-3"
                          >
                            <span
                              className={`font-medium ${isHighest ? 'text-primary' : ''}`}
                            >
                              {value}/100
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Summary */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-medium">Overall Performance</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedLGA?.name} shows competitive positioning across key metrics
                </div>
              </div>
            </div>

            {/* Data Source Note */}
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Normalized scores (0-100) • Comparable LGAs selected based on similar characteristics
            </div>
          </>
        )}

        {!isLoading && comparisonData.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <GitCompare className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Select an LGA to view benchmark comparison</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
