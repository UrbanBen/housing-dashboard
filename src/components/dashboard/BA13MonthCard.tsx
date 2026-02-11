"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface BA13MonthCardProps {
  selectedLGA: LGA | null;
}

interface MonthData {
  month: string;
  total_approvals: number;
}

export function BA13MonthCard({ selectedLGA }: BA13MonthCardProps) {
  const [data, setData] = useState<MonthData[]>([]);
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
            type: '13-month',
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
        console.error('[BA13MonthCard] Error:', err);
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
        <div className="bg-card border-2 border-orange-500 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold mb-2 text-orange-500">
            {new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-orange-400">
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
            <BarChart3 className="h-6 w-6 text-[#6366f1]" />
            <div>
              <CardTitle className="text-xl text-[#6366f1]">13-Month BA Overview</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLGA ? `13-month trend - ${selectedLGA.name}` : 'Select an LGA'}
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
            {selectedLGA ? 'No data available for this LGA' : 'Select an LGA to view 13-month overview'}
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/10 transition-all">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary?.total_approvals?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Approvals</div>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-3 text-center hover:bg-orange-500/10 transition-all">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {summary?.avg_per_period ? Number(summary.avg_per_period).toFixed(1) : '0'}
                </div>
                <div className="text-xs text-muted-foreground">Avg per Month</div>
              </div>

              <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3 text-center hover:bg-purple-500/10 transition-all">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {data.length}
                </div>
                <div className="text-xs text-muted-foreground">Months</div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short' });
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total_approvals"
                    name="Total Approvals"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 4 }}
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
