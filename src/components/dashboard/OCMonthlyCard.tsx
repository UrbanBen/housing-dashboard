"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface OCMonthlyCardProps {
  selectedLGA: LGA | null;
}

interface MonthlyData {
  period_start: string;
  calendar_month: number;
  calendar_year: number;
  total_determined: number;
  determined_approved: number;
  determined_withdrawn: number;
}

export function OCMonthlyCard({ selectedLGA }: OCMonthlyCardProps) {
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
        const response = await fetch('/api/oc-comprehensive', {
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
    Withdrawn: item.determined_withdrawn,
  }));

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#ef4444]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-[#ef4444]" />
            <div>
              <CardTitle className="text-xl text-[#ef4444]">Monthly OC Summary</CardTitle>
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
            <p>Select an LGA to view monthly OC summary</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-pink-500/5 border border-pink-500/10 rounded-lg p-3 text-center hover:bg-pink-500/10 transition-all">
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {data[0]?.total_determined || 0}
                </div>
                <div className="text-xs text-muted-foreground">Current Month</div>
              </div>

              <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3 text-center hover:bg-rose-500/10 transition-all">
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {ytdTotal.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">YTD Total</div>
              </div>

              <div className="bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-lg p-3 text-center hover:bg-fuchsia-500/10 transition-all">
                <div className="text-2xl font-bold text-fuchsia-600 dark:text-fuchsia-400">
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
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorWithdrawn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
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
                  stroke="#ec4899"
                  fill="url(#colorApproved)"
                  name="Approved"
                />
                <Area
                  type="monotone"
                  dataKey="Withdrawn"
                  stackId="1"
                  stroke="#ef4444"
                  fill="url(#colorWithdrawn)"
                  name="Withdrawn"
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
