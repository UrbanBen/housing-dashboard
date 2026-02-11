"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Settings, TrendingUp, Home, User } from "lucide-react";

interface IncomeCardProps {
  selectedLGA?: { name: string; id: string } | null;
  isAdminMode?: boolean;
  onAdminClick?: () => void;
}

interface IncomeData {
  lgaName: string;
  avgHouseholdIncome: number;
  avgPersonalIncome: number;
  avgWeeklyRent: number;
  householdIncomeRank: number;
  personalIncomeRank: number;
  weeklyRentRank: number;
  totalLGAs: number;
}

export function IncomeCard({ selectedLGA, isAdminMode = false, onAdminClick }: IncomeCardProps) {
  const [data, setData] = useState<IncomeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lgaName: selectedLGA.name })
        });

        const result = await response.json();

        if (!response.ok) {
          // Gracefully handle "no data" case without showing error
          if (result.error?.includes('not found') || result.error?.includes('No data')) {
            setData(null);
            return;
          }
          throw new Error(result.error || 'Failed to fetch income data');
        }

        setData(result.data);
      } catch (err) {
        console.error('Error fetching income data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedLGA]);

  // Helper function to get ranking color and description
  const getRankingInfo = (rank: number, total: number, isLowerBetter: boolean = false) => {
    const percentile = (rank / total) * 100;

    if (isLowerBetter) {
      // For rent, lower is better (more affordable)
      if (percentile <= 25) return { color: 'text-[#10b981]', desc: 'Most Affordable' };
      if (percentile <= 50) return { color: 'text-[#3b82f6]', desc: 'Below Average' };
      if (percentile <= 75) return { color: 'text-[#f59e0b]', desc: 'Above Average' };
      return { color: 'text-[#ef4444]', desc: 'Least Affordable' };
    } else {
      // For income, higher is better
      if (percentile <= 25) return { color: 'text-[#10b981]', desc: 'Top 25%' };
      if (percentile <= 50) return { color: 'text-[#3b82f6]', desc: 'Above Average' };
      if (percentile <= 75) return { color: 'text-[#f59e0b]', desc: 'Below Average' };
      return { color: 'text-[#ef4444]', desc: 'Bottom 25%' };
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm shadow-lg border-2 border-[#eab308] hover:ring-2 hover:ring-[#eab308]/50 hover:shadow-xl transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-[#eab308]" />
            <CardTitle className="text-xl text-[#eab308]">
              Rental Affordability - Census 2021{selectedLGA ? ` - ${selectedLGA.name}` : ''}
            </CardTitle>
          </div>
          {isAdminMode && onAdminClick && (
            <button
              onClick={onAdminClick}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Configure Income Card"
            >
              <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!selectedLGA && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Select an LGA to view rental affordability data
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
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">
              Data from ABS Census 2021
            </p>
          </div>
        )}

        {selectedLGA && !data && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No rental affordability data available for {selectedLGA.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Data from ABS Census 2021
            </p>
          </div>
        )}

        {selectedLGA && data && !isLoading && !error && (
          <div className="space-y-4">
            {/* 2x2 Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Average Household Income */}
              <div className="bg-chart-3/5 border border-chart-3/10 rounded-lg p-4 hover:bg-chart-3/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-5 w-5 text-chart-3" />
                  <span className="text-sm font-medium text-muted-foreground">Average Household Income</span>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {data.avgHouseholdIncome > 0 ? (
                    <>
                      ${data.avgHouseholdIncome.toLocaleString()}
                      <span className="text-sm text-muted-foreground ml-2">/week</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="text-xs flex items-center text-chart-3">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {data.avgHouseholdIncome > 0 ? (
                    <>#{data.householdIncomeRank} of {data.totalLGAs} - {getRankingInfo(data.householdIncomeRank, data.totalLGAs).desc}</>
                  ) : (
                    <span className="text-muted-foreground">No data available</span>
                  )}
                </div>
              </div>

              {/* Average Personal Income */}
              <div className="bg-chart-3/5 border border-chart-3/10 rounded-lg p-4 hover:bg-chart-3/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-5 w-5 text-chart-3" />
                  <span className="text-sm font-medium text-muted-foreground">Average Personal Income</span>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {data.avgPersonalIncome > 0 ? (
                    <>
                      ${data.avgPersonalIncome.toLocaleString()}
                      <span className="text-sm text-muted-foreground ml-2">/week</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="text-xs flex items-center text-chart-3">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {data.avgPersonalIncome > 0 ? (
                    <>#{data.personalIncomeRank} of {data.totalLGAs} - {getRankingInfo(data.personalIncomeRank, data.totalLGAs).desc}</>
                  ) : (
                    <span className="text-muted-foreground">No data available</span>
                  )}
                </div>
              </div>

              {/* Average Rent */}
              <div className="bg-chart-3/5 border border-chart-3/10 rounded-lg p-4 hover:bg-chart-3/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-5 w-5 text-chart-3" />
                  <span className="text-sm font-medium text-muted-foreground">Average Rent</span>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {data.avgWeeklyRent > 0 ? (
                    <>
                      ${data.avgWeeklyRent.toLocaleString()}
                      <span className="text-sm text-muted-foreground ml-2">/week</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="text-xs flex items-center text-chart-3">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {data.avgWeeklyRent > 0 ? (
                    <>#{data.weeklyRentRank} of {data.totalLGAs} - {getRankingInfo(data.weeklyRentRank, data.totalLGAs, true).desc}</>
                  ) : (
                    <span className="text-muted-foreground">No data available</span>
                  )}
                </div>
              </div>

              {/* Rent to Income Ratio - Affordability Insight */}
              <div className="bg-highlight/5 border border-highlight/10 rounded-lg p-4 hover:bg-highlight/10 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-highlight" />
                  <span className="text-sm font-medium text-muted-foreground">Rent to Income Ratio</span>
                </div>
                <div className="text-3xl font-bold text-foreground mb-1">
                  {data.avgWeeklyRent > 0 && data.avgHouseholdIncome > 0 ? (
                    <>{((data.avgWeeklyRent / data.avgHouseholdIncome) * 100).toFixed(1)}%</>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </div>
                <div className="text-xs flex items-center text-highlight">
                  <Home className="h-4 w-4 mr-1" />
                  {data.avgWeeklyRent > 0 && data.avgHouseholdIncome > 0 ? (
                    <>{(data.avgWeeklyRent / data.avgHouseholdIncome) * 100 > 30 ? 'Unaffordable (>30%)' : 'Affordable (≤30%)'}</>
                  ) : (
                    <span className="text-muted-foreground">No data available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Data source */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Data from ABS Census 2021
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
