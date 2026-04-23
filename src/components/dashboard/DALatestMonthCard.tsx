'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, CheckCircle, XCircle, Home } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';

interface LatestMonthData {
  lga_code: string;
  lga_name: string;
  period_start: string;
  period_end: string;
  calendar_month: number;
  calendar_year: number;
  total_determined: number;
  determined_approved: number;
  determined_refused: number;
  determined_withdrawn: number;
  total_new_dwellings: number;
  avg_estimated_cost: number;
  avg_days_to_determination: number;
  prev_month_determined: number | null;
  prev_month_approved: number | null;
  prev_year_determined: number | null;
  prev_year_approved: number | null;
  mom_change_pct: number | null;
  yoy_change_pct: number | null;
}

interface DALatestMonthCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

export default function DALatestMonthCard({ selectedLGA, cardWidth = 600 }: DALatestMonthCardProps) {
  const [data, setData] = useState<LatestMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            type: 'latest-month',
            lgaName: selectedLGA.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          setData(result.data[0]);
        } else {
          throw new Error(result.error || 'No data available');
        }
      } catch (err: any) {
        logger.error('[DA Latest Month Card] Error', { error: err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedLGA]);

  const renderChangeIndicator = (changePct: number | null, label: string) => {
    if (changePct === null || changePct === undefined) {
      return (
        <div className="text-xs text-gray-400">
          {label}: N/A
        </div>
      );
    }

    const isPositive = changePct >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    const bgClass = isPositive ? 'bg-green-50' : 'bg-red-50';

    return (
      <div className={`flex items-center gap-1 ${bgClass} px-2 py-1 rounded text-xs ${colorClass} font-medium`}>
        <Icon className="h-3 w-3" />
        {Math.abs(changePct).toFixed(1)}% {label}
      </div>
    );
  };

  if (!selectedLGA) {
    return (
      <Card className="w-full h-full border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Calendar className="h-5 w-5" />
            DA Latest Month
          </CardTitle>
          <CardDescription>Current month snapshot with trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            Select an LGA to view latest month data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full h-full border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Calendar className="h-5 w-5" />
            DA Latest Month
          </CardTitle>
          <CardDescription>Current month snapshot with trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full h-full border-red-200 bg-gradient-to-br from-red-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Calendar className="h-5 w-5" />
            DA Latest Month
          </CardTitle>
          <CardDescription>Current month snapshot with trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-red-600">
            Error: {error || 'No data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const monthName = new Date(data.period_start).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric'
  });

  const approvalRate = data.total_determined > 0
    ? ((data.determined_approved / data.total_determined) * 100).toFixed(1)
    : '0';

  return (
    <Card className="w-full h-full border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Calendar className="h-5 w-5" />
          DA Latest Month
        </CardTitle>
        <CardDescription>
          {monthName} - {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">Total Determined</div>
            <div className="text-2xl font-bold text-blue-700">
              {data.total_determined.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1">
              {renderChangeIndicator(data.mom_change_pct, 'MoM')}
              {renderChangeIndicator(data.yoy_change_pct, 'YoY')}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="text-xs text-gray-600 mb-1">Approval Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {approvalRate}%
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {data.determined_approved.toLocaleString()} approved
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-lg p-4 border border-blue-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Breakdown</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">Approved</div>
                <div className="text-lg font-semibold text-green-700">
                  {data.determined_approved.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">Refused</div>
                <div className="text-lg font-semibold text-red-700">
                  {data.determined_refused.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Home className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">New Dwellings</div>
                <div className="text-lg font-semibold text-blue-700">
                  {data.total_new_dwellings.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">Avg Days</div>
                <div className="text-lg font-semibold text-purple-700">
                  {data.avg_days_to_determination ? Math.round(data.avg_days_to_determination) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparisons */}
        {(data.prev_month_determined || data.prev_year_determined) && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Comparisons</h4>
            <div className="space-y-2">
              {data.prev_month_determined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Previous Month:</span>
                  <span className="font-semibold text-gray-900">
                    {data.prev_month_determined.toLocaleString()} DAs
                  </span>
                </div>
              )}
              {data.prev_year_determined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Same Month Last Year:</span>
                  <span className="font-semibold text-gray-900">
                    {data.prev_year_determined.toLocaleString()} DAs
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
