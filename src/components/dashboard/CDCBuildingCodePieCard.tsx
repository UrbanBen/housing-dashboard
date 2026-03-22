'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Building, TrendingUp } from 'lucide-react';
import type { LGA } from '@/components/filters/LGALookup';

interface BuildingCodeData {
  building_class: string;
  total_count: number;
}

interface CDCBuildingCodePieCardProps {
  selectedLGA: LGA | null;
  cardWidth?: number;
}

const COLORS = [
  '#22c55e', // Green - Class 1 Houses
  '#3b82f6', // Blue - Class 2 Apartments
  '#f59e0b', // Amber - Class 3 Residential Care
  '#8b5cf6', // Purple - Class 4 Dwelling in Building
  '#6b7280', // Gray - Class 10 Non-Habitable
];

export default function CDCBuildingCodePieCard({ selectedLGA, cardWidth = 600 }: CDCBuildingCodePieCardProps) {
  const [data, setData] = useState<BuildingCodeData[]>([]);
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
            type: 'pie-chart',
            lgaName: selectedLGA.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Filter out zero counts
          const filteredData = result.data.filter((item: BuildingCodeData) => item.total_count > 0);
          setData(filteredData);
        } else {
          throw new Error(result.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        console.error('[CDC Building Code Pie Card] Error:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedLGA]);

  if (!selectedLGA) {
    return (
      <Card className="w-full h-full border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Building className="h-5 w-5" />
            CDC by Building Code Class
          </CardTitle>
          <CardDescription>Breakdown by building classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-gray-500">
            Select an LGA to view building code classes
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full h-full border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Building className="h-5 w-5" />
            CDC by Building Code Class
          </CardTitle>
          <CardDescription>Breakdown by building classification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700"></div>
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
            <Building className="h-5 w-5" />
            CDC by Building Code Class
          </CardTitle>
          <CardDescription>Breakdown by building classification</CardDescription>
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
      <Card className="w-full h-full border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Building className="h-5 w-5" />
            CDC by Building Code Class
          </CardTitle>
          <CardDescription>Breakdown by building classification</CardDescription>
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
    name: item.building_class,
    value: item.total_count,
  }));

  const totalCount = data.reduce((sum, item) => sum + item.total_count, 0);

  // Responsive chart size
  const chartSize = cardWidth < 400 ? 150 : cardWidth < 600 ? 200 : 250;

  return (
    <Card className="w-full h-full border-green-200 bg-gradient-to-br from-green-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-700">
          <Building className="h-5 w-5" />
          CDC by Building Code Class
        </CardTitle>
        <CardDescription>
          Complying Development Certificates for {selectedLGA.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-lg p-3 border border-green-100">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">Total CDCs</div>
            <div className="text-xl font-bold text-green-700">
              {totalCount.toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <TrendingUp className="h-3 w-3" />
            <span>{data.length} building code classes</span>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg p-4 border border-green-100">
          <ResponsiveContainer width="100%" height={chartSize}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  cardWidth > 500 ? `${name.split(' - ')[0]}: ${(percent * 100).toFixed(0)}%` : `${(percent * 100).toFixed(0)}%`
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
                  wrapperStyle={{ fontSize: '11px' }}
                  iconType="circle"
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white rounded-lg border border-green-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-green-50">
              <tr>
                <th className="text-left p-2 text-gray-700 font-semibold">Class</th>
                <th className="text-right p-2 text-gray-700 font-semibold">Count</th>
                <th className="text-right p-2 text-gray-700 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const percentage = ((item.total_count / totalCount) * 100).toFixed(1);
                return (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="p-2 flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-gray-900 text-xs">{item.building_class}</span>
                    </td>
                    <td className="p-2 text-right text-gray-900 font-medium">
                      {item.total_count.toLocaleString()}
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
