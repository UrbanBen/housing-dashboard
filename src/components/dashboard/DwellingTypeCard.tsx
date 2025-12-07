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

// Muted color palette for 6 dwelling types
const DWELLING_COLORS: { [key: string]: string } = {
  'Occupied private dwellings': '#64748b',      // Slate
  'Unoccupied private dwellings': '#94a3b8',    // Lighter slate
  'Non-private dwellings': '#78716c',            // Stone
  'Migratory': '#a8a29e',                        // Lighter stone
  'Off-shore': '#71717a',                        // Zinc
  'Shipping': '#a1a1aa',                         // Lighter zinc
};

// Custom label component for multi-line labels
const CustomArcLinkLabel = (props: any) => {
  const { x, y, label, textAnchor, datum } = props;
  const lines = String(label).split('\n');

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      style={{
        fill: 'hsl(var(--foreground))',
        fontSize: '11px',
        pointerEvents: 'none'
      }}
    >
      {lines.map((line: string, i: number) => (
        <tspan
          key={i}
          x={x}
          dy={i === 0 ? '-1.2em' : '1.2em'}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
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
    <Card className="shadow-lg border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">
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
          <div className="space-y-4">
            {/* Nivo Pie Chart */}
            <div className="h-96">
              <ResponsivePie
                data={pieData}
                margin={{ top: 60, right: 220, bottom: 100, left: 220 }}
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
                enableArcLinkLabels={true}
                arcLinkLabelsSkipAngle={0}
                arcLinkLabelsTextColor="hsl(var(--foreground))"
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLinkLabelComponent={CustomArcLinkLabel}
                arcLinkLabel={(d) => {
                  const totalDwellings = data?.reduce((sum, item) => sum + item.value, 0) || 0;
                  const percentage = totalDwellings > 0 ? (d.value / totalDwellings) * 100 : 0;
                  const count = Number(d.value).toLocaleString('en-US');

                  // Add line breaks: before "private", after ":", and before percentage
                  let label = d.label.toString();
                  label = label.replace(' private', '\nprivate');
                  return `${label}:\n${percentage.toFixed(1)}%\n(${count})`;
                }}
                arcLabelsSkipAngle={15}
                arcLabelsTextColor={{
                  from: 'color',
                  modifiers: [['darker', 2]]
                }}
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
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
              {data && data.map((item) => {
                const total = data.reduce((sum, d) => sum + d.value, 0);
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={item.dwelling_type} className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: DWELLING_COLORS[item.dwelling_type] || '#94a3b8' }}
                      />
                      <div className="text-xs text-muted-foreground truncate">
                        {item.dwelling_type}
                      </div>
                    </div>
                    <div className="text-sm font-bold ml-5">
                      {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
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
