'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('PopulationGrowthCard');

interface PopulationGrowthCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

interface CensusData {
  population_2011: number;
  population_2016: number;
  population_2021: number;
  population_2026_proj: number;
  growth_rate_annual_avg: number;
}

export default function PopulationGrowthCard({ selectedLGA, cardWidth = 600 }: PopulationGrowthCardProps) {
  const [data, setData] = useState<CensusData | null>(null);
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
        const lgaName = selectedLGA.id === 'nsw-state' ? 'NSW' : selectedLGA.name;
        const response = await fetch(`/api/census-data?lgaName=${encodeURIComponent(lgaName)}`);
        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'No census data available');
        }
      } catch (err: any) {
        logger.error('[Population Growth Card] Error', { error: err });
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedLGA]);

  if (!selectedLGA) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <TrendingUp className="h-5 w-5" />
            Population Growth
          </CardTitle>
          <CardDescription>Census Data (2011-2026)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Select an LGA to view population trends
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <TrendingUp className="h-5 w-5" />
            Population Growth
          </CardTitle>
          <CardDescription>Census Data (2011-2026)</CardDescription>
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
          <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <TrendingUp className="h-5 w-5" />
            Population Growth
          </CardTitle>
          <CardDescription>Census Data (2011-2026)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-destructive">
            {error || 'No data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = [
    { year: '2011', population: data.population_2011 || 0, type: 'actual' },
    { year: '2016', population: data.population_2016 || 0, type: 'actual' },
    { year: '2021', population: data.population_2021 || 0, type: 'actual' },
    { year: '2026*', population: data.population_2026_proj || 0, type: 'projected' },
  ];

  // Calculate total growth
  const totalGrowth = data.population_2026_proj && data.population_2011
    ? ((data.population_2026_proj - data.population_2011) / data.population_2011 * 100).toFixed(1)
    : 'N/A';

  // Responsive chart configuration
  const chartHeight = cardWidth < 400 ? 250 : cardWidth < 600 ? 300 : 350;

  return (
    <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <TrendingUp className="h-5 w-5" />
          Population Growth
        </CardTitle>
        <CardDescription>
          Census Data (2011-2026) • {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Latest Population</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {data.population_2021?.toLocaleString() || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">2021 Census</div>
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Projected 2026</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {data.population_2026_proj?.toLocaleString() || 'N/A'}
            </div>
            <div className="text-xs text-muted-foreground">Estimated</div>
          </div>
        </div>

        {/* Line Chart */}
        <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="year"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toString();
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [value.toLocaleString(), 'Population']}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={() => 'Population'}
              />
              <Line
                type="monotone"
                dataKey="population"
                stroke="#eab308"
                strokeWidth={3}
                dot={{ fill: '#eab308', r: 5 }}
                activeDot={{ r: 7 }}
                name="Population"
                label={(props: any) => {
                  const { x, y, value } = props;
                  if (value == null) return <></>;
                  return (
                    <text
                      x={x}
                      y={y - 10}
                      fill="#eab308"
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight={600}
                    >
                      {value.toLocaleString()}
                    </text>
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Growth Statistics */}
        <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Growth (2011-2026)</div>
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {totalGrowth}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Avg. Annual Growth</div>
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {data.growth_rate_annual_avg != null && !isNaN(Number(data.growth_rate_annual_avg))
                  ? `${Number(data.growth_rate_annual_avg).toFixed(2)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            * 2026 values are projected estimates
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
