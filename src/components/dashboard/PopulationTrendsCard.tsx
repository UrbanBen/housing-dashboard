"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface PopulationTrendsCardProps {
  selectedLGA: LGA | null;
}

interface CensusData {
  name: string;
  population_2011: number;
  population_2016: number;
  population_2021: number;
  population_2026_proj: number;
  growth_rate_annual_avg: number;
}

export function PopulationTrendsCard({ selectedLGA }: PopulationTrendsCardProps) {
  const [censusData, setCensusData] = useState<CensusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch census data when LGA changes
  useEffect(() => {
    const fetchCensusData = async () => {
      if (!selectedLGA) {
        setCensusData(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const lgaName = selectedLGA.id === 'nsw-state' ? 'NSW' : selectedLGA.name;
        const response = await fetch(`/api/census-data?lgaName=${encodeURIComponent(lgaName)}`);
        const result = await response.json();

        if (result.success && result.data) {
          setCensusData(result.data);
        } else {
          setError(result.error || 'No census data available');
          setCensusData(null);
        }
      } catch (error) {
        console.error('Error fetching census data:', error);
        setError('Failed to load population data');
        setCensusData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCensusData();
  }, [selectedLGA]);

  // Prepare chart data
  const chartData = censusData ? [
    {
      year: '2011',
      population: censusData.population_2011,
      type: 'Census'
    },
    {
      year: '2016',
      population: censusData.population_2016,
      type: 'Census'
    },
    {
      year: '2021',
      population: censusData.population_2021,
      type: 'Census'
    },
    {
      year: '2026',
      population: censusData.population_2026_proj,
      type: 'Projected'
    }
  ] : [];

  const formatPopulation = (value: number | null | undefined) => {
    if (value == null) return 'N/A';
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="text-xl">
              {selectedLGA ? `${selectedLGA.name} Population Trends` : 'NSW Population Trends'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Census data (2011-2021) and 2026 projection
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

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2">Select an LGA to view population trends</p>
          </div>
        )}

        {!isLoading && !error && censusData && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">2011 Census</div>
                <div className="text-2xl font-bold">{formatPopulation(censusData.population_2011)}</div>
              </div>
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">2021 Census</div>
                <div className="text-2xl font-bold">{formatPopulation(censusData.population_2021)}</div>
              </div>
              <div className="bg-secondary/20 border border-secondary/30 rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">2026 Projected</div>
                <div className="text-2xl font-bold text-primary">{formatPopulation(censusData.population_2026_proj)}</div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="year"
                    className="text-xs"
                    stroke="currentColor"
                  />
                  <YAxis
                    className="text-xs"
                    stroke="currentColor"
                    tickFormatter={formatPopulation}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      formatPopulation(value),
                      props.payload.type === 'Projected' ? 'Projected Population' : 'Census Population'
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="population"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Growth Rate Summary */}
            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-secondary" />
                <span className="text-sm font-medium">Average Annual Growth Rate (2011-2026)</span>
              </div>
              <div className="text-2xl font-bold text-secondary">
                {censusData.growth_rate_annual_avg != null ? censusData.growth_rate_annual_avg.toFixed(2) : 'N/A'}%
              </div>
            </div>

            {/* Data Source Note */}
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Source: ABS Census 2011, 2016, 2021 • 2026 projection based on 2016-2021 growth rate
            </div>
          </>
        )}

        {!isLoading && !error && !censusData && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Select an LGA to view population trends</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
