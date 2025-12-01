"use client";

// LGA Dwelling Approvals Chart
// Data Source: ONLY Database research&insights, Schema housing_dashboard, Table building_approvals_nsw_lga
// NO FALLBACK DATA - Only uses data from the database table
// Shows dwelling approvals for selected LGA only

import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import type { LGA } from '@/components/filters/LGALookup';
import { LGADwellingApprovalsConfigForm, type LGADwellingApprovalsConfig } from '@/components/dashboard/LGADwellingApprovalsConfigForm';

interface ChartDataPoint {
  month: string;
  approvals: number;
  displayMonth: string;
  year: number;
}

interface LGADwellingApprovalsChartProps {
  selectedLGA?: LGA | null;
}

export interface LGADwellingApprovalsChartRef {
  openConfig: () => void;
}

export const LGADwellingApprovalsChart = forwardRef<LGADwellingApprovalsChartRef, LGADwellingApprovalsChartProps>(
  function LGADwellingApprovalsChart({ selectedLGA }, ref) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<LGADwellingApprovalsConfig | null>(null);

  // Load config from localStorage
  const getStoredConfig = (): LGADwellingApprovalsConfig => {
    if (typeof window === 'undefined') {
      return getDefaultConfig();
    }

    const stored = localStorage.getItem('lga-dwelling-approvals-config');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored config:', e);
      }
    }
    return getDefaultConfig();
  };

  const getDefaultConfig = (): LGADwellingApprovalsConfig => ({
    host: 'mecone-data-lake.postgres.database.azure.com',
    port: 5432,
    database: 'research&insights',
    user: 'db_admin',
    passwordPath: '/users/ben/permissions/.env.admin',
    schema: 'housing_dashboard',
    table: 'building_approvals_nsw_lga',
    lgaCodeColumn: 'lga_code',
    lgaNameColumn: 'lga_name',
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

  const handleSaveConfig = (newConfig: LGADwellingApprovalsConfig) => {
    // Save config to localStorage
    localStorage.setItem('lga-dwelling-approvals-config', JSON.stringify(newConfig));
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

        console.log('[LGADwellingApprovalsChart] selectedLGA changed:', selectedLGA);

        if (!selectedLGA) {
          setData([]);
          setError('Please select an LGA to view dwelling approvals');
          setLoading(false);
          return;
        }

        console.log('[LGADwellingApprovalsChart] Fetching data for LGA:', {
          id: selectedLGA.id,
          name: selectedLGA.name
        });

        // Use ONLY the database API - no fallbacks
        // Pass LGA code for filtering, and name for display
        const apiUrl = `/api/lga-dwelling-approvals?lgaCode=${encodeURIComponent(selectedLGA.id)}&lgaName=${encodeURIComponent(selectedLGA.name)}`;

        console.log('[LGADwellingApprovalsChart] API URL:', apiUrl);

        const response = await fetch(apiUrl);
        const dbData = await response.json();

        console.log('[LGADwellingApprovalsChart] API response:', dbData);

        if (dbData.success && dbData.data.length > 0) {
          // Use database data
          const chartData: ChartDataPoint[] = dbData.data.map((item: any) => ({
            month: item.period,
            approvals: item.approvals,
            displayMonth: item.month.substring(0, 3),
            year: item.year
          }));

          setData(chartData);
          setError(null);
        } else {
          // Database returned no data
          setData([]);
          setError(dbData.message || 'No dwelling approvals data available for this LGA');
        }
      } catch (err) {
        console.error('Error fetching LGA dwelling approvals data:', err);

        let errorMessage = 'Failed to load dwelling approvals data from database';
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
          <div className="text-muted-foreground">Loading dwelling approvals data...</div>
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
            tickFormatter={(value, index) => {
              // Add year to every 12th tick or when year changes
              const dataPoint = data[index];
              if (!dataPoint) return value;

              // Show year for Jan or first/last data point
              if (value === 'Jan' || index === 0 || index === data.length - 1) {
                return `${value} ${String(dataPoint.year).slice(2)}`;
              }

              // Show year when it changes from previous month
              if (index > 0 && data[index - 1]?.year !== dataPoint.year) {
                return `${value} ${String(dataPoint.year).slice(2)}`;
              }

              return value;
            }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={formatYAxisTick}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '2px solid #22c55e',
              borderRadius: '6px',
              color: 'hsl(var(--card-foreground))'
            }}
            formatter={(value: number) => [
              value?.toLocaleString(),
              'Dwelling Approvals'
            ]}
            labelFormatter={(label, payload) => {
              // Get year from the payload data point
              if (payload && payload.length > 0) {
                const dataPoint = payload[0].payload as ChartDataPoint;
                return `${label} ${dataPoint.year}`;
              }
              return label;
            }}
          />
          <Line
            type="monotone"
            dataKey="approvals"
            stroke="rgb(0, 255, 65)"
            strokeWidth={3}
            dot={{ fill: 'rgb(0, 255, 65)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'rgb(0, 255, 65)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>

      {/* Config Form */}
      <LGADwellingApprovalsConfigForm
        isOpen={showConfigForm}
        onClose={() => setShowConfigForm(false)}
        onSave={handleSaveConfig}
        currentConfig={currentConfig}
      />
    </>
  );
}
);
