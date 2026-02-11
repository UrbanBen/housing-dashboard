"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface BAYoYCardProps {
  selectedLGA: LGA | null;
}

interface YoYData {
  month_name: string;
  current_year: number;
  previous_year: number;
  percent_change: number;
}

export function BAYoYCard({ selectedLGA }: BAYoYCardProps) {
  const [data, setData] = useState<YoYData[]>([]);
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
            type: 'yoy-comparison',
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
        console.error('[BAYoYCard] Error:', err);
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
        <div className="bg-card border-2 border-cyan-500 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold mb-2 text-cyan-500">{label}</p>
          <p className="text-xs text-cyan-400">
            Current: {payload[0]?.value?.toLocaleString()}
          </p>
          <p className="text-xs text-blue-400">
            Previous: {payload[1]?.value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const yoyChange = summary?.yoy_change ? parseFloat(summary.yoy_change) : 0;

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#6366f1]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitCompare className="h-6 w-6 text-[#6366f1]" />
            <div>
              <CardTitle className="text-xl text-[#6366f1]">Year-over-Year BA Comparison</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedLGA ? `12 months vs previous 12 - ${selectedLGA.name}` : 'Select an LGA'}
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
            {selectedLGA ? 'No data available for this LGA' : 'Select an LGA to view year-over-year comparison'}
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-center hover:bg-blue-500/10 transition-all">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {summary?.current_year_total?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Current Year</div>
              </div>

              <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-3 text-center hover:bg-cyan-500/10 transition-all">
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {summary?.previous_year_total?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Previous Year</div>
              </div>

              <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-3 text-center hover:bg-purple-500/10 transition-all">
                <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                  yoyChange > 0 ? 'text-green-500' : yoyChange < 0 ? 'text-red-500' : 'text-purple-600 dark:text-purple-400'
                }`}>
                  {yoyChange > 0 && <TrendingUp className="h-5 w-5" />}
                  {yoyChange < 0 && <TrendingDown className="h-5 w-5" />}
                  {Math.abs(yoyChange).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">YoY Change</div>
              </div>
            </div>

            {/* Line Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    dataKey="month_name"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="current_year"
                    name="Current Year"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 4 }}
                    activeDot={{ r: 6, stroke: '#4ade80', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="previous_year"
                    name="Previous Year"
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
