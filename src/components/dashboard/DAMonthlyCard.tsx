"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface DAMonthlyCardProps {
  selectedLGA: LGA | null;
}

interface MonthlyData {
  period_start: string;
  calendar_month: number;
  calendar_year: number;
  total_determined: number;
  determined_approved: number;
  determined_refused: number;
  determined_withdrawn: number;
  determined_deferred: number;
}

export function DAMonthlyCard({ selectedLGA }: DAMonthlyCardProps) {
  const [data, setData] = useState<MonthlyData[]>([]);
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
            type: 'monthly',
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

  // Calculate YTD total
  const calculateYTD = () => {
    const currentYear = new Date().getFullYear();
    return data
      .filter(item => item.calendar_year === currentYear)
      .reduce((sum, item) => sum + item.total_determined, 0);
  };

  const ytdTotal = calculateYTD();

  // Format data for chart (reverse for chronological order)
  const chartData = [...data].reverse().map(item => ({
    month: new Date(item.period_start).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
    Approved: item.determined_approved,
    Refused: item.determined_refused,
    Withdrawn: item.determined_withdrawn,
    Other: (item.determined_deferred || 0),
  }));

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-purple-500" />
            <div>
              <CardTitle className="text-xl">Monthly DA Summary</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last 12 months • {selectedLGA?.name || 'Select LGA'}
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
            <p>Select an LGA to view monthly DA summary</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3 text-center hover:bg-purple-500/10 transition-all">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {data[0]?.total_determined || 0}
                </div>
                <div className="text-xs text-muted-foreground">Current Month</div>
              </div>

              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/10 transition-all">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {ytdTotal.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">YTD Total</div>
              </div>

              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 text-center hover:bg-green-500/10 transition-all">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {summary?.total_determined ? Math.round(summary.total_determined / data.length) : 0}
                </div>
                <div className="text-xs text-muted-foreground">Avg per Month</div>
              </div>
            </div>

            {/* Stacked Area Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorRefused" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorWithdrawn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
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
                <Area
                  type="monotone"
                  dataKey="Approved"
                  stackId="1"
                  stroke="#10b981"
                  fill="url(#colorApproved)"
                />
                <Area
                  type="monotone"
                  dataKey="Refused"
                  stackId="1"
                  stroke="#ef4444"
                  fill="url(#colorRefused)"
                />
                <Area
                  type="monotone"
                  dataKey="Withdrawn"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="url(#colorWithdrawn)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
