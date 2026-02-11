"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface OC13MonthCardProps {
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

export function OC13MonthCard({ selectedLGA }: OC13MonthCardProps) {
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
            type: '13-month',
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

  // Calculate rolling 12-month average
  const calculateRolling12MonthAvg = () => {
    if (data.length < 12) return null;
    const last12 = data.slice(0, 12);
    const total = last12.reduce((sum, item) => sum + item.total_determined, 0);
    return Math.round(total / 12);
  };

  // Find peak month
  const findPeakMonth = () => {
    if (data.length === 0) return null;
    const peak = [...data].sort((a, b) => b.total_determined - a.total_determined)[0];
    return {
      month: new Date(peak.period_start).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
      value: peak.total_determined
    };
  };

  const rolling12Avg = calculateRolling12MonthAvg();
  const peakMonth = findPeakMonth();

  // Format data for chart (reverse for chronological order)
  const chartData = [...data].reverse().map(item => ({
    month: new Date(item.period_start).toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }),
    Total: item.total_determined,
    Approved: item.determined_approved,
    Avg: rolling12Avg, // Constant line
  }));

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#ef4444]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-[#ef4444]" />
            <div>
              <CardTitle className="text-xl text-[#ef4444]">13-Month OC Overview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Trend analysis • {selectedLGA?.name || 'Select LGA'}
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
            <p>Select an LGA to view 13-month OC overview</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 text-center hover:bg-yellow-500/10 transition-all">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {rolling12Avg || 'N/A'}
                </div>
                <div className="text-xs text-muted-foreground">12-Month Avg</div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-center hover:bg-amber-500/10 transition-all">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {peakMonth?.value || 0}
                </div>
                <div className="text-xs text-muted-foreground">Peak Month</div>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3 text-center hover:bg-orange-500/10 transition-all">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {summary?.total_determined?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total (13M)</div>
              </div>
            </div>

            {/* Line Chart with Trend */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
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
                <Line
                  type="monotone"
                  dataKey="Total"
                  stroke="#eab308"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Approved"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Avg"
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="12-Month Avg"
                />
              </LineChart>
            </ResponsiveContainer>

            {peakMonth && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Peak: {peakMonth.month} ({peakMonth.value} determinations)
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
