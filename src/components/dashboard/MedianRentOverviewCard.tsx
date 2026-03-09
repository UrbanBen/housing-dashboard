"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';

interface MedianRentOverviewCardProps {
  selectedLGA: LGA | null;
}

interface RentData {
  dwelling_type: string;
  median_rent: number;
  quarterly_change_median_pct: number;
  annual_change_median_pct: number;
  new_bonds_lodged: number;
}

export function MedianRentOverviewCard({ selectedLGA }: MedianRentOverviewCardProps) {
  const [data, setData] = useState<RentData[]>([]);
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
          setData(result.byDwellingType || []);
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

  const formatChange = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getDwellingIcon = (type: string) => {
    return <DollarSign className="h-5 w-5" />;
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-red-500" />
          <div>
            <CardTitle className="text-xl text-red-500">Median Weekly Rent</CardTitle>
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
            <p>Select an LGA to view median rent data</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map((item, index) => {
              const isIncrease = (item.quarterly_change_median_pct || 0) >= 0;

              return (
                <div
                  key={`${item.dwelling_type}-${index}`}
                  className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 hover:bg-red-500/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getDwellingIcon(item.dwelling_type)}
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.dwelling_type}
                      </span>
                    </div>
                    {item.quarterly_change_median_pct !== null && (
                      <div className={`flex items-center gap-1 text-xs ${isIncrease ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {formatChange(item.quarterly_change_median_pct)}
                      </div>
                    )}
                  </div>

                  <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                    ${item.median_rent?.toFixed(0) || 'N/A'}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/week</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>YoY: {formatChange(item.annual_change_median_pct)}</span>
                    <span>{item.new_bonds_lodged?.toLocaleString() || 0} bonds</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
