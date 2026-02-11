"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle } from "lucide-react";
import { ResponsivePie } from '@nivo/pie';
import type { LGA } from '@/components/filters/LGALookup';

interface CitizenshipCardProps {
  selectedLGA: LGA | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface CitizenshipData {
  lga_name: string;
  lga_code: string;
  current: {
    categories: {
      'Australian Citizen': number;
      'Not an Australian Citizen': number;
      'Not stated': number;
    };
    total: number;
    citizenPercentage: number;
  };
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

interface NivoPieData {
  id: string;
  label: string;
  value: number;
  color: string;
}

// Green color scheme for citizenship status
const COLORS: { [key: string]: string } = {
  'Australian Citizen': '#052e16',        // Darkest green
  'Not an Australian Citizen': '#22c55e', // Bright green
  'Not stated': '#86efac'                 // Light green
};

// Abbreviate citizenship labels
const abbreviateCitizenshipType = (type: string): string => {
  const abbreviations: { [key: string]: string } = {
    'Australian Citizen': 'Citizen',
    'Not an Australian Citizen': 'Non-Citizen',
    'Not stated': 'Not Stated'
  };
  return abbreviations[type] || type;
};

export function CitizenshipCard({ selectedLGA, isAdminMode = false, onAdminClick }: CitizenshipCardProps) {
  const [data, setData] = useState<CitizenshipData | null>(null);
  const [pieData, setPieData] = useState<NivoPieData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch citizenship data when LGA changes
  useEffect(() => {
    if (!selectedLGA?.name) {
      setData(null);
      setPieData([]);
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

          // Create Nivo pie chart data
          const pieChartData: NivoPieData[] = [
            {
              id: 'Australian Citizen',
              label: 'Australian Citizen',
              value: result.data.current.categories['Australian Citizen'],
              color: COLORS['Australian Citizen']
            },
            {
              id: 'Not an Australian Citizen',
              label: 'Not an Australian Citizen',
              value: result.data.current.categories['Not an Australian Citizen'],
              color: COLORS['Not an Australian Citizen']
            },
            {
              id: 'Not stated',
              label: 'Not stated',
              value: result.data.current.categories['Not stated'],
              color: COLORS['Not stated']
            }
          ];

          setPieData(pieChartData);
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
            <Users className="h-6 w-6 text-[#eab308]" />
            <div>
              <CardTitle className="text-xl text-[#eab308]">
                Australian Citizenship
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Census data 2011, 2016, 2021
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
            <div className="text-muted-foreground">Loading citizenship data...</div>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-muted-foreground text-center">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select an LGA to view citizenship data</p>
            </div>
          </div>
        ) : (
          <>
            {/* Nivo Pie Chart */}
            <div className="h-[500px]">
              <ResponsivePie
                data={pieData}
                margin={{ top: 30, right: 60, bottom: 0, left: 60 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                activeOuterRadiusOffset={8}
                colors={{ datum: 'data.color' }}
                borderWidth={1}
                borderColor={{
                  from: 'color',
                  modifiers: [['darker', 0.2]]
                }}
                enableArcLinkLabels={false}
                layers={['arcs', 'arcLabels', 'legends', ({ dataWithArc, centerX, centerY }: any) => {
                  const totalPopulation = data?.current.total || 0;

                  return (
                    <g key="custom-labels">
                      {dataWithArc.map((datum: any) => {
                        const percentage = totalPopulation > 0 ? (datum.value / totalPopulation) * 100 : 0;
                        const count = Number(datum.value).toLocaleString('en-US');
                        const abbrev = abbreviateCitizenshipType(datum.label.toString());

                        // If section is > 10%, place label over the pie chart section
                        if (percentage > 10) {
                          // Calculate midpoint angle of the arc
                          const midAngle = datum.arc.startAngle + (datum.arc.endAngle - datum.arc.startAngle) / 2;

                          // Position label further from center (closer to outer edge of donut)
                          const pieRadius = Math.min(centerX, centerY) * 0.75;
                          const innerRadius = pieRadius * 0.5;
                          const labelRadius = innerRadius + (pieRadius - innerRadius) * 0.925;

                          const labelX = centerX + Math.sin(midAngle) * labelRadius;
                          const labelY = centerY - Math.cos(midAngle) * labelRadius;

                          return (
                            <g key={datum.id}>
                              <text
                                x={labelX}
                                y={labelY - 16}
                                textAnchor="middle"
                                style={{ fill: 'white', fontSize: 13, fontWeight: 600 }}
                              >
                                {abbrev}
                              </text>
                              <text
                                x={labelX}
                                y={labelY}
                                textAnchor="middle"
                                style={{ fill: 'white', fontSize: 13, fontWeight: 600 }}
                              >
                                {percentage.toFixed(1)}%
                              </text>
                              <text
                                x={labelX}
                                y={labelY + 16}
                                textAnchor="middle"
                                style={{ fill: 'white', fontSize: 11, fontWeight: 500 }}
                              >
                                ({count})
                              </text>
                            </g>
                          );
                        }

                        // For sections ≤ 10%, keep the external labels with lines
                        const startAngle = datum.arc.startAngle + (datum.arc.endAngle - datum.arc.startAngle) / 2;
                        const endAngle = startAngle;

                        const pieRadius = Math.min(centerX, centerY) * 0.75;
                        const outerRadius = Math.max(centerX, centerY) * 0.9;

                        const startX = centerX + Math.sin(startAngle) * pieRadius;
                        const startY = centerY - Math.cos(startAngle) * pieRadius;

                        const linkX = centerX + Math.sin(endAngle) * outerRadius;
                        const linkY = centerY - Math.cos(endAngle) * outerRadius;

                        const textAnchor = linkX > centerX ? 'start' : 'end';

                        return (
                          <g key={datum.id}>
                            <line
                              x1={startX}
                              y1={startY}
                              x2={linkX}
                              y2={linkY}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                            <text
                              x={linkX}
                              y={linkY - 14}
                              textAnchor={textAnchor}
                              style={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 500 }}
                            >
                              {abbrev}:
                            </text>
                            <text
                              x={linkX}
                              y={linkY}
                              textAnchor={textAnchor}
                              style={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 500 }}
                            >
                              {percentage.toFixed(1)}%
                            </text>
                            <text
                              x={linkX}
                              y={linkY + 14}
                              textAnchor={textAnchor}
                              style={{ fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 500 }}
                            >
                              ({count})
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                }]}
                enableArcLabels={false}
                tooltip={({ datum }) => {
                  const totalPopulation = data?.current.total || 0;
                  const percentage = totalPopulation > 0 ? (datum.value / totalPopulation) * 100 : 0;
                  return (
                    <div className="bg-card border-2 border-[#22c55e] rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-semibold mb-2 text-[#22c55e]">{datum.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Count: {datum.value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Percentage: {percentage.toFixed(1)}%
                      </p>
                    </div>
                  );
                }}
                legends={[]}
              />
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-chart-3/5 border border-chart-3/10 rounded-lg p-3 text-center hover:bg-chart-3/10 transition-all">
                <div className="text-2xl font-bold text-primary">
                  {data.summary.currentCitizenPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">Citizens (2021)</div>
              </div>
              <div className="bg-chart-3/5 border border-chart-3/10 rounded-lg p-3 text-center hover:bg-chart-3/10 transition-all">
                <div className="text-2xl font-bold text-primary">
                  {data.summary.totalPopulation2021.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Total Population</div>
              </div>
              <div className="bg-chart-3/5 border border-chart-3/10 rounded-lg p-3 text-center hover:bg-chart-3/10 transition-all">
                <div className={`text-2xl font-bold ${parseFloat(data.summary.change2011to2021) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {parseFloat(data.summary.change2011to2021) > 0 ? '+' : ''}{data.summary.change2011to2021}%
                </div>
                <div className="text-xs text-muted-foreground">Change 2011-2021</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
