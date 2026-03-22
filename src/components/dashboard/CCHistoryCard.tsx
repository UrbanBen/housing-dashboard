'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar, FileCheck } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';

interface CCHistoryData {
  period_start: string;
  total_applications: number;
  total_approved: number;
  total_withdrawn: number;
}

interface CCHistoryCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

export default function CCHistoryCard({ selectedLGA, cardWidth = 600 }: CCHistoryCardProps) {
  const [data, setData] = useState<CCHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({
    total_applications: 0,
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
        const response = await fetch('/api/cc-comprehensive', {
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
          const totalApplications = result.data.reduce((sum: number, item: CCHistoryData) =>
            sum + (item.total_applications || 0), 0
          );

          const monthCount = result.data.length;
          const yearCount = monthCount / 12;

          const monthlyAvg = monthCount > 0 ? Math.round(totalApplications / monthCount) : 0;
          const annualAvg = yearCount > 0 ? Math.round(totalApplications / yearCount) : 0;

          // Get date range
          const dates = result.data.map((d: CCHistoryData) => new Date(d.period_start));
          const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
          const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));

          const dateRange = `${minDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} - ${maxDate.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`;

          setSummary({
            total_applications: totalApplications,
            monthly_average: monthlyAvg,
            annual_average: annualAvg,
            date_range: dateRange,
          });
        } else {
          throw new Error(result.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        console.error('[CC History Card] Error:', err);
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
      <Card className="w-full h-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <FileCheck className="h-5 w-5" />
            CC Complete History
          </CardTitle>
          <CardDescription>Construction Certificate trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            Select an LGA to view CC history
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full h-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <FileCheck className="h-5 w-5" />
            CC Complete History
          </CardTitle>
          <CardDescription>Construction Certificate trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full h-full border-red-200 bg-gradient-to-br from-red-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <FileCheck className="h-5 w-5" />
            CC Complete History
          </CardTitle>
          <CardDescription>Construction Certificate trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-red-600">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="w-full h-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <FileCheck className="h-5 w-5" />
            CC Complete History
          </CardTitle>
          <CardDescription>Construction Certificate trends over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-gray-500">
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
    total: item.total_applications || 0,
    approved: item.total_approved || 0,
    withdrawn: item.total_withdrawn || 0,
  }));

  return (
    <Card className="w-full h-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <FileCheck className="h-5 w-5" />
          CC Complete History
        </CardTitle>
        <CardDescription>
          Construction Certificates for {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
              <Calendar className="h-3 w-3" />
              Date Range
            </div>
            <div className="text-sm font-semibold text-gray-900">{summary.date_range}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="text-xs text-gray-600 mb-1">Total CCs</div>
            <div className="text-lg font-bold text-purple-700">
              {summary.total_applications.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="text-xs text-gray-600 mb-1">Monthly Avg</div>
            <div className="text-lg font-bold text-purple-600">
              {summary.monthly_average.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-purple-100">
            <div className="text-xs text-gray-600 mb-1">Annual Avg</div>
            <div className="text-lg font-bold text-purple-500">
              {summary.annual_average.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Area Chart */}
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCCTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorCCApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorCCWithdrawn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize }}
                angle={cardWidth < 500 ? -45 : 0}
                textAnchor={cardWidth < 500 ? 'end' : 'middle'}
                height={cardWidth < 500 ? 60 : 30}
              />
              <YAxis tick={{ fontSize }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              />
              <Legend
                wrapperStyle={{ fontSize }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Applications"
                stroke="#a855f7"
                fillOpacity={1}
                fill="url(#colorCCTotal)"
              />
              <Area
                type="monotone"
                dataKey="approved"
                name="Approved"
                stroke="#22c55e"
                fillOpacity={1}
                fill="url(#colorCCApproved)"
              />
              <Area
                type="monotone"
                dataKey="withdrawn"
                name="Withdrawn"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorCCWithdrawn)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
          <TrendingUp className="h-4 w-4 text-purple-600" />
          <span>Showing {data.length} months of data</span>
        </div>
      </CardContent>
    </Card>
  );
}
