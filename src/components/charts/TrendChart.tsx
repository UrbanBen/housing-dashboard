"use client";

// Building Approvals Trend Chart
// Data Source: ONLY Database mosaic_pro, Schema public, Table abs_building_approvals_lga
// NO FALLBACK DATA - Only uses data from the database table
// Date Range: 2021-01 to 2024-12 (actual data from Jul 2021 onwards)
// Currently shows NSW state-wide totals
// Auto-updates when LGA selection changes (LGA filtering to be implemented)

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { LGA } from '@/components/filters/LGALookup';
import { BuildingApprovalsConfigForm, type BuildingApprovalsConfig } from '@/components/dashboard/BuildingApprovalsConfigForm';

interface ChartDataPoint {
  month: string;
  approvals: number;
  displayMonth: string;
}

interface TrendChartProps {
  selectedLGA?: LGA | null;
}

export interface TrendChartRef {
  openConfig: () => void;
}

export const TrendChart = forwardRef<TrendChartRef, TrendChartProps>(
  function TrendChart({ selectedLGA }, ref) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<BuildingApprovalsConfig | null>(null);

  // Load config from localStorage
  const getStoredConfig = (): BuildingApprovalsConfig => {
    if (typeof window === 'undefined') {
      return getDefaultConfig();
    }

    const stored = localStorage.getItem('building-approvals-config');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored config:', e);
      }
    }
    return getDefaultConfig();
  };

  const getDefaultConfig = (): BuildingApprovalsConfig => ({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'mosaic_pro',
    user: 'mosaic_readonly',
    passwordPath: '/users/ben/permissions/.env.readonly',
    schema: 'public',
    table: 'abs_building_approvals_lga',
    filterIntegration: {
      enabled: true,
      sourceCardId: 'search-geography-card',
      sourceCardType: 'search-geography-card',
      autoRefresh: true
    }
  });

  // Handle double click to configure
  const handleDoubleClick = () => {
    const config = getStoredConfig();
    setCurrentConfig(config);
    setShowConfigForm(true);
  };

  // Expose openConfig function to parent via ref
  useImperativeHandle(ref, () => ({
    openConfig: handleDoubleClick
  }));

  const handleSaveConfig = (newConfig: BuildingApprovalsConfig) => {
    // Save config to localStorage
    localStorage.setItem('building-approvals-config', JSON.stringify(newConfig));
    setCurrentConfig(newConfig);

    // If auto-refresh is enabled and we have a selected LGA, refetch data
    if (newConfig.filterIntegration.autoRefresh && selectedLGA) {
      // Data will be refetched by the useEffect below
      setLoading(true);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Use ONLY the database API - no fallbacks
        const apiUrl = selectedLGA
          ? `/api/housing-data?type=building-approvals&lga=${encodeURIComponent(selectedLGA.name)}`
          : '/api/housing-data?type=building-approvals';

        const response = await fetch(apiUrl);
        const dbData = await response.json();

        if (dbData.success && dbData.data.length > 0) {
          // Use database data
          const chartData: ChartDataPoint[] = dbData.data.map((item: any) => ({
            month: item.period,
            approvals: item.approvals,
            displayMonth: item.month.substring(0, 3)
          }));

          setData(chartData);
          setError(null);
        } else {
          // Database returned no data
          setData([]);
          setError('No building approvals data available from database');
        }
      } catch (err) {
        console.error('Error fetching building approvals data from database:', err);

        let errorMessage = 'Failed to load building approvals data from database';
        if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  const formatYAxisTick = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  if (loading) {
    return (
      <div className="w-full h-80 flex items-center justify-center">
        <div className="loading-shimmer rounded-lg w-full h-full flex items-center justify-center">
          <div className="text-muted-foreground">Loading building approvals data...</div>
        </div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center">
        <div className="text-destructive text-center">
          <p className="font-medium">Unable to load data</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--grid))" />
            <XAxis
              dataKey="displayMonth"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatYAxisTick}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--card-foreground))'
              }}
              formatter={(value: number) => [
                value?.toLocaleString(),
                'Building Approvals'
              ]}
              labelFormatter={(label) => {
                // Find the corresponding data point to get the correct year
                const dataPoint = data.find(d => d.displayMonth === label);
                if (dataPoint) {
                  const year = dataPoint.month.split('-')[0];
                  return `${label} ${year}`;
                }
                return label;
              }}
            />
            <Line
              type="monotone"
              dataKey="approvals"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Config Form */}
      <BuildingApprovalsConfigForm
        isOpen={showConfigForm}
        onClose={() => setShowConfigForm(false)}
        onSave={handleSaveConfig}
        currentConfig={currentConfig}
      />
    </>
  );
  }
);