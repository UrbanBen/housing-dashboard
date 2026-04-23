'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Building, TrendingUp } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('CDCBuildingCodePieCard');

interface BuildingClassData {
  building_class: string;
  total_count: number;
}

interface CDCBuildingCodePieCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
  cdcTimeframe?: { startDate: string; endDate: string } | null;
}

const COLORS = [
  '#14b8a6', // Teal - Class 1
  '#2dd4bf', // Teal 400 - Class 2
  '#5eead4', // Teal 300 - Class 3
  '#99f6e4', // Teal 200 - Class 4
  '#ccfbf1', // Teal 100 - Class 5
  '#0d9488', // Teal 600 - Class 6
];

export default function CDCBuildingCodePieCard({ selectedLGA, cardWidth = 600, cdcTimeframe }: CDCBuildingCodePieCardProps) {
  const [data, setData] = useState<BuildingClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('Most Recent Month');

  useEffect(() => {
    async function fetchData() {
      if (!selectedLGA) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const body: any = {
          type: 'pie-chart',
          lgaName: selectedLGA.name,
        };

        // Add date range if provided by CDC History Card
        if (cdcTimeframe?.startDate && cdcTimeframe?.endDate) {
          body.startDate = cdcTimeframe.startDate;
          body.endDate = cdcTimeframe.endDate;

          // Format date range for display
          const start = new Date(cdcTimeframe.startDate);
          const end = new Date(cdcTimeframe.endDate);
          setDateRange(`${start.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })} to ${end.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`);
        } else {
          setDateRange('Most Recent Month');
        }

        const response = await fetch('/api/cdc-comprehensive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        logger.error('[CDC Building Code Pie Card] Error', { error: err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedLGA, cdcTimeframe]);

  if (!selectedLGA) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Building className="h-5 w-5" />
            CDC by Building Class
          </CardTitle>
          <CardDescription>{dateRange}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            Select an LGA to view building class distribution
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Building className="h-5 w-5" />
            CDC by Building Class
          </CardTitle>
          <CardDescription>{dateRange}</CardDescription>
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
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Building className="h-5 w-5" />
            CDC by Building Class
          </CardTitle>
          <CardDescription>{dateRange}</CardDescription>
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
      <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Building className="h-5 w-5" />
            CDC by Building Class
          </CardTitle>
          <CardDescription>{dateRange}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No data available for {selectedLGA.name}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data - ensure values are numbers
  const chartData = data.map(item => ({
    name: item.building_class || 'Unknown',
    value: Number(item.total_count) || 0,
  }));

  const totalCount = data.reduce((sum, item) => sum + (Number(item.total_count) || 0), 0);

  // Responsive chart size - increased for better visibility
  const chartSize = cardWidth < 400 ? 200 : cardWidth < 600 ? 280 : 350;

  return (
    <Card className="w-full h-full bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
          <Building className="h-5 w-5" />
          CDC by Building Class
        </CardTitle>
        <CardDescription>
          {dateRange} • {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Total CDC Certificates</div>
            <div className="text-xl font-bold text-teal-600 dark:text-teal-400">
              {totalCount.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>{data.length} building classes</span>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={chartSize}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  cardWidth > 500 ? `${name}: ${(percent * 100).toFixed(0)}%` : `${(percent * 100).toFixed(0)}%`
                }
                outerRadius={cardWidth < 400 ? 70 : cardWidth < 600 ? 100 : 130}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value.toLocaleString()} (${((value / totalCount) * 100).toFixed(1)}%)`,
                  props.payload.name
                ]}
              />
              {cardWidth > 500 && (
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                  iconType="circle"
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Table */}
        <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-teal-500/10">
              <tr>
                <th className="text-left p-2 text-foreground font-semibold">Class</th>
                <th className="text-right p-2 text-foreground font-semibold">Count</th>
                <th className="text-right p-2 text-foreground font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const count = Number(item.total_count) || 0;
                const percentage = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={index} className="border-t border-border">
                    <td className="p-2 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-foreground text-xs">{item.building_class}</span>
                    </td>
                    <td className="p-2 text-right text-foreground font-medium">
                      {count.toLocaleString()}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
