"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface BADailyCardProps {
  selectedLGA: LGA | null;
}

interface DailyData {
  date: string;
  total_approvals: number;
}

export function BADailyCard({ selectedLGA }: BADailyCardProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    console.log('[BADailyCard] useEffect triggered, selectedLGA:', selectedLGA);
    if (!selectedLGA) {
      setData([]);
      setSummary(null);
      console.log('[BADailyCard] No LGA selected, returning early');
      return;
    }

    const fetchData = async () => {
      console.log('[BADailyCard] Fetching data for LGA:', selectedLGA.name);
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/building-approvals-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'daily',
            lgaName: selectedLGA.name,
          }),
        });

        const result = await response.json();
        console.log('[BADailyCard] API Response:', result);

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        setData(result.data || []);
        setSummary(result.summary || null);
      } catch (err) {
        console.error('[BADailyCard] Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border-2 border-blue-500 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold mb-2 text-blue-500">{label}</p>
          <p className="text-xs text-blue-400">
            Total: {payload[0].value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#6366f1]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-[#6366f1]" />
            <div>
              <CardTitle className="text-xl text-[#6366f1]">Daily BA Activity</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLGA ? `Last 30 days - ${selectedLGA.name}` : 'Select an LGA'}
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
            {selectedLGA ? 'No data available for this LGA' : 'Select an LGA to view daily activity'}
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/10 transition-all">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
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

              <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3 text-center hover:bg-purple-500/10 transition-all">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {data.length}
                </div>
                <div className="text-xs text-muted-foreground">Days Recorded</div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_approvals"
                    name="Total Approvals"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6, stroke: '#4ade80', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
