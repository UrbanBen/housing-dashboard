"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Info } from "lucide-react";
import type { LGA } from '@/components/filters/LGALookup';

interface RentTrendsCardProps {
  selectedLGA: LGA | null;
}

export function RentTrendsCard({ selectedLGA }: RentTrendsCardProps) {
  const [quarter, setQuarter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedLGA) {
      setQuarter('');
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        const response = await fetch('/api/median-rent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lgaName: selectedLGA.name })
        });

        const result = await response.json();

        if (result.success) {
          setQuarter(result.summary?.quarter || '');
        }
      } catch (err) {
        console.error('Error fetching rent trends:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-6 w-6 text-red-500" />
          <div>
            <CardTitle className="text-xl text-red-500">Rent Trends Over Time</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Historical rental trends • {selectedLGA?.name || 'Select LGA'}
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

        {!loading && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="bg-red-500/5 border border-red-500/10 rounded-full p-6 mb-4">
              <Info className="h-12 w-12 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Historical Data Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              This card will display rent trends over multiple quarters once historical data is imported.
              Currently showing data for: <span className="font-semibold text-red-500">{quarter || 'Latest quarter'}</span>
            </p>
            <div className="mt-4 p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Check back after historical quarters are crawled and imported
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
