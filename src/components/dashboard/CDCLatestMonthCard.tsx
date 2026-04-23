'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar, CheckCircle, Building, DollarSign } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';

interface CDCLatestMonthData {
  lga_code: string;
  lga_name: string;
  period_start: string;
  total_dwellings: number;
  total_cdcs: number;
  total_private_certifier: number;
  total_council_certifier: number;
  total_cost: number;
  avg_cost: number;
  prev_month_dwellings: number | null;
  prev_month_cdcs: number | null;
  prev_year_dwellings: number | null;
  prev_year_cdcs: number | null;
  mom_change_pct: number | null;
  yoy_change_pct: number | null;
}

interface CDCLatestMonthCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

export default function CDCLatestMonthCard({ selectedLGA, cardWidth = 600 }: CDCLatestMonthCardProps) {
  const [data, setData] = useState<CDCLatestMonthData | null>(null);
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
        const response = await fetch('/api/cdc-comprehensive', {
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
        logger.error('[CDC Latest Month Card] Error', { error: err);
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
        <div className="text-xs text-muted-foreground">
          {label}: N/A
        </div>
      );
    }

    const isPositive = changePct >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const bgClass = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

    return (
      <div className={`flex items-center gap-1 ${bgClass} px-2 py-1 rounded text-xs ${colorClass} font-medium`}>
        <Icon className="h-3 w-3" />
        {Math.abs(changePct).toFixed(1)}% {label}
      </div>
    );
  };

  if (!selectedLGA) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Calendar className="h-5 w-5" />
            CDC Latest Month
          </CardTitle>
          <CardDescription>Current month snapshot with trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Select an LGA to view latest month data
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Calendar className="h-5 w-5" />
            CDC Latest Month
          </CardTitle>
          <CardDescription>Current month snapshot with trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Calendar className="h-5 w-5" />
            CDC Latest Month
          </CardTitle>
          <CardDescription>Current month snapshot with trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-destructive">
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

  const privateCertifierPct = data.total_cdcs > 0
    ? ((data.total_private_certifier / data.total_cdcs) * 100).toFixed(1)
    : '0';

  return (
    <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Calendar className="h-5 w-5" />
          CDC Latest Month
        </CardTitle>
        <CardDescription>
          {monthName} - {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/10">
            <div className="text-xs text-muted-foreground mb-1">New Dwellings</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.total_dwellings.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1">
              {renderChangeIndicator(data.mom_change_pct, 'MoM')}
              {renderChangeIndicator(data.yoy_change_pct, 'YoY')}
            </div>
          </div>

          <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/10">
            <div className="text-xs text-muted-foreground mb-1">Total CDCs</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.total_cdcs.toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {privateCertifierPct}% private
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/10">
          <h4 className="text-sm font-semibold text-foreground mb-3">Breakdown</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Private Certifier</div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {data.total_private_certifier.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Council Certifier</div>
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {data.total_council_certifier.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                  ${(data.total_cost / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Avg Cost</div>
                <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  ${(data.avg_cost / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparisons */}
        {(data.prev_month_dwellings || data.prev_year_dwellings) && (
          <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/10">
            <h4 className="text-sm font-semibold text-foreground mb-3">Comparisons</h4>
            <div className="space-y-2">
              {data.prev_month_dwellings !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Previous Month:</span>
                  <span className="font-semibold text-foreground">
                    {data.prev_month_dwellings.toLocaleString()} dwellings
                  </span>
                </div>
              )}
              {data.prev_year_dwellings !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Same Month Last Year:</span>
                  <span className="font-semibold text-foreground">
                    {data.prev_year_dwellings.toLocaleString()} dwellings
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
