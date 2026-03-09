"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bed } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { LGA } from '@/components/filters/LGALookup';

interface RentByBedroomCardProps {
  selectedLGA: LGA | null;
}

interface BedroomData {
  num_bedrooms: string;
  median_rent: number;
  first_quartile_rent: number;
  third_quartile_rent: number;
  new_bonds_lodged: number;
}

export function RentByBedroomCard({ selectedLGA }: RentByBedroomCardProps) {
  const [data, setData] = useState<BedroomData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quarter, setQuarter] = useState<string>('');

  useEffect(() => {
    if (!selectedLGA) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/median-rent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lgaName: selectedLGA.name })
        });

        const result = await response.json();

        if (result.success) {
          // Filter out "Total" and sort by bedroom count
          const bedroomData = (result.byBedroomCount || [])
            .filter((item: any) => item.num_bedrooms !== 'Total')
            .sort((a: any, b: any) => {
              const order: { [key: string]: number } = { '1': 1, '2': 2, '3': 3, '4+': 4 };
              return (order[a.num_bedrooms] || 99) - (order[b.num_bedrooms] || 99);
            });

          setData(bedroomData);
          setQuarter(result.summary?.quarter || '');
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err: any) {
        setError(err.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  // Format data for chart
  const chartData = data.map(item => ({
    bedrooms: `${item.num_bedrooms} bed`,
    'Median Rent': item.median_rent || 0,
    '25th Percentile': item.first_quartile_rent || 0,
    '75th Percentile': item.third_quartile_rent || 0
  }));

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Bed className="h-6 w-6 text-red-500" />
          <div>
            <CardTitle className="text-xl text-red-500">Rent by Bedroom Count</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {quarter} • {selectedLGA?.name || 'Select LGA'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64 text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Select an LGA to view rent by bedroom count</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="bedrooms"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: 'Weekly Rent ($)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `$${value.toFixed(0)}`}
                />
                <Legend />
                <Bar dataKey="25th Percentile" fill="#fca5a5" />
                <Bar dataKey="Median Rent" fill="#dc2626" />
                <Bar dataKey="75th Percentile" fill="#991b1b" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.map((item, index) => (
                <div
                  key={`bedroom-${item.num_bedrooms}-${index}`}
                  className="text-center p-3 bg-red-500/5 border border-red-500/10 rounded-lg"
                >
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    ${typeof item.median_rent === 'number' ? item.median_rent.toFixed(0) : 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.num_bedrooms} bedroom{item.num_bedrooms !== '1' ? 's' : ''}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.new_bonds_lodged?.toLocaleString() || 0} bonds
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
