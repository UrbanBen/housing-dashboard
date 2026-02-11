"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Settings } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface CountryOfBirthCardProps {
  selectedLGA?: { name: string; id: string } | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface CountryData {
  country: string;
  total: number;
  percentage: string;
}

interface SummaryData {
  totalPopulation: number;
  australiaBorn: number;
  overseasBorn: number;
  australiaPercentage: string;
  overseasPercentage: string;
}

// Color palette for bars (shades of green)
const COLORS = [
  '#065f46', '#047857', '#059669', '#10b981', '#34d399',
  '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5', '#f0fdfa'
];

export function CountryOfBirthCard({ selectedLGA, isAdminMode = false, onAdminClick }: CountryOfBirthCardProps) {
  const [data, setData] = useState<CountryData[] | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedLGA) {
      setData(null);
      setSummary(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/country-of-birth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lgaName: selectedLGA.name,
            schema: 's12_census',
            table: 'cen21_country_of_birth_person_lga',
            lgaColumn: 'lga_name_2021',
            countryColumn: 'country_of_birth_of_person',
            valueColumn: 'value',
            limit: 11 // Request 11 to get 10 after filtering out Australia
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch country of birth data');
        }

        if (result.data && Array.isArray(result.data)) {
          // Filter out Australia from the main chart (it's in the summary)
          const filteredData = result.data.filter((item: CountryData) => item.country !== 'Australia');
          setData(filteredData.slice(0, 10)); // Top 10 non-Australia countries
          setSummary(result.summary);
        } else {
          setError('No data available for this LGA');
        }
      } catch (err) {
        console.error('Error fetching country of birth data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);


  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#eab308] hover:ring-2 hover:ring-[#eab308]/50 hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-[#eab308]" />
            <CardTitle className="text-xl text-[#eab308]">
              Country of Birth{selectedLGA ? ` - ${selectedLGA.name}` : ''}
            </CardTitle>
          </div>
          {isAdminMode && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Configure Country of Birth"
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedLGA && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Globe className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select an LGA to view country of birth data
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

        {selectedLGA && data && data.length > 0 && summary && !isLoading && !error && (
          <div className="space-y-6">
            {/* Top Countries Horizontal Bar Chart */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Top 10 Countries of Birth (excluding Australia)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    dataKey="country"
                    type="category"
                    stroke="hsl(var(--foreground))"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid #22c55e',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value.toLocaleString()} (${props.payload.percentage}%)`,
                      'Population'
                    ]}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border/50">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Total Population</div>
                <div className="text-lg font-bold">{summary.totalPopulation.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Australia-born</div>
                <div className="text-lg font-bold">{summary.australiaBorn.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">({summary.australiaPercentage}%)</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Overseas-born</div>
                <div className="text-lg font-bold">{summary.overseasBorn.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">({summary.overseasPercentage}%)</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
