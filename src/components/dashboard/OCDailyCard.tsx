"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface OCDailyCardProps {
  selectedLGA: LGA | null;
}

interface DailyData {
  date: string;
  total_determined: number;
  determined_approved: number;
  determined_withdrawn: number;
}

export function OCDailyCard({ selectedLGA }: OCDailyCardProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    console.log('[OCDailyCard] useEffect triggered, selectedLGA:', selectedLGA);
    if (!selectedLGA) {
      setData([]);
      setSummary(null);
      console.log('[OCDailyCard] No LGA selected, returning early');
      return;
    }

    const fetchData = async () => {
      console.log('[OCDailyCard] Fetching data for LGA:', selectedLGA.name);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/oc-comprehensive', {
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
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#ef4444]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-[#ef4444]" />
            <div>
              <CardTitle className="text-xl text-[#ef4444]">Daily OC Activity</CardTitle>
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
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-red-500">Error: {error}</div>
          </div>
        )}

        {!loading && !error && data.length === 0 && selectedLGA && (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-muted-foreground">No OC data available for this LGA</div>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-lime-500/5 border border-lime-500/10 rounded-lg p-3 text-center hover:bg-lime-500/10 transition-all">
                <div className="text-2xl font-bold text-lime-600 dark:text-lime-400">
                  {summary?.total_last_30_days?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">30-Day Total</div>
              </div>

              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 text-center hover:bg-green-500/10 transition-all">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {summary?.avg_per_day ? Number(summary.avg_per_day).toFixed(1) : '0'}
                </div>
                <div className="text-xs text-muted-foreground">Avg per Day</div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center hover:bg-emerald-500/10 transition-all">
                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                  {trend && (
                    <>
                      {parseFloat(trend) > 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                      <span className={parseFloat(trend) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {Math.abs(parseFloat(trend))}%
                      </span>
                    </>
                  )}
                  {!trend && <span className="text-muted-foreground">N/A</span>}
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
                  fontSize={11}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = {
                      total_determined: 'Total',
                      determined_approved: 'Approved',
                      determined_withdrawn: 'Withdrawn',
                    };
                    return [value, labels[name] || name];
                  }}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_determined"
                  stroke="#84cc16"
                  strokeWidth={2}
                  dot={false}
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="determined_approved"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                  name="Approved"
                />
                <Line
                  type="monotone"
                  dataKey="determined_withdrawn"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 5"
                  name="Withdrawn"
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
