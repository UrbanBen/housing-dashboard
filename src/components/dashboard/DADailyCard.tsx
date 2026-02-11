"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface DADailyCardProps {
  selectedLGA: LGA | null;
}

interface DailyData {
  date: string;
  total_determined: number;
  determined_approved: number;
  determined_refused: number;
  determined_withdrawn: number;
}

export function DADailyCard({ selectedLGA }: DADailyCardProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    console.log('[DADailyCard] useEffect triggered, selectedLGA:', selectedLGA);
    if (!selectedLGA) {
      setData([]);
      setSummary(null);
      console.log('[DADailyCard] No LGA selected, returning early');
      return;
    }

    const fetchData = async () => {
      console.log('[DADailyCard] Fetching data for LGA:', selectedLGA.name);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/da-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'daily',
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

  // Calculate 7-day trend
  const calculate7DayTrend = () => {
    if (data.length < 14) return null;
    const last7 = data.slice(0, 7).reduce((sum, d) => sum + d.total_determined, 0);
    const previous7 = data.slice(7, 14).reduce((sum, d) => sum + d.total_determined, 0);
    if (previous7 === 0) return null;
    return ((last7 - previous7) / previous7 * 100).toFixed(1);
  };

  const trend = calculate7DayTrend();

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-blue-500" />
            <div>
              <CardTitle className="text-xl">Daily DA Activity</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last 30 days • {selectedLGA?.name || 'Select LGA'}
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
            <p>Select an LGA to view daily DA activity</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/10 transition-all">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary?.total_determined || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Determined</div>
              </div>

              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 text-center hover:bg-green-500/10 transition-all">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {summary?.approval_rate || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Approval Rate</div>
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
                <div className="text-xs text-muted-foreground">7-Day Trend</div>
              </div>
            </div>

            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[...data].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-AU')}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_determined"
                  name="Total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="determined_approved"
                  name="Approved"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="determined_refused"
                  name="Refused"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
