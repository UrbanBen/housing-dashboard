"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface DwellingTypeCardProps {
  selectedLGA?: { name: string; id: string } | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface DwellingTypeData {
  dwelling_type: string;
  value: number;
}

interface ChartData {
  name: string;
  [key: string]: string | number;
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

export function DwellingTypeCard({ selectedLGA, isAdminMode = false, onAdminClick }: DwellingTypeCardProps) {
  const [data, setData] = useState<DwellingTypeData[] | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});

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
          setData(result.data);

          // Calculate total
          const total = result.data.reduce((sum: number, item: DwellingTypeData) => sum + item.value, 0);

          // Create chart data - single bar with 100% stacked segments
          const chartDataPoint: ChartData = { name: 'Dwelling Types' };
          const percentageData: { [key: string]: number } = {};

          result.data.forEach((item: DwellingTypeData) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            chartDataPoint[item.dwelling_type] = percentage;
            percentageData[item.dwelling_type] = percentage;
          });

          setChartData([chartDataPoint]);
          setPercentages(percentageData);
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dwellingType = payload[0].name;
      const percentage = payload[0].value;
      const totalDwellings = data?.reduce((sum, item) => sum + item.value, 0) || 0;
      const count = data?.find(item => item.dwelling_type === dwellingType)?.value || 0;

      return (
        <div className="bg-card border-2 border-[#22c55e] rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold mb-2 text-[#22c55e]">{dwellingType}</p>
          <p className="text-xs text-muted-foreground">
            Count: {count.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            Percentage: {percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

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

        {selectedLGA && chartData.length > 0 && !isLoading && !error && (
          <div className="space-y-4">
            {/* 100% Stacked Bar Chart */}
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Legend
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-sm">{value}</span>
                    )}
                  />
                  {Object.keys(DWELLING_COLORS).map((dwellingType) => (
                    <Bar
                      key={dwellingType}
                      dataKey={dwellingType}
                      stackId="stack"
                      fill={DWELLING_COLORS[dwellingType]}
                      name={dwellingType}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
              {data && data.map((item) => (
                <div key={item.dwelling_type} className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DWELLING_COLORS[item.dwelling_type] }}
                    />
                    <div className="text-xs text-muted-foreground truncate">
                      {item.dwelling_type}
                    </div>
                  </div>
                  <div className="text-sm font-bold ml-5">
                    {item.value.toLocaleString()} ({percentages[item.dwelling_type]?.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
