"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Settings } from "lucide-react";
import { ResponsivePie } from '@nivo/pie';

interface AustralianBornCardProps {
  selectedLGA?: { name: string; id: string } | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface SummaryData {
  totalPopulation: number;
  australiaBorn: number;
  overseasBorn: number;
  australiaPercentage: string;
  overseasPercentage: string;
}

export function AustralianBornCard({ selectedLGA, isAdminMode = false, onAdminClick }: AustralianBornCardProps) {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLGA) {
      setSummary(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/country-of-birth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lgaName: selectedLGA.name,
            schema: 's12_census',
            table: 'cen21_country_of_birth_person_lga',
            lgaColumn: 'lga_name_2021',
            countryColumn: 'country_of_birth_of_person',
            valueColumn: 'value',
            limit: 10
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        if (result.summary) {
          setSummary(result.summary);
        } else {
          setError('No data available for this LGA');
        }
      } catch (err) {
        console.error('Error fetching Australian born data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  // Prepare donut chart data with darker green colors
  const donutData = summary ? [
    {
      id: 'Australia',
      label: 'Born in Australia',
      value: summary.australiaBorn,
      color: '#047857' // Dark green
    },
    {
      id: 'Overseas',
      label: 'Born Overseas',
      value: summary.overseasBorn,
      color: '#10b981' // Medium green
    }
  ] : [];

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#eab308] hover:ring-2 hover:ring-[#eab308]/50 hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-[#eab308]" />
            <CardTitle className="text-xl text-[#eab308]">
              Australian Born{selectedLGA ? ` - ${selectedLGA.name}` : ''}
            </CardTitle>
          </div>
          {isAdminMode && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Configure Australian Born"
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedLGA && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select an LGA to view Australian born data
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

        {selectedLGA && summary && !isLoading && !error && (
          <div className="space-y-0">
            {/* Australia vs Overseas Donut Chart */}
            <div className="h-[500px]">
              <ResponsivePie
                  data={donutData}
                  margin={{ top: 0, right: 60, bottom: 0, left: 60 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  colors={{ datum: 'data.color' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  enableArcLinkLabels={false}
                  enableArcLabels={false}
                  layers={['arcs', 'arcLabels', 'legends', ({ dataWithArc, centerX, centerY }: any) => {
                    return (
                      <g key="custom-labels">
                        {dataWithArc.map((datum: any) => {
                          // Calculate angle for label position (center of slice)
                          const angle = datum.arc.startAngle + (datum.arc.endAngle - datum.arc.startAngle) / 2;

                          // Position labels further from center (closer to outer edge of donut)
                          const pieRadius = Math.min(centerX, centerY) * 0.75;
                          const innerRadius = pieRadius * 0.5; // innerRadius is 0.5 of the pie
                          // Move "Born Overseas" label further out
                          const labelPercentage = datum.label === 'Born Overseas' ? 0.965 : 0.945;
                          const radius = innerRadius + (pieRadius - innerRadius) * labelPercentage;
                          const x = centerX + Math.sin(angle) * radius;
                          const y = centerY - Math.cos(angle) * radius;

                          return (
                            <g key={datum.id}>
                              <text
                                x={x}
                                y={y - 8}
                                textAnchor="middle"
                                style={{ fill: 'white', fontSize: 13, fontWeight: 600 }}
                              >
                                {datum.label}
                              </text>
                              <text
                                x={x}
                                y={y + 8}
                                textAnchor="middle"
                                style={{ fill: 'white', fontSize: 13, fontWeight: 600 }}
                              >
                                {datum.value.toLocaleString()}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  }]}
                  legends={[]}
                  tooltip={({ datum }) => (
                    <div className="bg-card border-2 border-[#047857] rounded-lg p-3 shadow-lg">
                      <p className="text-sm font-semibold mb-1 text-[#047857]">{datum.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Count: {datum.value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Percentage: {summary && ((datum.value / summary.totalPopulation) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                />
              </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-4 -mt-5 pt-3 border-t border-border/50">
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#047857' }}></div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">Australia-born</div>
                <div className="text-lg font-bold">{summary.australiaBorn.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">({summary.australiaPercentage}%)</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: 'transparent' }}></div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">Total Population</div>
                <div className="text-lg font-bold">{summary.totalPopulation.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center mb-1">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                </div>
                <div className="text-xs text-muted-foreground mb-1">Overseas-born</div>
                <div className="text-lg font-bold">{summary.overseasBorn.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">({summary.overseasPercentage}%)</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
