"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface DAWeeklyCardProps {
  selectedLGA: LGA | null;
}

interface WeeklyData {
  period_start: string;
  period_end: string;
  calendar_week: number;
  calendar_year: number;
  total_determined: number;
  determined_approved: number;
  determined_refused: number;
  determined_withdrawn: number;
}

export function DAWeeklyCard({ selectedLGA }: DAWeeklyCardProps) {
  const [data, setData] = useState<WeeklyData[]>([]);
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
        const response = await fetch('/api/da-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'weekly',
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

  // Calculate week-over-week trend
  const calculateWeekTrend = () => {
    if (data.length < 2) return null;
    const currentWeek = data[0].total_determined;
    const previousWeek = data[1].total_determined;
    if (previousWeek === 0) return null;
    return ((currentWeek - previousWeek) / previousWeek * 100).toFixed(1);
  };

  const trend = calculateWeekTrend();

  // Format data for chart (reverse for chronological order)
  const chartData = [...data].reverse().map(item => ({
    week: `W${item.calendar_week}`,
    Approved: item.determined_approved,
    Refused: item.determined_refused,
    Withdrawn: item.determined_withdrawn,
  }));

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-green-500" />
            <div>
              <CardTitle className="text-xl">Weekly DA Trends</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last 12 weeks • {selectedLGA?.name || 'Select LGA'}
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
            <p>Select an LGA to view weekly DA trends</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 text-center hover:bg-green-500/10 transition-all">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {data[0]?.total_determined || 0}
                </div>
                <div className="text-xs text-muted-foreground">Current Week</div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/10 transition-all">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary?.total_determined ? Math.round(summary.total_determined / data.length) : 0}
                </div>
                <div className="text-xs text-muted-foreground">Avg per Week</div>
              </div>

              <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3 text-center hover:bg-purple-500/10 transition-all">
                <div className="flex items-center justify-center gap-1">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {trend ? `${trend}%` : 'N/A'}
                  </div>
                  {trend && parseFloat(trend) > 0 && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {trend && parseFloat(trend) < 0 && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">vs Last Week</div>
              </div>
            </div>

            {/* Stacked Bar Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="week"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
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
                <Bar dataKey="Approved" stackId="a" fill="#10b981" />
                <Bar dataKey="Refused" stackId="a" fill="#ef4444" />
                <Bar dataKey="Withdrawn" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
