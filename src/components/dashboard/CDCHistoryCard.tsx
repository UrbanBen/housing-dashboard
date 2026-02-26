"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface CDCHistoryCardProps {
  selectedLGA: LGA | null;
  cardWidth?: 'small' | 'medium' | 'large' | 'xl';
}

interface HistoryData {
  period_start: string;
  total_dwellings: number;
}

export function CDCHistoryCard({ selectedLGA, cardWidth = 'large' }: CDCHistoryCardProps) {
  const [data, setData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!selectedLGA) {
      setData([]);
      setSummary(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/cdc-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'history',
            lgaName: selectedLGA.name,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setSummary(result.summary);
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
  }, [selectedLGA]);

  // Calculate date range
  const getDateRange = () => {
    if (data.length === 0) return null;
    const earliest = new Date(data[0].period_start);
    const latest = new Date(data[data.length - 1].period_start);
    return {
      from: earliest.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
      to: latest.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
      years: latest.getFullYear() - earliest.getFullYear() + 1
    };
  };

  const dateRange = getDateRange();

  // Responsive configuration based on card width
  const getChartConfig = () => {
    switch (cardWidth) {
      case 'small':
        return {
          height: 250,
          summaryGrid: 'grid grid-cols-2 gap-2 mb-4',
          fontSize: 'text-base',
          showBrush: false,
          xAxisInterval: 'preserveStartEnd' as const
        };
      case 'medium':
        return {
          height: 300,
          summaryGrid: 'grid grid-cols-4 gap-2 mb-5',
          fontSize: 'text-xl',
          showBrush: true,
          xAxisInterval: 'preserveStartEnd' as const
        };
      case 'large':
        return {
          height: 350,
          summaryGrid: 'grid grid-cols-4 gap-3 mb-6',
          fontSize: 'text-2xl',
          showBrush: true,
          xAxisInterval: 'preserveStartEnd' as const
        };
      case 'xl':
        return {
          height: 400,
          summaryGrid: 'grid grid-cols-4 gap-4 mb-6',
          fontSize: 'text-3xl',
          showBrush: true,
          xAxisInterval: 'preserveStartEnd' as const
        };
      default:
        return {
          height: 350,
          summaryGrid: 'grid grid-cols-4 gap-3 mb-6',
          fontSize: 'text-2xl',
          showBrush: true,
          xAxisInterval: 'preserveStartEnd' as const
        };
    }
  };

  const chartConfig = getChartConfig();

  // Format data for chart
  const chartData = data.map(item => ({
    date: new Date(item.period_start).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
    Dwellings: item.total_dwellings,
  }));

  // Calculate Y-axis domain to ensure all data is visible
  const maxValue = Math.max(...chartData.map(d => d.Dwellings), 0);
  const yAxisDomain = [0, Math.ceil(maxValue * 1.1)];

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-teal-500" />
            <div>
              <CardTitle className="text-xl">Complying Development History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                All available data • {selectedLGA?.name || 'Select LGA'}
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
            <p>Select an LGA to view complying development history</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className={chartConfig.summaryGrid}>
              <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-3 text-center hover:bg-teal-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-teal-600 dark:text-teal-400`}>
                  {summary?.total_dwellings?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Approved Dwellings</div>
              </div>

              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-3 text-center hover:bg-cyan-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-cyan-600 dark:text-cyan-400`}>
                  {dateRange?.years || 0}
                </div>
                <div className="text-xs text-muted-foreground">Years of Data</div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center hover:bg-emerald-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-emerald-600 dark:text-emerald-400`}>
                  {summary?.monthly_average?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Monthly Average CDC Dwellings Approved</div>
              </div>

              <div className="bg-sky-500/5 border border-sky-500/10 rounded-lg p-3 text-center hover:bg-sky-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-sky-600 dark:text-sky-400`}>
                  {summary?.annual_average?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Annual Average CDC Dwellings Approved</div>
              </div>
            </div>

            {/* Interactive Timeline Chart with Brush */}
            <ResponsiveContainer width="100%" height={chartConfig.height}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  interval={chartConfig.xAxisInterval}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={yAxisDomain}
                  allowDataOverflow={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Dwellings"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {chartConfig.showBrush && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#14b8a6"
                    fill="hsl(var(--muted))"
                    fillOpacity={0.3}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>

            {dateRange && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Data Coverage: {dateRange.from} to {dateRange.to} ({dateRange.years} years)
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
