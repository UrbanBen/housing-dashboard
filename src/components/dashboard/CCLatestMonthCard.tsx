'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, CheckCircle, XCircle, Building } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('CCLatestMonthCard');

interface CCLatestMonthData {
  lga_code: string;
  lga_name: string;
  period_start: string;
  period_end: string;
  calendar_month: number;
  calendar_year: number;
  total_applications: number;
  total_approved: number;
  total_withdrawn: number;
  total_cancelled: number;
  total_estimated_cost: number;
  avg_estimated_cost: number;
  total_proposed_floor_area: number;
  total_units_proposed: number;
  prev_month_applications: number | null;
  prev_month_approved: number | null;
  prev_year_applications: number | null;
  prev_year_approved: number | null;
  mom_change_pct: number | null;
  yoy_change_pct: number | null;
}

interface CCLatestMonthCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

export default function CCLatestMonthCard({ selectedLGA, cardWidth = 600 }: CCLatestMonthCardProps) {
  const [data, setData] = useState<CCLatestMonthData | null>(null);
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
        const response = await fetch('/api/cc-comprehensive', {
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
        logger.error('[CC Latest Month Card] Error', err );
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
      <Card className="w-full h-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Calendar className="h-5 w-5" />
            CC Latest Month
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
      <Card className="w-full h-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Calendar className="h-5 w-5" />
            CC Latest Month
          </CardTitle>
          <CardDescription>Current month snapshot with trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
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
            CC Latest Month
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

  const approvalRate = data.total_applications > 0
    ? ((data.total_approved / data.total_applications) * 100).toFixed(1)
    : '0';

  return (
    <Card className="w-full h-full border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-700">
          <Calendar className="h-5 w-5" />
          CC Latest Month
        </CardTitle>
        <CardDescription>
          {monthName} - {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="text-xs text-gray-600 mb-1">Total Applications</div>
            <div className="text-2xl font-bold text-purple-700">
              {data.total_applications.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1">
              {renderChangeIndicator(data.mom_change_pct, 'MoM')}
              {renderChangeIndicator(data.yoy_change_pct, 'YoY')}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <div className="text-xs text-gray-600 mb-1">Approval Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {approvalRate}%
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {data.total_approved.toLocaleString()} approved
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Breakdown</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">Approved</div>
                <div className="text-lg font-semibold text-green-700">
                  {data.total_approved.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">Withdrawn</div>
                <div className="text-lg font-semibold text-amber-700">
                  {data.total_withdrawn.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">Units Proposed</div>
                <div className="text-lg font-semibold text-blue-700">
                  {data.total_units_proposed?.toLocaleString() || 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs text-gray-600">Avg Cost</div>
                <div className="text-lg font-semibold text-indigo-700">
                  {data.avg_estimated_cost ? `$${(data.avg_estimated_cost / 1000).toFixed(0)}k` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparisons */}
        {(data.prev_month_applications || data.prev_year_applications) && (
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-lg p-4 border border-purple-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Comparisons</h4>
            <div className="space-y-2">
              {data.prev_month_applications && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Previous Month:</span>
                  <span className="font-semibold text-gray-900">
                    {data.prev_month_applications.toLocaleString()} CCs
                  </span>
                </div>
              )}
              {data.prev_year_applications && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Same Month Last Year:</span>
                  <span className="font-semibold text-gray-900">
                    {data.prev_year_applications.toLocaleString()} CCs
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
