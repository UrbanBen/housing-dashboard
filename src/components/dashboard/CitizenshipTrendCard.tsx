"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface CitizenshipTrendCardProps {
  selectedLGA: LGA | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface CitizenshipData {
  lga_name: string;
  lga_code: string;
  trend: Array<{
    year: string;
    'Australian Citizen': number;
    'Not an Australian Citizen': number;
    'Not stated': number;
    total: number;
  }>;
  summary: {
    currentCitizenPercentage: number;
    change2016to2021: string;
    change2011to2021: string;
    totalPopulation2021: number;
    populationGrowth2011to2021: number;
  };
}

const COLORS = {
  'Australian Citizen': '#00FF41',
  'Not an Australian Citizen': '#FF8042',
  'Not stated': '#666666'
};

export function CitizenshipTrendCard({ selectedLGA, isAdminMode = false, onAdminClick }: CitizenshipTrendCardProps) {
  const [data, setData] = useState<CitizenshipData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch citizenship data when LGA changes
  useEffect(() => {
    if (!selectedLGA?.name) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/citizenship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lgaName: selectedLGA.name,
            lgaCode: selectedLGA.id
          })
        });

        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch citizenship data');
        }
      } catch (err) {
        console.error('Error fetching citizenship data:', err);
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  // Handle double click for admin mode
  const handleDoubleClick = () => {
    if (isAdminMode) {
      onAdminClick?.();
    }
  };

  return (
    <Card
      className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#eab308] cursor-pointer hover:ring-2 hover:ring-[#eab308]/50 hover:shadow-lg transition-all"
      onDoubleClick={handleDoubleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-[#eab308]" />
            <div>
              <CardTitle className="text-xl text-[#eab308]">
                Australian Citizenship Trend
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Population trends 2011-2021
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <div className="flex items-center text-destructive p-4">
            <AlertCircle className="h-5 w-5 mr-2" />
            <div>
              <div className="font-medium">Error loading data</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground">Loading trend data...</div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select an LGA to view citizenship trends</p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-muted/50 p-3 rounded-md text-center">
                <div className={`text-2xl font-bold ${parseFloat(data.summary.change2011to2021) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(data.summary.change2011to2021) > 0 ? '+' : ''}{data.summary.change2011to2021}%
                </div>
                <div className="text-xs text-muted-foreground">Change 2011-2021</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md text-center">
                <div className={`text-2xl font-bold ${parseFloat(data.summary.change2016to2021) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(data.summary.change2016to2021) > 0 ? '+' : ''}{data.summary.change2016to2021}%
                </div>
                <div className="text-xs text-muted-foreground">Change 2016-2021</div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md text-center">
                <div className={`text-2xl font-bold ${data.summary.populationGrowth2011to2021 >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {data.summary.populationGrowth2011to2021 > 0 ? '+' : ''}{data.summary.populationGrowth2011to2021.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Population Growth</div>
              </div>
            </div>

            {/* Trend Line Chart */}
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Citizenship Trends (2011-2021)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="year"
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => (value / 1000).toFixed(0) + 'k'}
                  />
                  <Tooltip
                    formatter={(value: number) => value.toLocaleString()}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Australian Citizen"
                    stroke={COLORS['Australian Citizen']}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Not an Australian Citizen"
                    stroke={COLORS['Not an Australian Citizen']}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Not stated"
                    stroke={COLORS['Not stated']}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
