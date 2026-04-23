'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Building2, TrendingUp } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';
import { createComponentLogger } from '@/lib/logger';

const logger = createComponentLogger('DADevelopmentTypePieCard');

interface DevelopmentTypeData {
  development_type: string;
  count: number;
  approved: number;
  refused: number;
}

interface DADevelopmentTypePieCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

const COLORS = [
  '#3b82f6', // Blue - Residential
  '#f59e0b', // Amber - Commercial
  '#8b5cf6', // Purple - Industrial
  '#ec4899', // Pink - Mixed Use
  '#10b981', // Green - Other
  '#6b7280', // Gray - Unknown
];

export default function DADevelopmentTypePieCard({ selectedLGA, cardWidth = 600 }: DADevelopmentTypePieCardProps) {
  const [data, setData] = useState<DevelopmentTypeData[]>([]);
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
            type: 'pie-chart',
            lgaName: selectedLGA.name,
          }),
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
        logger.error('[DA Development Type Pie Card] Error', err );
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedLGA]);

  if (!selectedLGA) {
    return (
      <Card className="w-full h-full border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Building2 className="h-5 w-5" />
            DA by Development Type
          </CardTitle>
          <CardDescription>Breakdown of applications by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            Select an LGA to view development types
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
            <Building2 className="h-5 w-5" />
            DA by Development Type
          </CardTitle>
          <CardDescription>Breakdown of applications by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
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
            <Building2 className="h-5 w-5" />
            DA by Development Type
          </CardTitle>
          <CardDescription>Breakdown of applications by type</CardDescription>
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
      <Card className="w-full h-full border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Building2 className="h-5 w-5" />
            DA by Development Type
          </CardTitle>
          <CardDescription>Breakdown of applications by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            No data available for {selectedLGA.name}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = data.map(item => ({
    name: item.development_type || 'Unknown',
    value: item.count,
    approved: item.approved,
    refused: item.refused,
  }));

  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  // Responsive chart size
  const chartSize = cardWidth < 400 ? 150 : cardWidth < 600 ? 200 : 250;

  return (
    <Card className="w-full h-full border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Building2 className="h-5 w-5" />
          DA by Development Type
        </CardTitle>
        <CardDescription>
          Development Applications for {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-lg p-3 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">Total Applications</div>
            <div className="text-xl font-bold text-blue-700">
              {totalCount.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <TrendingUp className="h-3 w-3" />
            <span>{data.length} development types</span>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg p-4 border border-blue-100">
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
                outerRadius={cardWidth < 400 ? 60 : cardWidth < 600 ? 80 : 100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
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
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="text-left p-2 text-gray-700 font-semibold">Type</th>
                <th className="text-right p-2 text-gray-700 font-semibold">Count</th>
                <th className="text-right p-2 text-gray-700 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const percentage = ((item.count / totalCount) * 100).toFixed(1);
                return (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="p-2 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-900">{item.development_type || 'Unknown'}</span>
                    </td>
                    <td className="p-2 text-right text-gray-900 font-medium">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="p-2 text-right text-gray-600">
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
