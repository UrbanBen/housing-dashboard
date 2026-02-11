"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface BAHistoryCardProps {
  selectedLGA: LGA | null;
  cardWidth?: 'small' | 'medium' | 'large' | 'xl';
}

interface HistoryData {
  month: string;
  total_approvals: number;
}

export function BAHistoryCard({ selectedLGA, cardWidth = 'large' }: BAHistoryCardProps) {
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
        const response = await fetch('/api/building-approvals-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'history',
            lgaName: selectedLGA.name,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data || []);
        setSummary(result.summary || null);
      } catch (err) {
        console.error('[BAHistoryCard] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  // Responsive configuration based on card width
  const getChartConfig = () => {
    switch (cardWidth) {
      case 'small':
        return {
          height: 250,
          summaryGrid: 'grid grid-cols-1 gap-2 mb-4',
          fontSize: 'text-base',
        };
      case 'medium':
        return {
          height: 300,
          summaryGrid: 'grid grid-cols-3 gap-2 mb-5',
          fontSize: 'text-xl',
        };
      case 'large':
        return {
          height: 350,
          summaryGrid: 'grid grid-cols-3 gap-3 mb-6',
          fontSize: 'text-2xl',
        };
      case 'xl':
        return {
          height: 400,
          summaryGrid: 'grid grid-cols-3 gap-4 mb-6',
          fontSize: 'text-3xl',
        };
      default:
        return {
          height: 350,
          summaryGrid: 'grid grid-cols-3 gap-3 mb-6',
          fontSize: 'text-2xl',
        };
    }
  };

  const chartConfig = getChartConfig();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border-2 border-indigo-500 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold mb-2 text-indigo-500">
            {new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-indigo-400">
            Total: {payload[0].value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate date range
  const dateRange = data.length > 0
    ? `${new Date(data[0].month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(data[data.length - 1].month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : 'No data';

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#6366f1]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="h-6 w-6 text-[#6366f1]" />
            <div>
              <CardTitle className="text-xl text-[#6366f1]">Complete BA History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLGA ? `All-time monthly data - ${selectedLGA.name}` : 'Select an LGA'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {selectedLGA ? 'No data available for this LGA' : 'Select an LGA to view complete history'}
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className={chartConfig.summaryGrid}>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-blue-600 dark:text-blue-400`}>
                  {summary?.total_approvals?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Approvals</div>
              </div>

              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 text-center hover:bg-green-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-green-600 dark:text-green-400`}>
                  {summary?.avg_per_period ? Number(summary.avg_per_period).toFixed(1) : '0'}
                </div>
                <div className="text-xs text-muted-foreground">Avg per Month</div>
              </div>

              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 text-center hover:bg-indigo-500/10 transition-all">
                <div className={`${chartConfig.fontSize} font-bold text-indigo-600 dark:text-indigo-400`}>
                  {data.length}
                </div>
                <div className="text-xs text-muted-foreground">Months of Data</div>
              </div>
            </div>

            {/* Date Range */}
            <div className="text-center text-xs text-muted-foreground mb-2">
              {dateRange}
            </div>

            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={chartConfig.height}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_approvals"
                  name="Total Approvals"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }}
                  activeDot={{ r: 6, stroke: '#4ade80', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
