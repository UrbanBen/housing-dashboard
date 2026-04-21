"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface CDCBuildingCodePieCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
  cdcTimeframe?: { startDate: string; endDate: string } | null;
}

interface BuildingClassData {
  building_class: string;
  total_count: number;
}

// Teal color palette for CDC cards
const COLORS = [
  '#14b8a6', // Teal 500
  '#2dd4bf', // Teal 400
  '#5eead4', // Teal 300
  '#99f6e4', // Teal 200
  '#ccfbf1', // Teal 100
];

export default function CDCBuildingCodePieCard({ selectedLGA, cardWidth = 600, cdcTimeframe }: CDCBuildingCodePieCardProps) {
  const [data, setData] = useState<BuildingClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('Most Recent Month');

  useEffect(() => {
    if (!selectedLGA) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const body: any = {
          type: 'pie-chart',
          lgaName: selectedLGA.name,
        };

        // Add date range if provided by CDC History Card
        if (cdcTimeframe?.startDate && cdcTimeframe?.endDate) {
          body.startDate = cdcTimeframe.startDate;
          body.endDate = cdcTimeframe.endDate;

          // Format date range for display
          const start = new Date(cdcTimeframe.startDate);
          const end = new Date(cdcTimeframe.endDate);
          setDateRange(`${start.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} to ${end.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`);
        } else {
          setDateRange('Most Recent Month');
        }

        const response = await fetch('/api/cdc-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (result.success) {
          // Filter out classes with zero count
          const filteredData = result.data.filter((item: BuildingClassData) => item.total_count > 0);
          setData(filteredData);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA, cdcTimeframe]);

  // Calculate total for percentage display
  const total = data.reduce((sum, item) => sum + item.total_count, 0);

  // Format data for pie chart
  const chartData = data.map(item => ({
    name: item.building_class.replace('Class ', ''),
    value: item.total_count,
    percentage: total > 0 ? ((item.total_count / total) * 100).toFixed(1) : '0',
  }));

  // Responsive configuration
  const getChartConfig = () => {
    if (cardWidth < 400) {
      return { height: 250, showLabels: false, fontSize: 'text-sm' };
    } else if (cardWidth < 600) {
      return { height: 300, showLabels: true, fontSize: 'text-base' };
    } else {
      return { height: 350, showLabels: true, fontSize: 'text-lg' };
    }
  };

  const chartConfig = getChartConfig();

  // Custom label for pie slices
  const renderCustomLabel = (entry: any) => {
    if (!chartConfig.showLabels) return null;
    return `${entry.percentage}%`;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PieChartIcon className="h-6 w-6 text-teal-500" />
            <div>
              <CardTitle className="text-xl text-teal-600 dark:text-teal-400">CDC by Building Class</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {dateRange} • {selectedLGA?.name || 'Select LGA'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Select an LGA to view building class distribution</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="mb-4 p-4 bg-teal-500/5 border border-teal-500/10 rounded-lg text-center">
              <div className="text-3xl font-bold text-teal-600 dark:text-teal-400">
                {total.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total CDC Certificates</div>
            </div>

            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height={chartConfig.height}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={chartConfig.height / 3}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toLocaleString()} (${props.payload.percentage}%)`,
                    name
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Breakdown Table */}
            <div className="mt-4 space-y-2">
              {chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-teal-500/5 border border-teal-500/10 rounded-lg hover:bg-teal-500/10 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-teal-600 dark:text-teal-400">
                      {item.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
