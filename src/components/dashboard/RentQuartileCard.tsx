"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';

interface RentQuartileCardProps {
  selectedLGA: LGA | null;
}

interface QuartileData {
  dwelling_type: string;
  num_bedrooms: string;
  first_quartile_rent: number;
  median_rent: number;
  third_quartile_rent: number;
  new_bonds_lodged: number;
}

export function RentQuartileCard({ selectedLGA }: RentQuartileCardProps) {
  const [data, setData] = useState<QuartileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quarter, setQuarter] = useState<string>('');
  const [selectedDwelling, setSelectedDwelling] = useState<string>('Total');

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
          setData(result.data || []);
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

  // Filter data by selected dwelling type
  const filteredData = data.filter(item =>
    item.dwelling_type === selectedDwelling && item.num_bedrooms !== 'Total'
  ).sort((a, b) => {
    const order: { [key: string]: number } = { '1': 1, '2': 2, '3': 3, '4+': 4 };
    return (order[a.num_bedrooms] || 99) - (order[b.num_bedrooms] || 99);
  });

  // Get unique dwelling types for selector
  const dwellingTypes = ['Total', 'Houses', 'Flats/Units', 'Townhouses'];

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-red-500" />
            <div>
              <CardTitle className="text-xl text-red-500">Rent Distribution</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {quarter} • {selectedLGA?.name || 'Select LGA'}
              </p>
            </div>
          </div>

          {/* Dwelling Type Selector */}
          <select
            value={selectedDwelling}
            onChange={(e) => setSelectedDwelling(e.target.value)}
            className="px-3 py-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {dwellingTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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

        {!loading && !error && filteredData.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Select an LGA to view rent distribution</p>
          </div>
        )}

        {!loading && !error && filteredData.length > 0 && (
          <div className="space-y-6">
            {filteredData.map((item, index) => {
              const range = (item.third_quartile_rent || 0) - (item.first_quartile_rent || 0);
              const medianPosition = item.median_rent && item.first_quartile_rent
                ? ((item.median_rent - item.first_quartile_rent) / range) * 100
                : 50;

              return (
                <div key={`quartile-${item.num_bedrooms}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {item.num_bedrooms} Bedroom{item.num_bedrooms !== '1' ? 's' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.new_bonds_lodged?.toLocaleString() || 0} bonds
                    </span>
                  </div>

                  {/* Quartile Range Visualization */}
                  <div className="relative h-12 bg-red-500/5 border border-red-500/10 rounded-lg overflow-hidden">
                    {/* Q1 to Q3 Range */}
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-red-200/30 via-red-500/20 to-red-200/30 dark:from-red-900/30 dark:via-red-500/30 dark:to-red-900/30"
                      style={{
                        left: '0%',
                        right: '0%'
                      }}
                    />

                    {/* Median Line */}
                    {item.median_rent && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-red-600"
                        style={{ left: `${medianPosition}%` }}
                      />
                    )}

                    {/* Labels */}
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        ${item.first_quartile_rent?.toFixed(0) || '—'}
                      </span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">
                        ${item.median_rent?.toFixed(0) || '—'}
                      </span>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        ${item.third_quartile_rent?.toFixed(0) || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>25th percentile</span>
                    <span>Median</span>
                    <span>75th percentile</span>
                  </div>
                </div>
              );
            })}

            <div className="mt-6 p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                The shaded area represents the middle 50% of rental prices.
                The vertical line shows the median (typical) rent.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
