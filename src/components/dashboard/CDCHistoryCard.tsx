"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
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
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  useEffect(() => {
    if (!selectedLGA) {
      setData([]);
      setSummary(null);
      setBrushRange(null);
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
          setBrushRange(null); // Reset brush when new data loads
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

  // Get active data based on brush selection
  const getActiveData = () => {
    if (!brushRange || data.length === 0) return data;
    return data.slice(brushRange.startIndex, brushRange.endIndex + 1);
  };

  const activeData = getActiveData();

  // Calculate summary from data subset
  const calculateSummaryFromData = (dataSubset: HistoryData[]) => {
    if (dataSubset.length === 0) {
      return {
        total_dwellings: 0,
        monthly_average: 0,
        annual_average: 0,
      };
    }

    const totalDwellings = dataSubset.reduce((sum, item) => sum + (item.total_dwellings || 0), 0);
    const monthlyAverage = totalDwellings / dataSubset.length;
    const annualAverage = monthlyAverage * 12;

    return {
      total_dwellings: totalDwellings,
      monthly_average: Math.round(monthlyAverage * 10) / 10,
      annual_average: Math.round(annualAverage * 10) / 10,
    };
  };

  const activeSummary = brushRange ? calculateSummaryFromData(activeData) : summary;

  // Calculate date range
  const getDateRange = () => {
    if (activeData.length === 0) return null;
    const earliest = new Date(activeData[0].period_start);
    const latest = new Date(activeData[activeData.length - 1].period_start);

    // Calculate total months difference
    const totalMonths = (latest.getFullYear() - earliest.getFullYear()) * 12
                       + (latest.getMonth() - earliest.getMonth());

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    // Format timeframe string
    let timeframe = '';
    if (years > 0) {
      timeframe += `${years} year${years !== 1 ? 's' : ''}`;
    }
    if (months > 0) {
      if (timeframe) timeframe += ' & ';
      timeframe += `${months} month${months !== 1 ? 's' : ''}`;
    }
    if (!timeframe) timeframe = '0 months';

    return {
      from: earliest.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
      to: latest.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' }),
      years: latest.getFullYear() - earliest.getFullYear() + 1,
      timeframe: timeframe
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
              <CardTitle className="text-xl text-teal-600 dark:text-teal-400">Complying Development History</CardTitle>
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
                  {activeSummary?.total_dwellings?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Approved Dwellings</div>
              </div>

              <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-3 text-center hover:bg-teal-500/10 transition-all">
                <div className="whitespace-nowrap flex items-baseline justify-center gap-1">
                  {(dateRange?.timeframe || '0 months').split(' ').map((part, idx) => {
                    const isNumber = !isNaN(Number(part));
                    return (
                      <span
                        key={idx}
                        className={isNumber
                          ? `${chartConfig.fontSize} font-bold text-teal-600 dark:text-teal-400`
                          : 'text-sm text-muted-foreground'
                        }
                      >
                        {part}
                      </span>
                    );
                  })}
                </div>
                <div className="text-xs text-muted-foreground">Time Frame</div>
              </div>

              <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-3 text-center hover:bg-teal-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-teal-600 dark:text-teal-400`}>
                  {activeSummary?.monthly_average?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Monthly Average CDC Dwellings Approved</div>
              </div>

              <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-3 text-center hover:bg-teal-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-teal-600 dark:text-teal-400`}>
                  {activeSummary?.annual_average?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Annual Average CDC Dwellings Approved</div>
              </div>
            </div>

            {/* Interactive Timeline Chart with Brush */}
            <ResponsiveContainer width="100%" height={chartConfig.height}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorDwellings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="Dwellings"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fill="url(#colorDwellings)"
                  name="Dwellings"
                />
                {chartConfig.showBrush && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#14b8a6"
                    fill="hsl(var(--muted))"
                    fillOpacity={0.3}
                    onChange={(range: any) => {
                      if (range && range.startIndex !== undefined && range.endIndex !== undefined) {
                        setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
                      }
                    }}
                  />
                )}
              </AreaChart>
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
