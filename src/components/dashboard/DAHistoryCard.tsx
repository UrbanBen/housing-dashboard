'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, Activity } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('DAHistoryCard');

interface DAHistoryData {
  period_start: string;
  total_determined: number;
  determined_approved: number;
  determined_refused: number;
  total_new_dwellings: number;
}

interface DAHistoryCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

export default function DAHistoryCard({ selectedLGA, cardWidth = 600 }: DAHistoryCardProps) {
  const [data, setData] = useState<DAHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total_determined: 0,
    monthly_average: 0,
    annual_average: 0,
    date_range: '',
  });

  useEffect(() => {
    async function fetchData() {
      if (!selectedLGA) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/da-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'history',
            lgaName: selectedLGA.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);

          // Calculate summary statistics
          const totalDetermined = result.data.reduce((sum: number, item: DAHistoryData) =>
            sum + (item.total_determined || 0), 0
          );

          const monthCount = result.data.length;
          const yearCount = monthCount / 12;

          const monthlyAvg = monthCount > 0 ? Math.round(totalDetermined / monthCount) : 0;
          const annualAvg = yearCount > 0 ? Math.round(totalDetermined / yearCount) : 0;

          // Get date range
          const dates = result.data.map((d: DAHistoryData) => new Date(d.period_start));
          const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

          const dateRange = `${minDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} - ${maxDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`;

          setSummary({
            total_determined: totalDetermined,
            monthly_average: monthlyAvg,
            annual_average: annualAvg,
            date_range: dateRange,
          });
        } else {
          throw new Error(result.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        logger.error('[DA History Card] Error', { error: err });
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedLGA]);

  // Responsive chart configuration based on card width
  const chartHeight = cardWidth < 400 ? 200 : cardWidth < 600 ? 250 : 300;
  const fontSize = cardWidth < 400 ? 10 : 12;

  if (!selectedLGA) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#3b82f6]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#3b82f6]">
            <Activity className="h-5 w-5" />
            DA Complete History
          </CardTitle>
          <CardDescription>Development Application trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Select an LGA to view DA history
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#3b82f6]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#3b82f6]">
            <Activity className="h-5 w-5" />
            DA Complete History
          </CardTitle>
          <CardDescription>Development Application trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border-2 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Activity className="h-5 w-5" />
            DA Complete History
          </CardTitle>
          <CardDescription>Development Application trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-destructive">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#3b82f6]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#3b82f6]">
            <Activity className="h-5 w-5" />
            DA Complete History
          </CardTitle>
          <CardDescription>Development Application trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No data available for {selectedLGA.name}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = data.map(item => ({
    date: new Date(item.period_start).toLocaleDateString('en-AU', {
      month: 'short',
      year: cardWidth < 500 ? '2-digit' : 'numeric'
    }),
    total: item.total_determined || 0,
    approved: item.determined_approved || 0,
    refused: item.determined_refused || 0,
  }));

  return (
    <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#3b82f6]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#3b82f6]">
          <Activity className="h-5 w-5" />
          DA Complete History
        </CardTitle>
        <CardDescription>
          Development Applications for {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              Date Range
            </div>
            <div className="text-sm font-semibold text-foreground">{summary.date_range}</div>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total DAs</div>
            <div className="text-lg font-bold text-[#3b82f6]">
              {summary.total_determined.toLocaleString()}
            </div>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Monthly Avg</div>
            <div className="text-lg font-bold text-[#3b82f6]">
              {summary.monthly_average.toLocaleString()}
            </div>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Annual Avg</div>
            <div className="text-lg font-bold text-[#3b82f6]">
              {summary.annual_average.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Area Chart */}
        <div className="bg-card rounded-lg p-4 border border-border">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorRefused" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize, fill: 'hsl(var(--muted-foreground))' }}
                angle={cardWidth < 500 ? -45 : 0}
                textAnchor={cardWidth < 500 ? 'end' : 'middle'}
                height={cardWidth < 500 ? 60 : 30}
              />
              <YAxis tick={{ fontSize, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Determined"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
              <Area
                type="monotone"
                dataKey="approved"
                name="Approved"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorApproved)"
              />
              <Area
                type="monotone"
                dataKey="refused"
                name="Refused"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorRefused)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <span>Showing {data.length} months of data</span>
        </div>
      </CardContent>
    </Card>
  );
}
