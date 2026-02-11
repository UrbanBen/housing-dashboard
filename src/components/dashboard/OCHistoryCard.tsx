"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface OCHistoryCardProps {
  selectedLGA: LGA | null;
  cardWidth?: 'small' | 'medium' | 'large' | 'xl';
}

interface HistoryData {
  period_start: string;
  calendar_month: number;
  calendar_year: number;
  fiscal_year: number;
  total_determined: number;
  determined_approved: number;
  determined_withdrawn: number;
}

export function OCHistoryCard({ selectedLGA, cardWidth = 'large' }: OCHistoryCardProps) {
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
        const response = await fetch('/api/oc-comprehensive', {
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

  // Calculate historical approval rate
  const calculateHistoricalApprovalRate = () => {
    if (!summary) return null;
    if (summary.total_determined === 0) return null;
    return ((summary.total_approved / summary.total_determined) * 100).toFixed(1);
  };

  const dateRange = getDateRange();
  const historicalApprovalRate = calculateHistoricalApprovalRate();

  // Responsive configuration based on card width
  const getChartConfig = () => {
    switch (cardWidth) {
      case 'small':
        return {
          height: 250,
          summaryGrid: 'grid grid-cols-1 gap-2 mb-4',
          fontSize: 'text-base',
          showBrush: false,
          xAxisInterval: 'preserveStartEnd' as const
        };
      case 'medium':
        return {
          height: 300,
          summaryGrid: 'grid grid-cols-3 gap-2 mb-5',
          fontSize: 'text-xl',
          showBrush: true,
          xAxisInterval: 'preserveStartEnd' as const
        };
      case 'large':
        return {
          height: 350,
          summaryGrid: 'grid grid-cols-3 gap-3 mb-6',
          fontSize: 'text-2xl',
          showBrush: true,
          xAxisInterval: 'preserveStartEnd' as const
        };
      case 'xl':
        return {
          height: 400,
          summaryGrid: 'grid grid-cols-3 gap-4 mb-6',
          fontSize: 'text-3xl',
          showBrush: true,
          xAxisInterval: 'preserveStartEnd' as const
        };
      default:
        return {
          height: 350,
          summaryGrid: 'grid grid-cols-3 gap-3 mb-6',
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
    Total: item.total_determined,
    Approved: item.determined_approved,
  }));

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#ef4444]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-[#ef4444]" />
            <div>
              <CardTitle className="text-xl text-[#ef4444]">Complete OC History</CardTitle>
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
            <p>Select an LGA to view complete OC history</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className={chartConfig.summaryGrid}>
              <div className="bg-zinc-500/5 border border-zinc-500/10 rounded-lg p-3 text-center hover:bg-zinc-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-zinc-600 dark:text-zinc-400`}>
                  {summary?.total_determined?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">All-Time Total</div>
              </div>

              <div className="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3 text-center hover:bg-gray-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-gray-600 dark:text-gray-400`}>
                  {historicalApprovalRate ? `${historicalApprovalRate}%` : 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">Historical Approval Rate</div>
              </div>

              <div className="bg-slate-500/5 border border-slate-500/10 rounded-lg p-3 text-center hover:bg-slate-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-slate-600 dark:text-slate-400`}>
                  {dateRange?.years || 0}
                </div>
                <div className="text-xs text-muted-foreground">Years of Data</div>
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
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                  dataKey="Total"
                  stroke="#71717a"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Approved"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                />
                {chartConfig.showBrush && (
                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#71717a"
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
