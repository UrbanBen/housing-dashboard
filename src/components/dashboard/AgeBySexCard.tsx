"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AgeBySexCardProps {
  selectedLGA?: { name: string; id: string } | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface AgeGroupData {
  age: string;
  sex: string;
  total: number;
}

interface PyramidData {
  age: string;
  male: number;
  female: number;
}

const COLORS = {
  male: 'rgba(59, 130, 246, 0.7)',     // Blue with 70% opacity
  female: 'rgba(236, 72, 153, 0.7)',   // Pink with 70% opacity
};

export function AgeBySexCard({ selectedLGA, isAdminMode = false, onAdminClick }: AgeBySexCardProps) {
  const [data, setData] = useState<AgeGroupData[] | null>(null);
  const [pyramidData, setPyramidData] = useState<PyramidData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalMale, setTotalMale] = useState(0);
  const [totalFemale, setTotalFemale] = useState(0);

  useEffect(() => {
    if (!selectedLGA) {
      setData(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/age-by-sex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lgaName: selectedLGA.name,
            host: 'mecone-data-lake.postgres.database.azure.com',
            port: 5432,
            database: 'research&insights',
            user: 'db_admin',
            passwordPath: '/users/ben/permissions/.env.admin',
            schema: 's12_census',
            table: 'cen21_age_by_sex_lga',
            lgaColumn: 'lga_name_2021'
          })
        });

        const result = await response.json();

        if (!response.ok) {
          // Gracefully handle "no data" case without throwing error
          if (result.error?.includes('No data found')) {
            setData([]);
            setPyramidData([]);
            setIsLoading(false);
            return;
          }
          throw new Error(result.error || 'Failed to fetch age by sex data');
        }

        if (result.data && Array.isArray(result.data)) {
          setData(result.data);

          // Transform data into pyramid format
          const ageGroups = new Map<string, { male: number; female: number }>();
          let maleTotal = 0;
          let femaleTotal = 0;

          result.data.forEach((row: AgeGroupData) => {
            if (!ageGroups.has(row.age)) {
              ageGroups.set(row.age, { male: 0, female: 0 });
            }
            const group = ageGroups.get(row.age)!;

            if (row.sex === 'Male') {
              group.male = -row.total; // Negative for left side
              maleTotal += row.total;
            } else if (row.sex === 'Female') {
              group.female = row.total; // Positive for right side
              femaleTotal += row.total;
            }
          });

          // Convert to array and sort by age
          const pyramid = Array.from(ageGroups.entries())
            .map(([age, values]) => ({
              age,
              male: values.male,
              female: values.female
            }))
            .sort((a, b) => {
              // Place "100 year and over" at the bottom (end)
              if (a.age.includes('100')) return 1;
              if (b.age.includes('100')) return -1;

              // Sort other age groups numerically
              const aNum = parseInt(a.age.replace(/\D/g, '')) || 0;
              const bNum = parseInt(b.age.replace(/\D/g, '')) || 0;
              return aNum - bNum;
            });

          setPyramidData(pyramid);
          setTotalMale(maleTotal);
          setTotalFemale(femaleTotal);
        } else {
          setError('No data available for this LGA');
        }
      } catch (err) {
        console.error('Error fetching age by sex data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const maleValue = Math.abs(payload[0]?.value || 0);
      const femaleValue = payload[1]?.value || 0;
      return (
        <div className="bg-card border-2 border-[#22c55e] rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold mb-2 text-[#22c55e]">{label}</p>
          <p className="text-xs" style={{ color: COLORS.male }}>
            Male: {maleValue.toLocaleString()}
          </p>
          <p className="text-xs" style={{ color: COLORS.female }}>
            Female: {femaleValue.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const text = payload.value.replace(' and ', ' & '); // Replace "and" with "&"
    const parts = text.split(' ');

    // Special handling for "100 years & over" - two lines
    if (text.includes('100') && text.includes('&')) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={-4}
            dy={0}
            textAnchor="end"
            fill="#888"
            fontSize={11}
          >
            100 years
          </text>
          <text
            x={0}
            y={8}
            dy={0}
            textAnchor="end"
            fill="#888"
            fontSize={11}
          >
            & over
          </text>
        </g>
      );
    }

    // Standard two-line format for other age groups
    const agePart = parts[0]; // e.g., "0-4"
    const yearsPart = parts.slice(1).join(' '); // e.g., "years"

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={-4}
          dy={0}
          textAnchor="end"
          fill="#888"
          fontSize={11}
        >
          {agePart}
        </text>
        <text
          x={0}
          y={8}
          dy={0}
          textAnchor="end"
          fill="#888"
          fontSize={11}
        >
          {yearsPart}
        </text>
      </g>
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#eab308] hover:ring-2 hover:ring-[#eab308]/50 hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-[#eab308]" />
            <CardTitle className="text-xl text-[#eab308]">
              Age by Sex{selectedLGA ? ` - ${selectedLGA.name}` : ''}
            </CardTitle>
          </div>
          {isAdminMode && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Configure Age by Sex"
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedLGA && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select an LGA to view age by sex data
            </p>
          </div>
        )}

        {selectedLGA && isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {selectedLGA && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

{selectedLGA && pyramidData.length > 0 && !isLoading && !error && (
          <div className="space-y-4">
            {/* Population Pyramid */}
            <div className="h-[700px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pyramidData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => Math.abs(value).toLocaleString()}
                  />
                  <YAxis
                    type="category"
                    dataKey="age"
                    tick={<CustomYAxisTick />}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Legend
                    wrapperStyle={{ paddingTop: '0px', marginLeft: '60px' }}
                    iconType="circle"
                    formatter={(value) => <span style={{ marginLeft: '8px', marginRight: '30px' }}>{value}</span>}
                  />
                  <Bar
                    dataKey="male"
                    fill={COLORS.male}
                    name="Male"
                    radius={[0, 4, 4, 0]}
                    activeBar={{
                      fill: 'rgba(59, 130, 246, 0.2)',
                      stroke: '#4ade80',
                      strokeWidth: 3,
                      filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 1))'
                    }}
                  />
                  <Bar
                    dataKey="female"
                    fill={COLORS.female}
                    name="Female"
                    radius={[0, 4, 4, 0]}
                    activeBar={{
                      fill: 'rgba(236, 72, 153, 0.2)',
                      stroke: '#4ade80',
                      strokeWidth: 3,
                      filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 1))'
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Male</div>
                <div className="text-lg font-bold" style={{ color: COLORS.male }}>
                  {totalMale.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Total</div>
                <div className="text-lg font-bold text-primary">
                  {(totalMale + totalFemale).toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Female</div>
                <div className="text-lg font-bold" style={{ color: COLORS.female }}>
                  {totalFemale.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
