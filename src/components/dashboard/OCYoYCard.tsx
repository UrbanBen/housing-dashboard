"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCompare, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface OCYoYCardProps {
  selectedLGA: LGA | null;
}

interface YoYData {
  month: number;
  current_period_start: string;
  current_total_determined: number;
  current_determined_approved: number;
  previous_total_determined: number;
  previous_determined_approved: number;
  pct_change_determined: number;
  pct_change_approved: number;
}

export function OCYoYCard({ selectedLGA }: OCYoYCardProps) {
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
        const response = await fetch('/api/oc-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'yoy-comparison',
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

  // Calculate overall YoY change
  const calculateOverallChange = () => {
    const currentTotal = data.reduce((sum, item) => sum + (item.current_total_determined || 0), 0);
    const previousTotal = data.reduce((sum, item) => sum + (item.previous_total_determined || 0), 0);
    if (previousTotal === 0) return null;
    return ((currentTotal - previousTotal) / previousTotal * 100).toFixed(1);
  };

  // Calculate approval rate change
  const calculateApprovalRateChange = () => {
    const currentApproved = data.reduce((sum, item) => sum + (item.current_determined_approved || 0), 0);
    const currentTotal = data.reduce((sum, item) => sum + (item.current_total_determined || 0), 0);
    const previousApproved = data.reduce((sum, item) => sum + (item.previous_determined_approved || 0), 0);
    const previousTotal = data.reduce((sum, item) => sum + (item.previous_total_determined || 0), 0);

    if (currentTotal === 0 || previousTotal === 0) return null;

    const currentRate = (currentApproved / currentTotal) * 100;
    const previousRate = (previousApproved / previousTotal) * 100;
    return (currentRate - previousRate).toFixed(1);
  };

  const overallChange = calculateOverallChange();
  const approvalRateChange = calculateApprovalRateChange();

  // Format data for chart (reverse for chronological order)
  const chartData = [...data].reverse().map(item => ({
    month: item.current_period_start
      ? new Date(item.current_period_start).toLocaleDateString('en-AU', { month: 'short' })
      : `M${item.month}`,
    'Current Year': item.current_total_determined || 0,
    'Previous Year': item.previous_total_determined || 0,
  }));

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#ef4444]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitCompare className="h-6 w-6 text-[#ef4444]" />
            <div>
              <CardTitle className="text-xl text-[#ef4444]">OC Year-over-Year Comparison</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Last 12 vs Previous 12 • {selectedLGA?.name || 'Select LGA'}
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
            <p>Select an LGA to view OC year-over-year comparison</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-500/5 border border-slate-500/10 rounded-lg p-3 text-center hover:bg-slate-500/10 transition-all">
                <div className="flex items-center justify-center gap-1">
                  <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                    {overallChange ? `${overallChange}%` : 'N/A'}
                  </div>
                  {overallChange && parseFloat(overallChange) > 0 && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {overallChange && parseFloat(overallChange) < 0 && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Total Change</div>
              </div>

              <div className="bg-gray-500/5 border border-gray-500/10 rounded-lg p-3 text-center hover:bg-gray-500/10 transition-all">
                <div className="flex items-center justify-center gap-1">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {approvalRateChange ? `${approvalRateChange}%` : 'N/A'}
                  </div>
                  {approvalRateChange && parseFloat(approvalRateChange) > 0 && (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                  {approvalRateChange && parseFloat(approvalRateChange) < 0 && (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Approval Rate Δ</div>
              </div>

              <div className="bg-zinc-500/5 border border-zinc-500/10 rounded-lg p-3 text-center hover:bg-zinc-500/10 transition-all">
                <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
                  {summary?.total_determined?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-muted-foreground">Current Year</div>
              </div>
            </div>

            {/* Dual-Line Chart */}
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
                  dataKey="Current Year"
                  stroke="#64748b"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Previous Year"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
