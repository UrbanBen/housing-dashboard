"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Settings } from "lucide-react";
import { ResponsivePie } from '@nivo/pie';

interface DwellingTypeCardProps {
  selectedLGA?: { name: string; id: string } | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface DwellingTypeData {
  dwelling_type: string;
  value: number;
}

interface NivoPieData {
  id: string;
  label: string;
  value: number;
  color: string;
}

// Various shades of green for 6 dwelling types
const DWELLING_COLORS: { [key: string]: string } = {
  'Occupied private dwellings': '#052e16',      // Darkest green
  'Unoccupied private dwellings': '#166534',    // Dark green
  'Non-private dwellings': '#22c55e',            // Bright green
  'Migratory': '#4ade80',                        // Light green
  'Off-shore': '#86efac',                        // Lighter green
  'Shipping': '#bbf7d0',                         // Lightest green
};

// Abbreviate dwelling type names for labels
const abbreviateDwellingType = (type: string): string => {
  const abbreviations: { [key: string]: string } = {
    'Occupied private dwellings': 'Occupied',
    'Unoccupied private dwellings': 'Unoccupied',
    'Non-private dwellings': 'Non-private',
    'Migratory': 'Migratory',
    'Off-shore': 'Off-shore',
    'Shipping': 'Shipping'
  };
  return abbreviations[type] || type;
};

export function DwellingTypeCard({ selectedLGA, isAdminMode = false, onAdminClick }: DwellingTypeCardProps) {
  const [data, setData] = useState<DwellingTypeData[] | null>(null);
  const [pieData, setPieData] = useState<NivoPieData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLGA) {
      setData(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/dwelling-type', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lgaName: selectedLGA.name,
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'db_admin',
            passwordPath: '/users/ben/permissions/.env.admin',
            schema: 's12_census',
            table: 'cen21_dwelling_type_lga',
            lgaColumn: 'lga_name_2021'
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch dwelling type data');
        }

        if (result.data && Array.isArray(result.data)) {
          // Filter out dwelling types with zero count
          const filteredData = result.data.filter((item: DwellingTypeData) => item.value > 0);
          setData(filteredData);

          // Create Nivo pie chart data
          const pieChartData = filteredData.map((item: DwellingTypeData) => ({
            id: item.dwelling_type,
            label: item.dwelling_type,
            value: item.value,
            color: DWELLING_COLORS[item.dwelling_type] || '#94a3b8'
          }));

          setPieData(pieChartData);
        } else {
          setError('No data available for this LGA');
        }
      } catch (err) {
        console.error('Error fetching dwelling type data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);


  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#eab308] hover:ring-2 hover:ring-[#eab308]/50 hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="h-6 w-6 text-[#eab308]" />
            <CardTitle className="text-xl text-[#eab308]">
              Dwelling Type{selectedLGA ? ` - ${selectedLGA.name}` : ''}
            </CardTitle>
          </div>
          {isAdminMode && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Configure Dwelling Type"
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedLGA && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select an LGA to view dwelling type data
            </p>
          </div>
        )}

        {selectedLGA && isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {selectedLGA && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {selectedLGA && pieData.length > 0 && !isLoading && !error && (
          <div className="space-y-0">
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
                  const totalDwellings = data?.reduce((sum, item) => sum + item.value, 0) || 0;

                  return (
                    <g key="custom-labels">
                      {dataWithArc.map((datum: any) => {
                        const percentage = totalDwellings > 0 ? (datum.value / totalDwellings) * 100 : 0;
                        const count = Number(datum.value).toLocaleString('en-US');
                        const abbrev = abbreviateDwellingType(datum.label.toString());

                        // If section is > 10%, place label over the pie chart section
                        if (percentage > 10) {
                          // Calculate midpoint angle of the arc
                          const midAngle = datum.arc.startAngle + (datum.arc.endAngle - datum.arc.startAngle) / 2;

                          // Position label further from center (closer to outer edge of donut)
                          const pieRadius = Math.min(centerX, centerY) * 0.75;
                          const innerRadius = pieRadius * 0.5; // innerRadius is 0.5 of the pie
                          // Move "Occupied" label further out
                          const labelPercentage = datum.label === 'Occupied private dwellings' ? 0.96 : 0.925;
                          const labelRadius = innerRadius + (pieRadius - innerRadius) * labelPercentage;

                          const labelX = centerX + Math.sin(midAngle) * labelRadius;
                          const labelY = centerY - Math.cos(midAngle) * labelRadius;

                          return (
                            <g key={datum.id}>
                              <text
                                x={labelX}
                                y={labelY - 8}
                                textAnchor="middle"
                                style={{ fill: 'white', fontSize: 13, fontWeight: 600 }}
                              >
                                {abbrev}
                              </text>
                              <text
                                x={labelX}
                                y={labelY + 8}
                                textAnchor="middle"
                                style={{ fill: 'white', fontSize: 13, fontWeight: 600 }}
                              >
                                {percentage.toFixed(1)}%
                              </text>
                            </g>
                          );
                        }

                        // For sections ≤ 10%, keep the external labels with lines
                        let startAngle = datum.arc.startAngle + (datum.arc.endAngle - datum.arc.startAngle) / 2;
                        let endAngle = startAngle;

                        // Adjust angles for specific labels if needed
                        if (datum.label === 'Occupied private dwellings') {
                          startAngle -= (90 * Math.PI / 180);
                          endAngle = Math.PI / 4;
                        }

                        if (datum.label === 'Non-private dwellings') {
                          endAngle += (15 * Math.PI / 180);
                        }

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
                  const totalDwellings = data?.reduce((sum, item) => sum + item.value, 0) || 0;
                  const percentage = totalDwellings > 0 ? (datum.value / totalDwellings) * 100 : 0;
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

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 -mt-5 pt-3 border-t border-border/50">
              {data && data.map((item) => {
                const total = data.reduce((sum, d) => sum + d.value, 0);
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={item.dwelling_type} className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: DWELLING_COLORS[item.dwelling_type] || '#94a3b8' }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {item.dwelling_type === 'Non-private dwellings' ? (
                        <>
                          Non-private<br />dwellings
                        </>
                      ) : (
                        item.dwelling_type
                      )}
                    </div>
                    <div className="text-sm font-bold">
                      {item.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
